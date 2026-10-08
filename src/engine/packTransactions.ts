import type { Catalog } from './catalog';
import { dailyPackStatus, localDayKey } from './dailyPack';
import type { GameDatabase, IdSource } from './database';
import { grantEditions } from './inventory';
import type {
  GrantId,
  GrantSource,
  OpeningId,
  PackDefinitionId,
  PackGrant,
  PackOpening,
  PackOpeningItem,
} from '@/domain/packs';
import type { RewardLedgerEntry } from '@/domain/player';
import { fail, ok, type Result } from '@/domain/result';

/** Everything a transaction needs besides the database. */
export interface TxContext {
  readonly now: string;
  readonly ids: IdSource;
  readonly catalog: Catalog;
  readonly utcOffsetMinutes: number;
}

const ledgerEntry = (
  db: GameDatabase,
  ctx: TxContext,
  entry: Omit<RewardLedgerEntry, 'id' | 'playerId' | 'at'>,
): RewardLedgerEntry => ({ id: ctx.ids.next('ledger'), playerId: db.player.id, at: ctx.now, ...entry });

const createGrant = (
  db: GameDatabase,
  ctx: TxContext,
  packDefinitionId: PackDefinitionId,
  source: GrantSource,
): Result<{ db: GameDatabase; grant: PackGrant }> => {
  if (!ctx.catalog.pack(packDefinitionId)) {
    return fail('PACK_DEFINITION_NOT_FOUND', `Unknown pack definition ${packDefinitionId}`);
  }
  const grant: PackGrant = {
    id: ctx.ids.next('grant'),
    playerId: db.player.id,
    packDefinitionId,
    source,
    grantedAt: ctx.now,
    status: 'available',
  };
  const next: GameDatabase = {
    ...db,
    packGrants: { ...db.packGrants, [grant.id]: grant },
    ledger: [
      ...db.ledger,
      ledgerEntry(db, ctx, {
        kind: 'pack_granted',
        source: source === 'daily' ? 'daily_claim' : source === 'quest' ? 'quest' : 'developer',
        sourceId: grant.id,
      }),
    ],
  };
  return ok({ db: next, grant });
};

/** Claims today's free Discovery Pack. Fails if it was already claimed today. */
export const claimDailyPack = (
  db: GameDatabase,
  ctx: TxContext,
  packDefinitionId: PackDefinitionId,
): Result<{ db: GameDatabase; grant: PackGrant }> => {
  if (dailyPackStatus(db.dailyClaim, ctx.now, ctx.utcOffsetMinutes).state !== 'available') {
    return fail('DAILY_PACK_NOT_AVAILABLE', 'Today’s Discovery Pack has already been claimed.');
  }
  const created = createGrant(db, ctx, packDefinitionId, 'daily');
  if (!created.ok) return created;
  return ok({
    grant: created.value.grant,
    db: {
      ...created.value.db,
      dailyClaim: { lastClaimDay: localDayKey(ctx.now, ctx.utcOffsetMinutes), lastClaimedAt: ctx.now },
    },
  });
};

/** Grants a pack outside the daily allowance (prototype tools, future quest rewards). */
export const grantPack = (
  db: GameDatabase,
  ctx: TxContext,
  packDefinitionId: PackDefinitionId,
  source: Exclude<GrantSource, 'daily'>,
) => createGrant(db, ctx, packDefinitionId, source);

/**
 * Opens a grant exactly once. The first call resolves contents, commits every
 * card to the inventory and writes the ledger atomically; any later call for
 * the same grant returns the same immutable opening (`replayed: true`) and
 * grants nothing. Presentation can therefore crash, be skipped or be
 * replayed without ever changing rewards.
 */
export const openPack = (
  db: GameDatabase,
  ctx: TxContext,
  grantId: GrantId,
): Result<{ db: GameDatabase; opening: PackOpening; replayed: boolean }> => {
  const grant = db.packGrants[grantId];
  if (!grant) return fail('GRANT_NOT_FOUND', `Unknown pack grant ${grantId}`);
  if (grant.playerId !== db.player.id) return fail('GRANT_NOT_OWNED', 'This pack belongs to another player.');

  if (grant.status === 'opened') {
    const existing = grant.openingId ? db.packOpenings[grant.openingId] : undefined;
    if (!existing) return fail('OPENING_NOT_FOUND', `Opening for grant ${grantId} is missing`);
    return ok({ db, opening: existing, replayed: true });
  }

  const definition = ctx.catalog.pack(grant.packDefinitionId);
  if (!definition) return fail('PACK_DEFINITION_NOT_FOUND', `Unknown pack definition ${grant.packDefinitionId}`);

  const contents: { editionId: string; cardId: string }[] = [];
  for (const editionId of definition.contents.editionIds) {
    const edition = ctx.catalog.edition(editionId);
    if (!edition) return fail('EDITION_NOT_FOUND', `Unknown edition ${editionId}`);
    contents.push({ editionId, cardId: edition.cardId });
  }

  const { inventory, granted } = grantEditions(db.inventory, contents, ctx.now);
  const items: PackOpeningItem[] = granted.map((g, index) => {
    const card = ctx.catalog.card(g.cardId);
    if (!card) throw new Error(`Catalog integrity violated: missing card ${g.cardId}`);
    return { index, editionId: g.editionId, cardId: g.cardId, rarity: card.rarity, isNew: g.isNew, copiesAfter: g.copiesAfter };
  });

  const opening: PackOpening = {
    id: ctx.ids.next('opening'),
    grantId,
    playerId: db.player.id,
    packDefinitionId: definition.id,
    createdAt: ctx.now,
    items,
    isDemo: definition.isDemo,
    status: 'committed',
    revealedCount: 0,
  };

  const ledger: RewardLedgerEntry[] = [
    ledgerEntry(db, ctx, { kind: 'pack_opened', source: 'pack_opening', sourceId: opening.id }),
    ...items.map((item) =>
      ledgerEntry(db, ctx, { kind: 'card_granted', source: 'pack_opening', sourceId: opening.id, editionId: item.editionId }),
    ),
  ];

  return ok({
    replayed: false,
    opening,
    db: {
      ...db,
      inventory,
      packGrants: { ...db.packGrants, [grantId]: { ...grant, status: 'opened', openingId: opening.id } },
      packOpenings: { ...db.packOpenings, [opening.id]: opening },
      ledger: [...db.ledger, ...ledger],
    },
  });
};

/**
 * Records how many cards the player has flipped. Monotonic and clamped:
 * stale or out-of-order reports can never move progress backwards, and the
 * value never affects rewards.
 */
export const recordRevealProgress = (
  db: GameDatabase,
  openingId: OpeningId,
  revealedCount: number,
): Result<GameDatabase> => {
  const opening = db.packOpenings[openingId];
  if (!opening) return fail('OPENING_NOT_FOUND', `Unknown opening ${openingId}`);
  if (!Number.isInteger(revealedCount) || revealedCount < 0) {
    return fail('INVALID_PROGRESS', 'Reveal progress must be a non-negative integer.');
  }
  const clamped = Math.min(Math.max(opening.revealedCount, revealedCount), opening.items.length);
  if (clamped === opening.revealedCount) return ok(db);
  return ok({ ...db, packOpenings: { ...db.packOpenings, [openingId]: { ...opening, revealedCount: clamped } } });
};

/** Marks the presentation finished (all cards shown or the reveal was skipped). */
export const markOpeningPresented = (db: GameDatabase, openingId: OpeningId, now: string): Result<GameDatabase> => {
  const opening = db.packOpenings[openingId];
  if (!opening) return fail('OPENING_NOT_FOUND', `Unknown opening ${openingId}`);
  if (opening.status === 'presented') return ok(db);
  return ok({
    ...db,
    packOpenings: {
      ...db.packOpenings,
      [openingId]: { ...opening, status: 'presented', revealedCount: opening.items.length, presentedAt: now },
    },
  });
};

/** The most recent opening whose reveal was interrupted, if any. */
export const findResumableOpening = (db: GameDatabase): PackOpening | undefined =>
  Object.values(db.packOpenings)
    .filter((o) => o.status === 'committed')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

/** Grants waiting to be opened, oldest first. */
export const availableGrants = (db: GameDatabase): PackGrant[] =>
  Object.values(db.packGrants)
    .filter((g) => g.status === 'available')
    .sort((a, b) => a.grantedAt.localeCompare(b.grantedAt));

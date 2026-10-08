import { fixtureCatalog } from './__fixtures__/fixtureCatalog';
import { createInitialDatabase, sequentialIds, type GameDatabase } from './database';
import {
  availableGrants,
  claimDailyPack,
  findResumableOpening,
  grantPack,
  markOpeningPresented,
  openPack,
  recordRevealProgress,
  type TxContext,
} from './packTransactions';

const NOW = '2026-10-08T15:00:00.000Z';

const context = (overrides: Partial<TxContext> = {}): TxContext => ({
  now: NOW,
  ids: sequentialIds(),
  catalog: fixtureCatalog,
  utcOffsetMinutes: 0,
  ...overrides,
});

const freshDb = (): GameDatabase => createInitialDatabase({ playerId: 'player_1', now: NOW });

const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: { code: string } }): T => {
  if (!result.ok) throw new Error(`Expected ok, got ${result.error.code}`);
  return result.value;
};

describe('daily Discovery Pack claims', () => {
  it('grants one pack per local day and records the claim', () => {
    const ctx = context();
    const { db, grant } = unwrap(claimDailyPack(freshDb(), ctx, 'demo'));
    expect(grant.source).toBe('daily');
    expect(grant.status).toBe('available');
    expect(db.dailyClaim.lastClaimDay).toBe('2026-10-08');
    expect(db.ledger.filter((e) => e.kind === 'pack_granted')).toHaveLength(1);

    const again = claimDailyPack(db, ctx, 'demo');
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe('DAILY_PACK_NOT_AVAILABLE');
  });

  it('becomes available again after local midnight', () => {
    const { db } = unwrap(claimDailyPack(freshDb(), context(), 'demo'));
    const nextDay = claimDailyPack(db, context({ now: '2026-10-09T00:00:01.000Z' }), 'demo');
    expect(nextDay.ok).toBe(true);
  });

  it('respects the player timezone when deciding the day', () => {
    // 23:30 local in UTC-5 on Oct 8 is 04:30 UTC on Oct 9.
    const ctx = context({ now: '2026-10-09T04:30:00.000Z', utcOffsetMinutes: -300 });
    const { db } = unwrap(claimDailyPack(freshDb(), ctx, 'demo'));
    expect(db.dailyClaim.lastClaimDay).toBe('2026-10-08');
    // 30 minutes later it is a new local day.
    expect(claimDailyPack(db, context({ now: '2026-10-09T05:00:00.000Z', utcOffsetMinutes: -300 }), 'demo').ok).toBe(true);
  });

  it('rejects unknown pack definitions without mutating state', () => {
    const db = freshDb();
    const result = claimDailyPack(db, context(), 'missing');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PACK_DEFINITION_NOT_FOUND');
  });
});

describe('opening a pack', () => {
  const setup = () => {
    const ctx = context();
    const { db, grant } = unwrap(grantPack(freshDb(), ctx, 'demo', 'developer'));
    return { ctx, db, grant };
  };

  it('commits every card to the inventory atomically with the opening', () => {
    const { ctx, db, grant } = setup();
    const { db: after, opening, replayed } = unwrap(openPack(db, ctx, grant.id));

    expect(replayed).toBe(false);
    expect(opening.items).toHaveLength(5);
    expect(opening.status).toBe('committed');
    expect(opening.isDemo).toBe(true);
    expect(after.packGrants[grant.id]?.status).toBe('opened');
    expect(after.packGrants[grant.id]?.openingId).toBe(opening.id);

    const copies = Object.values(after.inventory).reduce((sum, entry) => sum + entry.copies, 0);
    expect(copies).toBe(5);
    expect(after.ledger.filter((e) => e.kind === 'card_granted')).toHaveLength(5);
    expect(after.ledger.filter((e) => e.kind === 'pack_opened')).toHaveLength(1);
  });

  it('is idempotent: repeated open requests return the same opening and grant nothing', () => {
    const { ctx, db, grant } = setup();
    const first = unwrap(openPack(db, ctx, grant.id));
    const second = unwrap(openPack(first.db, ctx, grant.id));
    const third = unwrap(openPack(second.db, ctx, grant.id));

    expect(second.replayed).toBe(true);
    expect(third.replayed).toBe(true);
    expect(second.opening).toBe(first.opening);
    expect(third.db).toBe(first.db);
    expect(Object.values(third.db.inventory).reduce((s, e) => s + e.copies, 0)).toBe(5);
  });

  it('marks duplicates inside one pack sequentially', () => {
    const { ctx, db, grant } = setup();
    const { opening } = unwrap(openPack(db, ctx, grant.id));
    const commons = opening.items.filter((i) => i.cardId === 'c1');
    expect(commons.map((i) => [i.isNew, i.copiesAfter])).toEqual([
      [true, 1],
      [false, 2],
    ]);
  });

  it('marks cards from a second pack as duplicates', () => {
    const { ctx, db, grant } = setup();
    const first = unwrap(openPack(db, ctx, grant.id));
    const { db: withSecond, grant: second } = unwrap(grantPack(first.db, ctx, 'demo', 'developer'));
    const { opening, db: after } = unwrap(openPack(withSecond, ctx, second.id));
    expect(opening.items.every((i) => !i.isNew)).toBe(true);
    expect(after.inventory['l1/standard']?.copies).toBe(2);
    expect(after.inventory['c1/standard']?.copies).toBe(4);
  });

  it('rejects unknown and foreign grants', () => {
    const { ctx, db, grant } = setup();
    expect(openPack(db, ctx, 'nope').ok).toBe(false);
    const foreign: GameDatabase = {
      ...db,
      packGrants: { ...db.packGrants, [grant.id]: { ...grant, playerId: 'someone_else' } },
    };
    const result = openPack(foreign, ctx, grant.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('GRANT_NOT_OWNED');
  });

  it('lists only unopened grants as available', () => {
    const { ctx, db, grant } = setup();
    expect(availableGrants(db).map((g) => g.id)).toEqual([grant.id]);
    const { db: after } = unwrap(openPack(db, ctx, grant.id));
    expect(availableGrants(after)).toEqual([]);
  });
});

describe('reveal progress and restoration', () => {
  const opened = () => {
    const ctx = context();
    const { db, grant } = unwrap(grantPack(freshDb(), ctx, 'demo', 'developer'));
    return unwrap(openPack(db, ctx, grant.id));
  };

  it('records progress monotonically and clamps to the pack size', () => {
    const { db, opening } = opened();
    let state = unwrap(recordRevealProgress(db, opening.id, 2));
    expect(state.packOpenings[opening.id]?.revealedCount).toBe(2);
    state = unwrap(recordRevealProgress(state, opening.id, 1));
    expect(state.packOpenings[opening.id]?.revealedCount).toBe(2);
    state = unwrap(recordRevealProgress(state, opening.id, 99));
    expect(state.packOpenings[opening.id]?.revealedCount).toBe(5);
    expect(recordRevealProgress(state, opening.id, -1).ok).toBe(false);
    expect(recordRevealProgress(state, opening.id, 1.5).ok).toBe(false);
  });

  it('never changes inventory when recording presentation progress', () => {
    const { db, opening } = opened();
    const after = unwrap(markOpeningPresented(unwrap(recordRevealProgress(db, opening.id, 3)), opening.id, NOW));
    expect(after.inventory).toBe(db.inventory);
    expect(after.ledger).toBe(db.ledger);
  });

  it('finds an interrupted opening to resume until it is presented', () => {
    const { db, opening } = opened();
    expect(findResumableOpening(db)?.id).toBe(opening.id);
    const presented = unwrap(markOpeningPresented(db, opening.id, NOW));
    expect(presented.packOpenings[opening.id]?.status).toBe('presented');
    expect(presented.packOpenings[opening.id]?.revealedCount).toBe(5);
    expect(findResumableOpening(presented)).toBeUndefined();
  });
});

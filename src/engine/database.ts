import type { QuestId } from '@/domain/cards';
import type { GrantId, OpeningId, PackGrant, PackOpening } from '@/domain/packs';
import type { Inventory, PlayerProfile, RewardLedgerEntry } from '@/domain/player';
import type { PlayerQuestProgress } from '@/domain/quests';

export const DATABASE_SCHEMA_VERSION = 1;

/**
 * The authoritative player state. In the local development backend this is
 * held in memory and persisted on device; in Milestone 2 the same shape maps
 * onto Postgres tables (player_profiles, player_inventory, pack_grants,
 * pack_openings, reward_ledger, player_quest_progress) owned by the server.
 */
export interface GameDatabase {
  readonly schemaVersion: typeof DATABASE_SCHEMA_VERSION;
  readonly player: PlayerProfile;
  readonly inventory: Inventory;
  readonly packGrants: Readonly<Record<GrantId, PackGrant>>;
  readonly packOpenings: Readonly<Record<OpeningId, PackOpening>>;
  readonly ledger: readonly RewardLedgerEntry[];
  readonly questProgress: Readonly<Record<QuestId, PlayerQuestProgress>>;
  readonly dailyClaim: { readonly lastClaimDay?: string; readonly lastClaimedAt?: string };
}

/** Source of fresh identifiers; injected so transactions stay deterministic in tests. */
export interface IdSource {
  next(prefix: string): string;
}

export const createInitialDatabase = (params: { playerId: string; now: string }): GameDatabase => ({
  schemaVersion: DATABASE_SCHEMA_VERSION,
  player: { id: params.playerId, displayName: 'Collector', journeyXp: 0, createdAt: params.now },
  inventory: {},
  packGrants: {},
  packOpenings: {},
  ledger: [],
  questProgress: {},
  dailyClaim: {},
});

/** Counter-based ids for tests and deterministic fixtures. */
export const sequentialIds = (seed = 0): IdSource => {
  let n = seed;
  return { next: (prefix) => `${prefix}_${(++n).toString().padStart(4, '0')}` };
};

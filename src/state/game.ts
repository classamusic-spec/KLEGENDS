import { randomUUID } from 'expo-crypto';

import { createStore, useStore } from './store';
import { catalog, COLLECTION_ID } from '@/content';
import type { CardId } from '@/domain/cards';
import type { PackGrant, PackOpening } from '@/domain/packs';
import { levelProgress, type LevelProgress } from '@/domain/progression';
import type { PlayerQuestProgress } from '@/domain/quests';
import { dailyPackStatus, type DailyPackStatus } from '@/engine/dailyPack';
import type { GameDatabase } from '@/engine/database';
import { collectionProgress, ownedCardIds, type CollectionProgress } from '@/engine/inventory';
import { availableGrants, findResumableOpening } from '@/engine/packTransactions';
import { describeServiceError, type GameService } from '@/services/gameService';
import { asyncStorageStore } from '@/services/keyValueStore';
import { LocalGameService } from '@/services/localGameService';

export type GameState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly db: GameDatabase };

export const gameStore = createStore<GameState>({ status: 'loading' });

/** The single game service instance. Swap for the Supabase service in Milestone 2. */
export const gameService: GameService = new LocalGameService({
  storage: asyncStorageStore,
  catalog,
  ids: { next: (prefix) => `${prefix}_${randomUUID()}` },
  latencyMs: { openPack: 450, other: 200 },
  onChange: (db) => gameStore.set({ status: 'ready', db }),
});

export const initializeGame = async (): Promise<void> => {
  try {
    await gameService.load();
  } catch (error) {
    gameStore.set({ status: 'error', message: describeServiceError(error) });
  }
};

/** Selects from the player database; returns `fallback` until it has loaded. */
export const useGame = <S,>(selector: (db: GameDatabase) => S, fallback: S): S =>
  useStore(gameStore, (state) => (state.status === 'ready' ? selector(state.db) : fallback));

export const useGameStatus = () => useStore(gameStore, (state) => state.status);

// ── Selectors ─────────────────────────────────────────────────────────────

const EMPTY_OWNED: ReadonlySet<CardId> = new Set();
const EMPTY_PROGRESS: CollectionProgress = { owned: 0, total: 0, fraction: 0 };

export const useOwnedCardIds = (): ReadonlySet<CardId> => useGame((db) => ownedCardIds(db.inventory), EMPTY_OWNED);

export const useCollectionProgress = (): CollectionProgress =>
  useGame((db) => {
    const collection = catalog.collections.find((c) => c.id === COLLECTION_ID);
    return collection ? collectionProgress(db.inventory, collection) : EMPTY_PROGRESS;
  }, EMPTY_PROGRESS);

export const useLevel = (): LevelProgress => useGame((db) => levelProgress(db.player.journeyXp), levelProgress(0));

export const useAvailableGrant = (): PackGrant | undefined => useGame((db) => availableGrants(db)[0], undefined);

export const useResumableOpening = (): PackOpening | undefined => useGame((db) => findResumableOpening(db), undefined);

export const useQuestProgress = (questId: string): PlayerQuestProgress | undefined =>
  useGame((db) => db.questProgress[questId], undefined);

export const useIsFavorite = (editionId: string): boolean =>
  useGame((db) => db.inventory[editionId]?.favorite ?? false, false);

export const useCopies = (editionId: string): number => useGame((db) => db.inventory[editionId]?.copies ?? 0, 0);

/** Daily pack availability; `now` is passed in so callers control re-evaluation. */
export const useDailyPackStatus = (now: Date): DailyPackStatus | undefined =>
  useGame((db) => dailyPackStatus(db.dailyClaim, now.toISOString(), -now.getTimezoneOffset()), undefined);

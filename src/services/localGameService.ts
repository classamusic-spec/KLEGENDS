import { GameServiceError, type GameService } from './gameService';
import type { KeyValueStore } from './keyValueStore';
import { DEMO_PACK_ID } from '@/content';
import type { Result } from '@/domain/result';
import type { Catalog } from '@/engine/catalog';
import { createInitialDatabase, DATABASE_SCHEMA_VERSION, type GameDatabase, type IdSource } from '@/engine/database';
import { setFavorite } from '@/engine/inventory';
import {
  claimDailyPack,
  grantPack,
  markOpeningPresented,
  openPack,
  recordRevealProgress,
  type TxContext,
} from '@/engine/packTransactions';
import { completeQuest, saveQuestProgress } from '@/engine/questEngine';

export const DATABASE_STORAGE_KEY = 'kl.local-backend.v1';

export interface LocalGameServiceOptions {
  readonly storage: KeyValueStore;
  readonly catalog: Catalog;
  readonly ids: IdSource;
  readonly now?: () => Date;
  /** Simulated round-trip latency, so loading states are exercised during development. */
  readonly latencyMs?: { readonly openPack: number; readonly other: number };
  readonly onChange?: (db: GameDatabase) => void;
}

const isDatabase = (value: unknown): value is GameDatabase =>
  !!value &&
  typeof value === 'object' &&
  (value as GameDatabase).schemaVersion === DATABASE_SCHEMA_VERSION &&
  typeof (value as GameDatabase).player?.id === 'string';

const delay = (ms: number) => (ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

/**
 * On-device development backend. It runs the same pure transactions a real
 * server would, one at a time, and persists the result before publishing it.
 * It is NOT a production integration: rewards are not protected from a
 * modified client. See docs/ARCHITECTURE.md (Milestone 2: Supabase).
 */
export class LocalGameService implements GameService {
  readonly label = 'Local development backend (on-device)';

  private db: GameDatabase | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private failNext = false;
  private readonly options: LocalGameServiceOptions;

  constructor(options: LocalGameServiceOptions) {
    this.options = options;
  }

  readonly prototype = {
    grantDemoPack: () =>
      this.transact('other', (db, ctx) => {
        const result = grantPack(db, ctx, DEMO_PACK_ID, 'developer');
        return result.ok ? { ok: true, value: { db: result.value.db, out: result.value.grant } } : result;
      }),
    reset: () =>
      this.enqueue(async () => {
        await this.options.storage.removeItem(DATABASE_STORAGE_KEY);
        this.db = null;
        await this.loadUnqueued();
      }),
    failNextRequest: () => {
      this.failNext = true;
    },
  };

  load(): Promise<GameDatabase> {
    return this.enqueue(() => this.loadUnqueued());
  }

  claimDailyPack() {
    return this.transact('other', (db, ctx) => {
      const result = claimDailyPack(db, ctx, DEMO_PACK_ID);
      return result.ok ? { ok: true, value: { db: result.value.db, out: result.value.grant } } : result;
    });
  }

  openPack(grantId: string) {
    return this.transact('openPack', (db, ctx) => {
      const result = openPack(db, ctx, grantId);
      return result.ok ? { ok: true, value: { db: result.value.db, out: result.value.opening } } : result;
    });
  }

  recordRevealProgress(openingId: string, revealedCount: number) {
    return this.transact('none', (db) => {
      const result = recordRevealProgress(db, openingId, revealedCount);
      return result.ok ? { ok: true, value: { db: result.value, out: undefined } } : result;
    });
  }

  markOpeningPresented(openingId: string) {
    return this.transact('none', (db, ctx) => {
      const result = markOpeningPresented(db, openingId, ctx.now);
      return result.ok ? { ok: true, value: { db: result.value, out: undefined } } : result;
    });
  }

  saveQuestProgress(progress: Parameters<GameService['saveQuestProgress']>[0]) {
    return this.transact('none', (db) => ({ ok: true, value: { db: saveQuestProgress(db, progress), out: undefined } }));
  }

  completeQuest(questId: string, progress: Parameters<GameService['completeQuest']>[1]) {
    return this.transact('other', (db, ctx) => {
      const result = completeQuest(db, ctx, questId, progress);
      return result.ok ? { ok: true, value: { db: result.value.db, out: result.value.completion } } : result;
    });
  }

  setFavorite(editionId: string, favorite: boolean) {
    return this.transact('none', (db) => ({
      ok: true,
      value: { db: { ...db, inventory: setFavorite(db.inventory, editionId, favorite) }, out: undefined },
    }));
  }

  // ── internals ──────────────────────────────────────────────────────────

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work, work);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private context(): TxContext {
    const now = (this.options.now ?? (() => new Date()))();
    return {
      now: now.toISOString(),
      ids: this.options.ids,
      catalog: this.options.catalog,
      utcOffsetMinutes: -now.getTimezoneOffset(),
    };
  }

  private async loadUnqueued(): Promise<GameDatabase> {
    if (this.db) return this.db;
    let stored: unknown = null;
    try {
      const raw = await this.options.storage.getItem(DATABASE_STORAGE_KEY);
      stored = raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('[local-backend] Stored data unreadable; starting a fresh prototype profile', error);
    }
    const db = isDatabase(stored)
      ? stored
      : createInitialDatabase({ playerId: this.options.ids.next('player'), now: this.context().now });
    if (!isDatabase(stored)) await this.persist(db);
    this.db = db;
    this.options.onChange?.(db);
    return db;
  }

  private async persist(db: GameDatabase): Promise<void> {
    try {
      await this.options.storage.setItem(DATABASE_STORAGE_KEY, JSON.stringify(db));
    } catch {
      throw new GameServiceError('STORAGE', 'Progress could not be saved on this device.');
    }
  }

  /**
   * Runs one transaction: simulated latency → optional injected failure →
   * pure transaction → persist → publish. If persisting fails, the in-memory
   * state is left untouched, so a transaction is all-or-nothing.
   */
  private transact<T>(
    latency: 'openPack' | 'other' | 'none',
    tx: (db: GameDatabase, ctx: TxContext) => Result<{ db: GameDatabase; out: T }>,
  ): Promise<T> {
    return this.enqueue(async () => {
      const current = await this.loadUnqueued();
      const ms = latency === 'none' ? 0 : (this.options.latencyMs?.[latency] ?? 0);
      await delay(ms);
      if (this.failNext) {
        this.failNext = false;
        throw new GameServiceError('NETWORK', 'Simulated connection failure.');
      }
      const result = tx(current, this.context());
      if (!result.ok) throw new GameServiceError(result.error.code, result.error.message);
      if (result.value.db !== current) {
        await this.persist(result.value.db);
        this.db = result.value.db;
        this.options.onChange?.(result.value.db);
      }
      return result.value.out;
    });
  }
}

import type { EditionId, QuestId } from '@/domain/cards';
import type { GrantId, OpeningId, PackGrant, PackOpening } from '@/domain/packs';
import type { PlayerQuestProgress } from '@/domain/quests';
import type { DomainErrorCode } from '@/domain/result';
import type { GameDatabase } from '@/engine/database';
import type { QuestCompletion } from '@/engine/questEngine';

/**
 * Contract between the app and the authority that owns player state.
 *
 * Milestone 1 ships `LocalGameService`, a clearly labeled on-device
 * development backend. Milestone 2 replaces it with a Supabase-backed
 * implementation (server-side functions own rewards); screens only ever
 * talk to this interface.
 */
export interface GameService {
  /** Human-readable label shown in prototype tools, e.g. "Local development backend". */
  readonly label: string;
  load(): Promise<GameDatabase>;
  claimDailyPack(): Promise<PackGrant>;
  openPack(grantId: GrantId): Promise<PackOpening>;
  recordRevealProgress(openingId: OpeningId, revealedCount: number): Promise<void>;
  markOpeningPresented(openingId: OpeningId): Promise<void>;
  saveQuestProgress(progress: PlayerQuestProgress): Promise<void>;
  completeQuest(questId: QuestId, progress: PlayerQuestProgress): Promise<QuestCompletion>;
  setFavorite(editionId: EditionId, favorite: boolean): Promise<void>;
  /** Prototype tools — never exposed in production builds. */
  readonly prototype: {
    grantDemoPack(): Promise<PackGrant>;
    reset(): Promise<void>;
    /** Makes the next request fail like a dropped connection (tests error states). */
    failNextRequest(): void;
  };
}

export type ServiceErrorCode = DomainErrorCode | 'NETWORK' | 'STORAGE';

export class GameServiceError extends Error {
  readonly code: ServiceErrorCode;

  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.name = 'GameServiceError';
    this.code = code;
  }
}

/** User-facing copy for service failures. */
export const describeServiceError = (error: unknown): string => {
  if (error instanceof GameServiceError) {
    switch (error.code) {
      case 'NETWORK':
        return 'The connection was interrupted. Your collection is safe — please try again.';
      case 'STORAGE':
        return 'Your progress could not be saved on this device. Please try again.';
      case 'DAILY_PACK_NOT_AVAILABLE':
        return 'Today’s Discovery Pack has already been claimed.';
      default:
        return error.message;
    }
  }
  return 'Something went wrong. Your collection is safe — please try again.';
};

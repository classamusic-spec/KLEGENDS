import type { CardId, EditionId, QuestId } from './cards';

export type PlayerId = string;

export interface PlayerProfile {
  readonly id: PlayerId;
  readonly displayName: string;
  /** Journey XP from quests and challenges. Game progression only. */
  readonly journeyXp: number;
  readonly createdAt: string;
}

export interface InventoryEntry {
  readonly editionId: EditionId;
  readonly cardId: CardId;
  readonly copies: number;
  readonly firstAcquiredAt: string;
  readonly lastAcquiredAt: string;
  readonly favorite: boolean;
}

export type Inventory = Readonly<Record<EditionId, InventoryEntry>>;

export type LedgerKind = 'card_granted' | 'pack_granted' | 'pack_opened' | 'xp_awarded' | 'quest_completed';
export type LedgerSource = 'pack_opening' | 'quest' | 'daily_claim' | 'developer';

/** Append-only record of every reward. Used for audits and support. */
export interface RewardLedgerEntry {
  readonly id: string;
  readonly playerId: PlayerId;
  readonly at: string;
  readonly kind: LedgerKind;
  readonly source: LedgerSource;
  readonly sourceId: string;
  readonly editionId?: EditionId;
  readonly amount?: number;
  readonly questId?: QuestId;
}

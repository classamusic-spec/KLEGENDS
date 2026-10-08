import type { CardId, EditionId } from './cards';
import type { PlayerId } from './player';
import type { Rarity } from './rarity';

export type PackDefinitionId = string;
export type PackVisualThemeId = string;
export type GrantId = string;
export type OpeningId = string;

/**
 * How a pack's contents are produced. Milestone 1 only ships fixed demo
 * contents; weighted slots (the rarity engine) arrive with the
 * server-authoritative backend in Milestone 2.
 */
export type PackContentsRule = {
  readonly kind: 'fixed';
  readonly editionIds: readonly EditionId[];
};

export interface PackDefinition {
  readonly id: PackDefinitionId;
  readonly name: string;
  readonly description: string;
  readonly cardsPerPack: number;
  readonly contents: PackContentsRule;
  readonly visualThemeId: PackVisualThemeId;
  /**
   * Demo packs have known contents and must be labeled as such in the UI.
   * They never represent live reward odds.
   */
  readonly isDemo: boolean;
  /** Packs are always free. Randomized packs are never sold. */
  readonly priceModel: 'free';
}

/** Data-driven wrapper art. The pack renderer reads this; animation code never hardcodes it. */
export interface PackVisualTheme {
  readonly id: PackVisualThemeId;
  readonly title: string;
  readonly subtitle: string;
  readonly crest: 'crown';
  /** Wrapper foil base, mid and highlight tones (hex). */
  readonly foil: { readonly base: string; readonly mid: string; readonly sheen: string };
  /** Engraved accent metal (hex). */
  readonly accent: { readonly dark: string; readonly mid: string; readonly light: string };
}

export type GrantSource = 'daily' | 'quest' | 'developer';

export interface PackGrant {
  readonly id: GrantId;
  readonly playerId: PlayerId;
  readonly packDefinitionId: PackDefinitionId;
  readonly source: GrantSource;
  readonly grantedAt: string;
  readonly status: 'available' | 'opened';
  readonly openingId?: OpeningId;
}

export interface PackOpeningItem {
  /** Position inside the physical pack (server order). */
  readonly index: number;
  readonly editionId: EditionId;
  readonly cardId: CardId;
  readonly rarity: Rarity;
  /** True when this item was the player's first copy of the edition. */
  readonly isNew: boolean;
  /** Copies owned immediately after this item was granted. */
  readonly copiesAfter: number;
}

/**
 * `committed`: rewards are in the inventory (the moment the opening exists).
 * `presented`: the reveal presentation finished. Presentation state never
 * affects rewards.
 */
export type PackOpeningStatus = 'committed' | 'presented';

/** Immutable result of opening a grant. Created exactly once per grant. */
export interface PackOpening {
  readonly id: OpeningId;
  readonly grantId: GrantId;
  readonly playerId: PlayerId;
  readonly packDefinitionId: PackDefinitionId;
  readonly createdAt: string;
  readonly items: readonly PackOpeningItem[];
  readonly isDemo: boolean;
  readonly status: PackOpeningStatus;
  /** How many cards the player has flipped so far (presentation progress only). */
  readonly revealedCount: number;
  readonly presentedAt?: string;
}

export type RevealSpeed = 'cinematic' | 'standard' | 'quick';

/** Per-rarity presentation timings in milliseconds, tuned on devices. */
export interface RarityRevealTiming {
  readonly flipMs: number;
  readonly celebrationMs: number;
}

export interface PackRevealConfiguration {
  /** Tear progress (0–1) beyond which releasing the finger completes the tear. */
  readonly tearCompleteThreshold: number;
  /** Drag distance (px) the seal resists before it starts to tear. */
  readonly tearResistancePx: number;
  /** Fraction of the extraction drag beyond which releasing completes it. */
  readonly extractCompleteThreshold: number;
  readonly timings: Readonly<Record<RevealSpeed, Readonly<Record<Rarity, RarityRevealTiming>>>>;
}

export const DEFAULT_REVEAL_CONFIGURATION: PackRevealConfiguration = {
  tearCompleteThreshold: 0.62,
  tearResistancePx: 14,
  extractCompleteThreshold: 0.45,
  timings: {
    cinematic: {
      common: { flipMs: 560, celebrationMs: 450 },
      rare: { flipMs: 600, celebrationMs: 900 },
      epic: { flipMs: 650, celebrationMs: 1500 },
      legendary: { flipMs: 650, celebrationMs: 3600 },
    },
    standard: {
      common: { flipMs: 480, celebrationMs: 350 },
      rare: { flipMs: 520, celebrationMs: 700 },
      epic: { flipMs: 560, celebrationMs: 1100 },
      legendary: { flipMs: 600, celebrationMs: 2800 },
    },
    quick: {
      common: { flipMs: 300, celebrationMs: 150 },
      rare: { flipMs: 320, celebrationMs: 300 },
      epic: { flipMs: 340, celebrationMs: 450 },
      legendary: { flipMs: 380, celebrationMs: 1100 },
    },
  },
};

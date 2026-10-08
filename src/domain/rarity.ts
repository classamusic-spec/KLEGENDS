/**
 * Rarity describes how scarce a printed card or edition is. It is a property
 * of the collectible artifact, never a statement about the biblical person or
 * event depicted (see docs/CONTENT_GUIDELINES.md).
 */
export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_RANK: Readonly<Record<Rarity, number>> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

/**
 * Every rarity has a distinct emblem shape so rarity is never communicated
 * by color alone (accessibility requirement).
 */
export type RarityEmblem = 'circle' | 'diamond' | 'star' | 'crown';

export const RARITY_EMBLEM: Readonly<Record<Rarity, RarityEmblem>> = {
  common: 'circle',
  rare: 'diamond',
  epic: 'star',
  legendary: 'crown',
};

export const compareRarity = (a: Rarity, b: Rarity): number => RARITY_RANK[a] - RARITY_RANK[b];

export const isRarity = (value: unknown): value is Rarity =>
  typeof value === 'string' && (RARITIES as readonly string[]).includes(value);

import type { Rarity } from '@/domain/rarity';

/**
 * Kingdom Legends design tokens — "Ancient Royal Luxury".
 * The interface is mostly restrained obsidian, stone and parchment; gold is
 * reserved for primary actions, selected states, milestones and Legendary
 * materials. Collectibles carry the spectacle.
 */
export const palette = {
  obsidian: '#0B0D12',
  royalMidnight: '#111722',
  deepSapphire: '#182B43',
  ancientGold: '#C6A46A',
  radiantGold: '#E8CB8E',
  antiqueBronze: '#806442',
  agedParchment: '#E8D8B8',
  ivory: '#F4EFE5',
  weatheredStone: '#8B8990',
  royalBurgundy: '#5B303C',
} as const;

export const colors = {
  background: palette.obsidian,
  backgroundDeep: '#07080C',
  surface: '#151920',
  surfaceElevated: '#1B202A',
  surfaceGlass: 'rgba(17, 23, 34, 0.78)',
  borderSubtle: '#35302A',
  borderGold: '#725A38',
  borderGoldBright: '#A88A55',
  textPrimary: palette.ivory,
  textSecondary: '#A9A6A0',
  textMuted: palette.weatheredStone,
  textOnGold: '#1E160B',
  gold: palette.ancientGold,
  goldBright: palette.radiantGold,
  goldDeep: palette.antiqueBronze,
  parchment: palette.agedParchment,
  parchmentInk: '#2B2116',
  parchmentInkSoft: '#5A4A35',
  sapphire: palette.deepSapphire,
  burgundy: palette.royalBurgundy,
  success: '#A9C08A',
  notice: '#D7B677',
  error: '#D88C82',
  scrim: 'rgba(5, 6, 9, 0.72)',
  focusRing: palette.radiantGold,
} as const;

/** Metal material ramps used by card frames, emblems and reveal lighting. */
export interface RarityMaterial {
  readonly name: string;
  /** Darkest to brightest metal stops for engraved gradients. */
  readonly metal: readonly [string, string, string, string];
  /** Light emitted during reveals and focus. */
  readonly glow: string;
  /** Label text color with sufficient contrast on dark surfaces. */
  readonly label: string;
}

export const rarityMaterials: Readonly<Record<Rarity, RarityMaterial>> = {
  common: {
    name: 'Weathered Bronze',
    metal: ['#3E2C1B', '#7A5A3A', '#B88E62', '#E2C29A'],
    glow: '#C99A66',
    label: '#D9B48A',
  },
  rare: {
    name: 'Sapphire Silver',
    metal: ['#253447', '#5D7591', '#B7C7DA', '#F1F6FB'],
    glow: '#79A7E8',
    label: '#AFC8E8',
  },
  epic: {
    name: 'Royal Amethyst',
    metal: ['#2C1745', '#62408F', '#A884D6', '#EBDDFB'],
    glow: '#B486F2',
    label: '#CDB2F0',
  },
  legendary: {
    name: 'Radiant Antique Gold',
    metal: ['#4D3617', '#9C7637', '#E1BF78', '#FFF1C9'],
    glow: '#FFD27A',
    label: '#EED29A',
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  gutter: 20,
} as const;

/** Restrained corner radii — premium objects, not bubbly app tiles. */
export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

export const shadows = {
  panel: '0px 10px 30px rgba(0, 0, 0, 0.45)',
  goldGlow: '0px 0px 18px rgba(232, 203, 142, 0.28)',
  card: '0px 18px 36px rgba(0, 0, 0, 0.55)',
} as const;

export const layout = {
  /** Height reserved for the custom tab bar (excluding the bottom safe area). */
  tabBarHeight: 64,
  /** Minimum touch target (iOS HIG / Material). */
  minTouch: 44,
  /** Physical trading-card proportions (63 × 88 mm). */
  cardAspect: 63 / 88,
} as const;

import type { SkRect } from '@shopify/react-native-skia';

import type { Rarity } from '@/domain/rarity';

/**
 * Card geometry in "card units": 300 × 419 (63 × 88 mm proportions).
 * Everything is authored in card units and scaled at bake/render time.
 */
export const CARD_W = 300;
export const CARD_H = 419;
export const CARD_RADIUS = 13;

/** Plain rect constructor (no Skia call, safe at module scope). */
export const rect = (x: number, y: number, width: number, height: number): SkRect => ({ x, y, width, height });

/** Extra art drawn beyond the window so parallax never reveals an edge. */
export const ART_BLEED = 12;

export interface CardLayout {
  /** Visible art window (full card for full-art Legendaries). */
  readonly art: SkRect;
  readonly artRadius: number;
  /** Name plate region. */
  readonly plate: SkRect;
  readonly fullArt: boolean;
}

const STANDARD: CardLayout = {
  art: rect(15, 15, 270, 266),
  artRadius: 8,
  plate: rect(15, 289, 270, 116),
  fullArt: false,
};

const FULL_ART: CardLayout = {
  art: rect(0, 0, CARD_W, CARD_H),
  artRadius: CARD_RADIUS,
  plate: rect(18, 312, 264, 92),
  fullArt: true,
};

export const layoutFor = (rarity: Rarity): CardLayout => (rarity === 'legendary' ? FULL_ART : STANDARD);

/** The art area including bleed, which scenes must fully cover. */
export const artBleedRect = (layout: CardLayout): SkRect =>
  rect(layout.art.x - ART_BLEED, layout.art.y - ART_BLEED, layout.art.width + ART_BLEED * 2, layout.art.height + ART_BLEED * 2);

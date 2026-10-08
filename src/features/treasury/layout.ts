import { PACK_H, PACK_W } from '@/graphics/pack/packGeometry';
import { PACK_CARD_W, STACK_REST_Y, type PackPlacement } from '@/graphics/pack/PackStage';

/** How far (pack units) the stack rises out of the wrapper when drawn. */
export const RISE_MAX = 330;
/** Share of the extraction travel taken by the wrapper sinking away. */
export const WRAPPER_SINK = 0.45;

/** Vertical space reserved by the treasury chrome (points, excluding safe areas). */
const HEADER_H = 64;
const PACK_FOOTER_H = 150;
/** Room above the reveal card for its rarity title. */
const REVEAL_TITLE_H = 40;
/** Room below the reveal card for its name and actions. */
const REVEAL_FOOTER_H = 200;

export interface TreasuryInsets {
  readonly top: number;
  readonly bottom: number;
}

export interface TreasuryLayout {
  readonly width: number;
  readonly height: number;
  readonly insets: TreasuryInsets;
  readonly pack: PackPlacement;
  readonly pedestal: { readonly x: number; readonly y: number; readonly width: number };
  /** Screen rect of the focused card during the reveal. */
  readonly reveal: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

export const computeTreasuryLayout = (width: number, height: number, insets: TreasuryInsets = { top: 0, bottom: 0 }): TreasuryLayout => {
  const top = insets.top + HEADER_H;
  const available = Math.max(200, height - top - insets.bottom - PACK_FOOTER_H);
  const packW = Math.min(width * 0.64, 290, ((available * 0.92) / PACK_H) * PACK_W);
  const scale = packW / PACK_W;
  const packH = PACK_H * scale;
  const packY = top + (available - packH) / 2 + 8;

  const cardTop = top + REVEAL_TITLE_H;
  const room = Math.max(160, height - cardTop - insets.bottom - REVEAL_FOOTER_H);
  const cardH = Math.min(((width * 0.7) * 88) / 63, (300 * 88) / 63, room);
  const cardW = (cardH * 63) / 88;
  return {
    width,
    height,
    insets,
    pack: { x: (width - packW) / 2, y: packY, scale },
    pedestal: { x: width / 2, y: packY + packH + 16, width: packW * 1.2 },
    reveal: { x: (width - cardW) / 2, y: cardTop + (room - cardH) / 2, width: cardW, height: cardH },
  };
};

/** Screen-space y of the stack's top edge once fully drawn out of the wrapper. */
export const stackExitTop = (layout: TreasuryLayout): number =>
  layout.pack.y + (STACK_REST_Y - RISE_MAX * (1 - WRAPPER_SINK)) * layout.pack.scale;

export { PACK_CARD_W };

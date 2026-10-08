import { ClipOp, type SkCanvas, type SkImage, type SkRect, type SkRRect } from '@shopify/react-native-skia';

import { CARD_H, CARD_RADIUS, CARD_W, rect, type CardLayout } from './layout';
import { drawCornerFlourish, drawLattice, metalShader, type MetalRamp } from '../art/emblems';
import { bakeImage } from '../skia/bake';
import { BlendMode, linear, makePaint, polygon, withAlpha } from '../skia/draw';
import { SKIA_FAMILY, type SkiaFonts } from '../skia/fonts';
import { drawText } from '../skia/text';
import { rarityMaterials } from '@/design/tokens';
import type { CardDefinition } from '@/domain/cards';
import { RARITY_EMBLEM, RARITY_LABEL, type Rarity } from '@/domain/rarity';
import { formatReference } from '@/domain/scripture';

/** Weathered stone stands in for metal on undiscovered cards. */
const STONE: MetalRamp = ['#191B21', '#2C2F37', '#474B56', '#676C79'];

const rrect = (r: SkRect, radius: number): SkRRect => ({ rect: r, rx: radius, ry: radius });
const inset = (r: SkRect, d: number): SkRect => rect(r.x + d, r.y + d, r.width - d * 2, r.height - d * 2);

const CARD_RECT = rect(0, 0, CARD_W, CARD_H);

/** Rarity emblem drawn into a baked texture (shape + color, matching the UI badge). */
export const drawRarityEmblem = (canvas: SkCanvas, rarity: Rarity, cx: number, cy: number, size: number, ramp: MetalRamp) => {
  const s = size / 16;
  const pts = (list: readonly (readonly [number, number])[]) => polygon(list.map(([x, y]) => [cx + (x - 8) * s, cy + (y - 8) * s] as const));
  const fill = makePaint({ shader: linear([cx, cy - size / 2], [cx, cy + size / 2], [ramp[3], ramp[1]]) });
  switch (RARITY_EMBLEM[rarity]) {
    case 'circle':
      canvas.drawCircle(cx, cy, 5 * s, fill);
      break;
    case 'diamond':
      canvas.drawPath(pts([[8, 1.8], [13.6, 8], [8, 14.2], [2.4, 8]]), fill);
      break;
    case 'star':
      canvas.drawPath(pts([[8, 1.6], [9.9, 5.7], [14.4, 6.2], [11.1, 9.3], [12, 13.7], [8, 11.5], [4, 13.7], [4.9, 9.3], [1.6, 6.2], [6.1, 5.7]]), fill);
      break;
    case 'crown':
      canvas.drawPath(pts([[2.4, 12.4], [1.8, 5], [5.4, 7.8], [8, 3.2], [10.6, 7.8], [14.2, 5], [13.6, 12.4]]), fill);
      break;
  }
};

/** The rarity plaque centered on the top edge of the art. */
const drawCartouche = (canvas: SkCanvas, fonts: SkiaFonts, rarity: Rarity, ramp: MetalRamp, y: number, labelColor: string, wide: boolean) => {
  const w = wide ? 124 : 104;
  const h = wide ? 22 : 19;
  const x = (CARD_W - w) / 2;
  const plaque = polygon([
    [x, y + h / 2],
    [x + 9, y],
    [x + w - 9, y],
    [x + w, y + h / 2],
    [x + w - 9, y + h],
    [x + 9, y + h],
  ]);
  canvas.drawPath(plaque, makePaint({ color: '#0C0E13', alpha: 0.94 }));
  canvas.drawPath(plaque, makePaint({ shader: metalShader(ramp, x, y, w, h), stroke: 1.3 }));
  const label = RARITY_LABEL[rarity].toUpperCase();
  drawRarityEmblem(canvas, rarity, x + 20, y + h / 2, wide ? 11 : 9.5, ramp);
  drawText(canvas, fonts, {
    text: label,
    family: SKIA_FAMILY.uiBold,
    size: wide ? 9 : 8,
    letterSpacing: 2.6,
    color: labelColor,
    x: x + 26,
    y: y + (wide ? 5.6 : 4.6),
    width: w - 40,
    align: 'center',
    maxLines: 1,
  });
};

/** Gold (or rarity metal) gradient paint for titles. */
const titlePaint = (ramp: MetalRamp, top: number, height: number) =>
  makePaint({ shader: linear([0, top], [0, top + height], [ramp[3], ramp[3], ramp[2], ramp[1]], [0, 0.35, 0.7, 1]) });

export interface FrameOptions {
  readonly card: CardDefinition;
  readonly layout: CardLayout;
  readonly fonts: SkiaFonts;
  readonly undiscovered?: boolean;
}

const drawStandardFrame = (canvas: SkCanvas, { card, layout, fonts, undiscovered }: FrameOptions) => {
  const ramp = undiscovered ? STONE : rarityMaterials[card.rarity].metal;
  const labelColor = undiscovered ? '#8B8990' : rarityMaterials[card.rarity].label;

  // Card stock with a faint engraved lattice.
  canvas.drawRRect(rrect(CARD_RECT, CARD_RADIUS), makePaint({ shader: linear([0, 0], [0, CARD_H], ['#171B24', '#0E1016', '#0A0B10']) }));
  canvas.save();
  canvas.clipRRect(rrect(CARD_RECT, CARD_RADIUS), ClipOp.Intersect, true);
  drawLattice(canvas, CARD_RECT, 14, ramp[2], 0.05);
  canvas.restore();

  // Metal border band.
  canvas.drawDRRect(rrect(CARD_RECT, CARD_RADIUS), rrect(inset(CARD_RECT, 8), 7), makePaint({ shader: metalShader(ramp, 0, 0, CARD_W, CARD_H) }));
  canvas.drawRRect(rrect(inset(CARD_RECT, 0.7), CARD_RADIUS - 0.7), makePaint({ color: ramp[3], stroke: 0.8, alpha: 0.65 }));
  canvas.drawRRect(rrect(inset(CARD_RECT, 4), CARD_RADIUS - 3), makePaint({ color: ramp[0], stroke: 0.9, alpha: 0.75 }));
  canvas.drawRRect(rrect(inset(CARD_RECT, 4.8), CARD_RADIUS - 4), makePaint({ color: ramp[3], stroke: 0.5, alpha: 0.35 }));
  canvas.drawRRect(rrect(inset(CARD_RECT, 8), 7), makePaint({ color: '#000000', stroke: 1, alpha: 0.7 }));

  // Art window: punched out, then a bevelled metal bezel.
  canvas.drawRRect(rrect(layout.art, layout.artRadius), makePaint({ color: '#000000', blend: BlendMode.Clear }));
  canvas.drawRRect(rrect(inset(layout.art, -1.7), layout.artRadius + 1.7), makePaint({ shader: metalShader(ramp, layout.art.x, layout.art.y, layout.art.width, layout.art.height), stroke: 3.2 }));
  canvas.drawRRect(rrect(layout.art, layout.artRadius), makePaint({ color: '#000000', stroke: 1, alpha: 0.8 }));
  const a = layout.art;
  drawCornerFlourish(canvas, a.x - 3.5, a.y - 3.5, false, false, 11, ramp[2]);
  drawCornerFlourish(canvas, a.x + a.width + 3.5, a.y - 3.5, true, false, 11, ramp[2]);
  drawCornerFlourish(canvas, a.x - 3.5, a.y + a.height + 3.5, false, true, 11, ramp[2]);
  drawCornerFlourish(canvas, a.x + a.width + 3.5, a.y + a.height + 3.5, true, true, 11, ramp[2]);

  drawCartouche(canvas, fonts, card.rarity, ramp, a.y - 9, labelColor, false);

  // Name plate.
  const p = layout.plate;
  canvas.drawRRect(rrect(p, 7), makePaint({ shader: linear([0, p.y], [0, p.y + p.height], ['#181C25', '#10131A', '#0C0E13']) }));
  canvas.drawRRect(rrect(p, 7), makePaint({ shader: metalShader(ramp, p.x, p.y, p.width, p.height), stroke: 1.2 }));
  canvas.drawLine(p.x + 14, p.y + 1.6, p.x + p.width - 14, p.y + 1.6, makePaint({ color: ramp[3], stroke: 0.6, alpha: 0.3 }));

  const titleTop = p.y + 13;
  drawText(canvas, fonts, {
    text: undiscovered ? card.title : card.title.toUpperCase(),
    family: SKIA_FAMILY.displayBold,
    size: 25,
    letterSpacing: 1.6,
    paint: undiscovered ? undefined : titlePaint(ramp, titleTop, 30),
    color: undiscovered ? '#5D606B' : undefined,
    x: p.x + 8,
    y: titleTop,
    width: p.width - 16,
    maxLines: 1,
    shadow: { color: '#000000', blur: 3, dy: 1.5 },
  });
  // Ornamental rule.
  const ruleY = p.y + 49;
  const cx = CARD_W / 2;
  canvas.drawLine(cx - 70, ruleY, cx - 8, ruleY, makePaint({ color: ramp[1], stroke: 0.8 }));
  canvas.drawLine(cx + 8, ruleY, cx + 70, ruleY, makePaint({ color: ramp[1], stroke: 0.8 }));
  canvas.drawPath(polygon([[cx, ruleY - 3.6], [cx + 3.6, ruleY], [cx, ruleY + 3.6], [cx - 3.6, ruleY]]), makePaint({ color: ramp[2] }));

  if (card.epithet) {
    drawText(canvas, fonts, {
      text: card.epithet.toUpperCase(),
      family: SKIA_FAMILY.display,
      size: 11.5,
      letterSpacing: 2.4,
      color: undiscovered ? '#4F525C' : withAlpha(ramp[3], 0.92),
      x: p.x + 8,
      y: p.y + 57,
      width: p.width - 16,
      maxLines: 1,
    });
  }
  drawText(canvas, fonts, {
    text: undiscovered ? 'UNDISCOVERED' : formatReference(card.passage).toUpperCase(),
    family: SKIA_FAMILY.uiBold,
    size: 8.4,
    letterSpacing: 1.8,
    color: undiscovered ? '#5D606B' : '#A49E92',
    x: p.x + 8,
    y: p.y + 78,
    width: p.width - 16,
    maxLines: 1,
  });
  drawFooter(canvas, fonts, card, p.x + 12, p.y + p.height - 15, p.width - 24, undiscovered ? '#4A4D56' : '#7E786E');
};

const drawFooter = (canvas: SkCanvas, fonts: SkiaFonts, card: CardDefinition, x: number, y: number, width: number, color: string) => {
  const number = `No. ${String(card.collectorNumber).padStart(2, '0')}`;
  drawText(canvas, fonts, { text: number, family: SKIA_FAMILY.uiBold, size: 6.6, letterSpacing: 1.2, color, x, y, width: width / 2, align: 'left', maxLines: 1 });
  drawText(canvas, fonts, { text: 'KINGDOM LEGENDS · S I', family: SKIA_FAMILY.uiBold, size: 6.6, letterSpacing: 1.2, color, x: x + width / 2, y, width: width / 2, align: 'right', maxLines: 1 });
};

const drawFullArtFrame = (canvas: SkCanvas, { card, layout, fonts }: FrameOptions) => {
  const ramp = rarityMaterials[card.rarity].metal;
  // Legibility gradients over the art.
  canvas.drawRect(rect(0, 0, CARD_W, 70), makePaint({ shader: linear([0, 0], [0, 70], [withAlpha('#000000', 0.42), withAlpha('#000000', 0)]) }));
  canvas.drawRect(rect(0, 240, CARD_W, CARD_H - 240), makePaint({ shader: linear([0, 240], [0, CARD_H], [withAlpha('#0A0704', 0), withAlpha('#0A0704', 0.6), withAlpha('#080604', 0.95)], [0, 0.4, 1]) }));

  // Ornate gold border.
  canvas.drawDRRect(rrect(CARD_RECT, CARD_RADIUS), rrect(inset(CARD_RECT, 7), 8), makePaint({ shader: metalShader(ramp, 0, 0, CARD_W, CARD_H) }));
  canvas.drawRRect(rrect(inset(CARD_RECT, 0.7), CARD_RADIUS - 0.7), makePaint({ color: ramp[3], stroke: 0.8, alpha: 0.7 }));
  canvas.drawRRect(rrect(inset(CARD_RECT, 3.5), CARD_RADIUS - 3), makePaint({ color: ramp[0], stroke: 0.8, alpha: 0.7 }));
  canvas.drawRRect(rrect(inset(CARD_RECT, 7), 8), makePaint({ color: '#000000', stroke: 1, alpha: 0.6 }));
  canvas.drawRRect(rrect(inset(CARD_RECT, 11), 6), makePaint({ color: ramp[2], stroke: 0.7, alpha: 0.75 }));
  drawCornerFlourish(canvas, 13, 13, false, false, 16, ramp[2]);
  drawCornerFlourish(canvas, CARD_W - 13, 13, true, false, 16, ramp[2]);
  drawCornerFlourish(canvas, 13, CARD_H - 13, false, true, 16, ramp[2]);
  drawCornerFlourish(canvas, CARD_W - 13, CARD_H - 13, true, true, 16, ramp[2]);

  drawCartouche(canvas, fonts, card.rarity, ramp, 16, rarityMaterials[card.rarity].label, true);

  const p = layout.plate;
  const titleTop = p.y + 2;
  drawText(canvas, fonts, {
    text: card.title.toUpperCase(),
    family: SKIA_FAMILY.displayBold,
    size: 36,
    letterSpacing: 2.4,
    paint: titlePaint(ramp, titleTop + 4, 38),
    x: p.x,
    y: titleTop,
    width: p.width,
    maxLines: 1,
    shadow: { color: '#000000', blur: 5, dy: 2 },
  });
  const cx = CARD_W / 2;
  const ruleY = p.y + 48;
  canvas.drawLine(cx - 96, ruleY, cx - 9, ruleY, makePaint({ color: ramp[2], stroke: 0.8 }));
  canvas.drawLine(cx + 9, ruleY, cx + 96, ruleY, makePaint({ color: ramp[2], stroke: 0.8 }));
  canvas.drawPath(polygon([[cx, ruleY - 4], [cx + 4, ruleY], [cx, ruleY + 4], [cx - 4, ruleY]]), makePaint({ color: ramp[3] }));
  if (card.epithet) {
    drawText(canvas, fonts, {
      text: card.epithet.toUpperCase(),
      family: SKIA_FAMILY.display,
      size: 13.5,
      letterSpacing: 3.2,
      color: '#F6E6B9',
      x: p.x,
      y: p.y + 55,
      width: p.width,
      maxLines: 1,
      shadow: { color: '#000000', blur: 3, dy: 1 },
    });
  }
  drawText(canvas, fonts, {
    text: formatReference(card.passage).toUpperCase(),
    family: SKIA_FAMILY.uiBold,
    size: 8.8,
    letterSpacing: 2.2,
    color: '#CDBB91',
    x: p.x,
    y: p.y + 75,
    width: p.width,
    maxLines: 1,
  });
  drawFooter(canvas, fonts, card, 34, CARD_H - 22, CARD_W - 68, '#9A8A66');
};

/** Bakes the frame layer: transparent where the art shows through. */
export const bakeFrame = (options: FrameOptions, scale: number): SkImage =>
  bakeImage(CARD_W * scale, CARD_H * scale, (canvas) => {
    canvas.scale(scale, scale);
    if (options.layout.fullArt && !options.undiscovered) drawFullArtFrame(canvas, options);
    else drawStandardFrame(canvas, options);
  });

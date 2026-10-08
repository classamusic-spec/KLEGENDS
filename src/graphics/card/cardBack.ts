import { ClipOp, type SkCanvas, type SkImage, type SkRect, type SkRRect } from '@shopify/react-native-skia';

import { CARD_H, CARD_RADIUS, CARD_W, rect } from './layout';
import { drawCornerFlourish, drawCrown, drawLattice, GOLD, metalShader } from '../art/emblems';
import { bakeImage } from '../skia/bake';
import { BlendMode, linear, makePaint, polygon, radial, withAlpha } from '../skia/draw';
import { SKIA_FAMILY, type SkiaFonts } from '../skia/fonts';
import { drawText } from '../skia/text';

const rr = (r: SkRect, radius: number): SkRRect => ({ rect: r, rx: radius, ry: radius });
const inset = (r: SkRect, d: number): SkRect => rect(r.x + d, r.y + d, r.width - d * 2, r.height - d * 2);

/** The shared Kingdom Legends card back (original design). */
export const drawCardBack = (canvas: SkCanvas, fonts: SkiaFonts) => {
  const card = rect(0, 0, CARD_W, CARD_H);
  const center: [number, number] = [CARD_W / 2, 196];
  canvas.drawRRect(rr(card, CARD_RADIUS), makePaint({ shader: radial(center, 300, ['#22375A', '#132036', '#0A0F1A', '#06080D'], [0, 0.35, 0.75, 1]) }));

  canvas.save();
  canvas.clipRRect(rr(inset(card, 8), 7), ClipOp.Intersect, true);
  drawLattice(canvas, card, 15, GOLD[2], 0.09);
  // Radiating guilloché rays behind the medallion.
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    canvas.drawLine(center[0] + Math.cos(a) * 64, center[1] + Math.sin(a) * 64, center[0] + Math.cos(a) * 190, center[1] + Math.sin(a) * 190, makePaint({ color: GOLD[2], stroke: 0.6, alpha: i % 2 === 0 ? 0.16 : 0.07 }));
  }
  canvas.restore();

  // Gold border band and inner rules.
  canvas.drawDRRect(rr(card, CARD_RADIUS), rr(inset(card, 8), 7), makePaint({ shader: metalShader(GOLD, 0, 0, CARD_W, CARD_H) }));
  canvas.drawRRect(rr(inset(card, 0.7), CARD_RADIUS - 0.7), makePaint({ color: GOLD[3], stroke: 0.8, alpha: 0.6 }));
  canvas.drawRRect(rr(inset(card, 4), CARD_RADIUS - 3), makePaint({ color: GOLD[0], stroke: 0.9, alpha: 0.7 }));
  canvas.drawRRect(rr(inset(card, 14), 6), makePaint({ color: GOLD[2], stroke: 0.9, alpha: 0.85 }));
  canvas.drawRRect(rr(inset(card, 17.5), 5), makePaint({ color: GOLD[1], stroke: 0.6, alpha: 0.6 }));
  drawCornerFlourish(canvas, 22, 22, false, false, 20, GOLD[2]);
  drawCornerFlourish(canvas, CARD_W - 22, 22, true, false, 20, GOLD[2]);
  drawCornerFlourish(canvas, 22, CARD_H - 22, false, true, 20, GOLD[2]);
  drawCornerFlourish(canvas, CARD_W - 22, CARD_H - 22, true, true, 20, GOLD[2]);

  // Medallion with the crown crest.
  canvas.drawCircle(center[0], center[1], 66, makePaint({ shader: radial(center, 66, ['#2A426A', '#152238', '#0C1322'], [0, 0.6, 1]) }));
  canvas.drawCircle(center[0], center[1], 66, makePaint({ shader: metalShader(GOLD, center[0] - 66, center[1] - 66, 132, 132), stroke: 3.4 }));
  canvas.drawCircle(center[0], center[1], 59, makePaint({ color: GOLD[2], stroke: 0.8, alpha: 0.7 }));
  canvas.drawCircle(center[0], center[1], 90, makePaint({ shader: radial(center, 90, [withAlpha('#FFE3A6', 0.16), withAlpha('#FFE3A6', 0)]), blend: BlendMode.Plus }));
  drawCrown(canvas, [center[0], center[1] - 2], 74, GOLD, true);

  // Diamond rules and wordmark.
  const rule = (y: number) => {
    canvas.drawLine(center[0] - 58, y, center[0] - 8, y, makePaint({ color: GOLD[2], stroke: 0.8 }));
    canvas.drawLine(center[0] + 8, y, center[0] + 58, y, makePaint({ color: GOLD[2], stroke: 0.8 }));
    canvas.drawPath(polygon([[center[0], y - 3.5], [center[0] + 3.5, y], [center[0], y + 3.5], [center[0] - 3.5, y]]), makePaint({ color: GOLD[3] }));
  };
  rule(102);
  drawText(canvas, fonts, {
    text: 'KINGDOM',
    family: SKIA_FAMILY.displayBold,
    size: 22,
    letterSpacing: 5,
    paint: makePaint({ shader: linear([0, 282], [0, 306], [GOLD[3], GOLD[2], GOLD[1]]) }),
    x: 30,
    y: 280,
    width: CARD_W - 60,
    maxLines: 1,
    shadow: { color: '#000000', blur: 4, dy: 1.5 },
  });
  drawText(canvas, fonts, {
    text: 'LEGENDS',
    family: SKIA_FAMILY.displayBold,
    size: 22,
    letterSpacing: 5,
    paint: makePaint({ shader: linear([0, 308], [0, 332], [GOLD[3], GOLD[2], GOLD[1]]) }),
    x: 30,
    y: 306,
    width: CARD_W - 60,
    maxLines: 1,
    shadow: { color: '#000000', blur: 4, dy: 1.5 },
  });
  rule(348);
};

export const bakeCardBack = (fonts: SkiaFonts, scale: number): SkImage =>
  bakeImage(CARD_W * scale, CARD_H * scale, (canvas) => {
    canvas.scale(scale, scale);
    drawCardBack(canvas, fonts);
  });

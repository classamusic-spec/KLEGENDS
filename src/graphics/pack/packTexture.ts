import { Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';

import { CRIMP_H, PACK_H, PACK_W, SEAL_Y } from './packGeometry';
import { drawCornerFlourish, drawCrown, metalShader, type MetalRamp } from '../art/emblems';
import { bakeImage } from '../skia/bake';
import { BlendMode, linear, makePaint, mix, polygon, radial, rng, smoothPath, withAlpha } from '../skia/draw';
import { loadSkiaFonts, SKIA_FAMILY, type SkiaFonts } from '../skia/fonts';
import { drawText } from '../skia/text';
import type { PackVisualTheme } from '@/domain/packs';

const TOOTH = 5;

/** Wrapper outline with serrated heat-crimped top and bottom edges. */
const wrapperOutline = () => {
  const b = Skia.PathBuilder.Make();
  b.moveTo(0, TOOTH);
  for (let x = 0; x < PACK_W; x += TOOTH * 2) {
    b.lineTo(x + TOOTH, 0);
    b.lineTo(Math.min(PACK_W, x + TOOTH * 2), TOOTH);
  }
  b.lineTo(PACK_W, PACK_H - TOOTH);
  for (let x = PACK_W; x > 0; x -= TOOTH * 2) {
    b.lineTo(x - TOOTH, PACK_H);
    b.lineTo(Math.max(0, x - TOOTH * 2), PACK_H - TOOTH);
  }
  b.close();
  return b.build();
};

const crimpBand = (canvas: SkCanvas, y: number, h: number, theme: PackVisualTheme) => {
  canvas.drawRect({ x: 0, y, width: PACK_W, height: h }, makePaint({ shader: linear([0, y], [0, y + h], [mix(theme.foil.sheen, '#FFFFFF', 0.15), theme.foil.mid, mix(theme.foil.sheen, '#FFFFFF', 0.08)]) }));
  for (let ry = y + 2; ry < y + h - 1; ry += 2.6) {
    canvas.drawLine(0, ry, PACK_W, ry, makePaint({ color: '#FFFFFF', stroke: 0.6, alpha: 0.12 }));
    canvas.drawLine(0, ry + 1.2, PACK_W, ry + 1.2, makePaint({ color: '#000000', stroke: 0.6, alpha: 0.18 }));
  }
  for (let x = 3; x < PACK_W; x += 6) {
    canvas.drawLine(x, y + 1, x, y + h - 1, makePaint({ color: '#000000', stroke: 0.5, alpha: 0.1 }));
  }
};

export const drawPackFront = (canvas: SkCanvas, theme: PackVisualTheme, fonts: SkiaFonts) => {
  const rand = rng(41);
  const gold: MetalRamp = [theme.accent.dark, mix(theme.accent.dark, theme.accent.mid, 0.6), theme.accent.mid, theme.accent.light];
  const outline = wrapperOutline();
  canvas.save();
  canvas.clipPath(outline, 1, true);

  // Foil base: deep sapphire to obsidian with a brushed vertical grain.
  canvas.drawRect({ x: 0, y: 0, width: PACK_W, height: PACK_H }, makePaint({ shader: linear([0, 0], [PACK_W, PACK_H], [theme.foil.base, theme.foil.mid, theme.foil.base, mix(theme.foil.mid, theme.foil.base, 0.5)], [0, 0.42, 0.75, 1]) }));
  canvas.drawRect({ x: 0, y: 0, width: PACK_W, height: PACK_H }, makePaint({ shader: radial([PACK_W / 2, 150], 230, [withAlpha(theme.foil.sheen, 0.45), withAlpha(theme.foil.sheen, 0)]) }));
  for (let x = 0; x < PACK_W; x += 1.5) {
    canvas.drawLine(x, 0, x + rand.range(-2, 2), PACK_H, makePaint({ color: rand.next() > 0.5 ? '#FFFFFF' : '#000000', stroke: 0.5, alpha: rand.range(0.015, 0.05) }));
  }

  // Creases: soft long wrinkles that catch the light.
  for (let i = 0; i < 7; i++) {
    const x0 = rand.range(-40, PACK_W);
    const y0 = rand.range(40, PACK_H - 60);
    const len = rand.range(60, 170);
    const ang = rand.range(-1.2, -0.4);
    const pts = [
      [x0, y0],
      [x0 + Math.cos(ang) * len * 0.5 + rand.range(-8, 8), y0 + Math.sin(ang) * len * 0.5],
      [x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len],
    ] as const;
    canvas.drawPath(smoothPath(pts), makePaint({ color: '#FFFFFF', stroke: rand.range(1.5, 3.5), alpha: 0.07, blur: 2 }));
    canvas.save();
    canvas.translate(1.6, 1.4);
    canvas.drawPath(smoothPath(pts), makePaint({ color: '#000000', stroke: rand.range(1, 2.5), alpha: 0.18, blur: 1.6 }));
    canvas.restore();
  }

  // Heat-sealed crimp bands.
  crimpBand(canvas, 0, CRIMP_H, theme);
  crimpBand(canvas, PACK_H - CRIMP_H, CRIMP_H, theme);

  // Perforated seal with "tear here" notches on both edges.
  for (let x = 14; x < PACK_W - 12; x += 5) {
    canvas.drawLine(x, SEAL_Y, x + 2.4, SEAL_Y, makePaint({ color: theme.accent.light, stroke: 0.8, alpha: 0.55 }));
  }
  canvas.drawLine(0, SEAL_Y - 3.5, PACK_W, SEAL_Y - 3.5, makePaint({ color: '#000000', stroke: 0.6, alpha: 0.25 }));
  for (const [x, dir] of [
    [0, 1],
    [PACK_W, -1],
  ] as const) {
    canvas.drawPath(polygon([[x, SEAL_Y - 4.5], [x + dir * 7, SEAL_Y], [x, SEAL_Y + 4.5]]), makePaint({ color: '#000000', blend: BlendMode.Clear }));
  }

  // Engraved gold border.
  const bx = 14;
  const by = CRIMP_H + 40;
  const bw = PACK_W - bx * 2;
  const bh = PACK_H - CRIMP_H - 18 - by;
  canvas.drawRRect({ rect: { x: bx, y: by, width: bw, height: bh }, rx: 6, ry: 6 }, makePaint({ shader: metalShader(gold, bx, by, bw, bh), stroke: 2 }));
  canvas.drawRRect({ rect: { x: bx + 4, y: by + 4, width: bw - 8, height: bh - 8 }, rx: 4, ry: 4 }, makePaint({ color: gold[2], stroke: 0.7, alpha: 0.7 }));
  drawCornerFlourish(canvas, bx + 7, by + 7, false, false, 16, gold[2]);
  drawCornerFlourish(canvas, bx + bw - 7, by + 7, true, false, 16, gold[2]);
  drawCornerFlourish(canvas, bx + 7, by + bh - 7, false, true, 16, gold[2]);
  drawCornerFlourish(canvas, bx + bw - 7, by + bh - 7, true, true, 16, gold[2]);

  // Crest: rays, medallion and crown.
  const crest: [number, number] = [PACK_W / 2, 158];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    canvas.drawLine(crest[0] + Math.cos(a) * 52, crest[1] + Math.sin(a) * 52, crest[0] + Math.cos(a) * 112, crest[1] + Math.sin(a) * 112, makePaint({ color: gold[3], stroke: 0.6, alpha: i % 2 ? 0.08 : 0.2 }));
  }
  canvas.drawCircle(crest[0], crest[1], 48, makePaint({ shader: radial(crest, 48, [mix(theme.foil.sheen, '#000000', 0.2), theme.foil.base], [0, 1]) }));
  canvas.drawCircle(crest[0], crest[1], 48, makePaint({ shader: metalShader(gold, crest[0] - 48, crest[1] - 48, 96, 96), stroke: 3 }));
  canvas.drawCircle(crest[0], crest[1], 42, makePaint({ color: gold[2], stroke: 0.7, alpha: 0.7 }));
  drawCrown(canvas, [crest[0], crest[1] - 1], 60, gold, true);

  // Wordmark.
  const titlePaint = (y: number) => makePaint({ shader: linear([0, y], [0, y + 30], [gold[3], gold[2], gold[1]]) });
  drawText(canvas, fonts, { text: 'KINGDOM', family: SKIA_FAMILY.displayBold, size: 30, letterSpacing: 4, paint: titlePaint(222), x: 10, y: 218, width: PACK_W - 20, maxLines: 1, shadow: { color: '#000000', blur: 5, dy: 2 } });
  drawText(canvas, fonts, { text: 'LEGENDS', family: SKIA_FAMILY.displayBold, size: 30, letterSpacing: 4, paint: titlePaint(258), x: 10, y: 254, width: PACK_W - 20, maxLines: 1, shadow: { color: '#000000', blur: 5, dy: 2 } });
  const ruleY = 302;
  canvas.drawLine(PACK_W / 2 - 70, ruleY, PACK_W / 2 - 9, ruleY, makePaint({ color: gold[2], stroke: 0.8 }));
  canvas.drawLine(PACK_W / 2 + 9, ruleY, PACK_W / 2 + 70, ruleY, makePaint({ color: gold[2], stroke: 0.8 }));
  canvas.drawPath(polygon([[PACK_W / 2, ruleY - 4], [PACK_W / 2 + 4, ruleY], [PACK_W / 2, ruleY + 4], [PACK_W / 2 - 4, ruleY]]), makePaint({ color: gold[3] }));
  drawText(canvas, fonts, { text: theme.subtitle, family: SKIA_FAMILY.uiBold, size: 10, letterSpacing: 4.2, color: gold[3], x: 10, y: 314, width: PACK_W - 20, maxLines: 1 });
  drawText(canvas, fonts, { text: 'FIVE CARDS · SERIES I', family: SKIA_FAMILY.uiBold, size: 7, letterSpacing: 2.6, color: withAlpha(gold[2], 0.85), x: 10, y: 338, width: PACK_W - 20, maxLines: 1 });

  // Broad glossy reflection.
  canvas.drawPath(polygon([[-20, 120], [PACK_W * 0.55, -10], [PACK_W * 0.75, -10], [-20, 220]]), makePaint({ shader: linear([0, 60], [PACK_W * 0.4, 160], [withAlpha('#FFFFFF', 0), withAlpha('#FFFFFF', 0.07), withAlpha('#FFFFFF', 0)]) }));
  canvas.restore();

  // Outline edge highlight.
  canvas.drawPath(outline, makePaint({ color: '#FFFFFF', stroke: 0.8, alpha: 0.18 }));
};

const cache = new Map<string, Promise<SkImage>>();

/** Bakes the wrapper front for a theme at `scale` pixels per pack unit. */
export const loadPackTexture = (theme: PackVisualTheme, scale: number): Promise<SkImage> => {
  const q = Math.min(3, Math.max(1, Math.round(scale * 4) / 4));
  const key = `${theme.id}|${q}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = loadSkiaFonts().then(
      (fonts) =>
        new Promise<SkImage>((resolve) =>
          setTimeout(() => {
            resolve(
              bakeImage(PACK_W * q, PACK_H * q, (canvas) => {
                canvas.scale(q, q);
                drawPackFront(canvas, theme, fonts);
              }),
            );
          }, 0),
        ),
    );
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
};

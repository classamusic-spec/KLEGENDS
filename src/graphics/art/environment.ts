import { FilterMode, MipmapMode, Skia, TileMode, type SkCanvas, type SkImage, type SkRect } from '@shopify/react-native-skia';

import { bakeImage } from '../skia/bake';

import { BlendMode, linear, makePaint, mix, polygon, radial, smoothPath, union, withAlpha, withSave, type Pt, type Rng } from '../skia/draw';

/** Vertical sky gradient filling `rect`. */
export const sky = (canvas: SkCanvas, rect: SkRect, colors: readonly string[], positions?: readonly number[]) => {
  canvas.drawRect(rect, makePaint({ shader: linear([0, rect.y], [0, rect.y + rect.height], colors, positions) }));
};

/** A light source: wide atmospheric halo, a bloom, and an optional disk. */
export const sunGlow = (
  canvas: SkCanvas,
  center: Pt,
  { radius, halo, core, disk = true }: { radius: number; halo: string; core: string; disk?: boolean },
) => {
  canvas.drawCircle(center[0], center[1], radius * 7, makePaint({ shader: radial(center, radius * 7, [withAlpha(halo, 0.55), withAlpha(halo, 0.18), withAlpha(halo, 0)], [0, 0.35, 1]) }));
  canvas.drawCircle(center[0], center[1], radius * 2.4, makePaint({ shader: radial(center, radius * 2.4, [withAlpha(core, 0.95), withAlpha(halo, 0.4), withAlpha(halo, 0)], [0, 0.45, 1]), blend: BlendMode.Screen }));
  if (disk) canvas.drawCircle(center[0], center[1], radius, makePaint({ color: core, blur: radius * 0.25 }));
};

/**
 * Volumetric god rays fanning from `origin`, drawn additively. Each ray is
 * three nested wedges of decreasing width, which reads as a soft beam without
 * the cost of a blur on the CPU.
 */
export const godRays = (
  canvas: SkCanvas,
  rand: Rng,
  origin: Pt,
  { count, length, angle, spread, color, alpha, width = 0.05 }: { count: number; length: number; angle: number; spread: number; color: string; alpha: number; width?: number },
) => {
  withSave(canvas, () => {
    for (let i = 0; i < count; i++) {
      const a = angle - spread / 2 + (spread * (i + rand.range(0.1, 0.9))) / count;
      const w = width * rand.range(0.4, 1.4);
      const len = length * rand.range(0.6, 1);
      const strength = alpha * rand.range(0.45, 1);
      for (const [k, layerAlpha] of [[2.4, 0.22], [1.4, 0.4], [0.6, 0.75]] as const) {
        const p1: Pt = [origin[0] + Math.cos(a - w * k) * len, origin[1] + Math.sin(a - w * k) * len];
        const p2: Pt = [origin[0] + Math.cos(a + w * k) * len, origin[1] + Math.sin(a + w * k) * len];
        canvas.drawPath(
          polygon([origin, p1, p2]),
          makePaint({
            shader: radial(origin, len, [withAlpha(color, strength * layerAlpha), withAlpha(color, strength * layerAlpha * 0.35), withAlpha(color, 0)], [0, 0.45, 1]),
            blend: BlendMode.Plus,
          }),
        );
      }
    }
  });
};

/**
 * A backlit cloud cluster: puffs are unioned into one soft shape whose edge
 * facing the light glows, like cumulus at sunrise.
 */
export const cloudBank = (
  canvas: SkCanvas,
  rand: Rng,
  { x0, x1, y, puffs, size, body, lit, light, litAlpha = 0.9 }: { x0: number; x1: number; y: number; puffs: number; size: number; body: string; lit: string; light: Pt; litAlpha?: number },
) => {
  const blobs = Array.from({ length: puffs }, (_, i) => {
    const t = puffs === 1 ? 0.5 : i / (puffs - 1);
    const x = x0 + (x1 - x0) * t + rand.range(-size * 0.4, size * 0.4);
    // Puffs are taller toward the middle of the cluster.
    const r = size * rand.range(0.6, 1) * (0.6 + 0.6 * Math.sin(Math.PI * t));
    return Skia.Path.Oval({ x: x - r * 2.1, y: y - r * 0.85 + rand.range(-size * 0.2, size * 0.15), width: r * 4.2, height: r * 1.7 });
  });
  const shape = union(blobs);
  const bounds = shape.getBounds();
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = light[0] - cx;
  const dy = light[1] - cy;
  const d = Math.max(1, Math.hypot(dx, dy));
  const rim = Math.min(3.2, size * 0.16);
  withSave(canvas, () => {
    canvas.save();
    canvas.translate((dx / d) * rim, (dy / d) * rim);
    canvas.drawPath(shape, makePaint({ color: lit, alpha: litAlpha, blur: rim * 0.9 }));
    canvas.restore();
    canvas.drawPath(
      shape,
      makePaint({
        shader: linear([cx + (dx / d) * bounds.height, cy + (dy / d) * bounds.height], [cx - (dx / d) * bounds.height, cy - (dy / d) * bounds.height], [mix(body, lit, 0.4), body]),
        alpha: 0.88,
        blur: 1.6,
      }),
    );
  });
};

/** Points of an organic ridgeline between x0 and x1. */
export const ridgePoints = (
  rand: Rng,
  { x0, x1, baseY, amp, steps = 9, peaks }: { x0: number; x1: number; baseY: number; amp: number; steps?: number; peaks?: readonly Pt[] },
): Pt[] => {
  const pts: Pt[] = [];
  const phase = rand.range(0, Math.PI * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    let y = baseY - amp * (0.55 * Math.sin(t * 5.1 + phase) + 0.3 * Math.sin(t * 11.3 + phase * 1.7) + rand.range(-0.25, 0.25));
    for (const [px, py] of peaks ?? []) {
      const influence = Math.exp(-(((x - px) / ((x1 - x0) * 0.12)) ** 2));
      y = y * (1 - influence) + py * influence;
    }
    pts.push([x, y]);
  }
  return pts;
};

/** Filled ridge silhouette with a vertical gradient (lighter crest → darker base). */
export const ridge = (canvas: SkCanvas, points: readonly Pt[], bottom: number, top: string, base: string) => {
  const minY = Math.min(...points.map((p) => p[1]));
  canvas.drawPath(smoothPath(points, bottom), makePaint({ shader: linear([0, minY], [0, bottom], [top, base]) }));
};

/** Horizontal band of atmospheric haze. */
export const haze = (canvas: SkCanvas, rect: SkRect, y: number, height: number, color: string, alpha = 0.6) => {
  canvas.drawRect(
    Skia.XYWHRect(rect.x, y - height / 2, rect.width, height),
    makePaint({ shader: linear([0, y - height / 2], [0, y + height / 2], [withAlpha(color, 0), withAlpha(color, alpha), withAlpha(color, 0)]) }),
  );
};

export const stars = (canvas: SkCanvas, rand: Rng, rect: SkRect, count: number, color: string) => {
  for (let i = 0; i < count; i++) {
    const x = rand.range(rect.x, rect.x + rect.width);
    const y = rand.range(rect.y, rect.y + rect.height);
    const r = rand.range(0.25, 1.05);
    canvas.drawCircle(x, y, r, makePaint({ color, alpha: rand.range(0.35, 1) }));
    if (r > 0.9) canvas.drawCircle(x, y, r * 4, makePaint({ shader: radial([x, y], r * 4, [withAlpha(color, 0.35), withAlpha(color, 0)]) }));
  }
};

/** Glowing dust motes caught in the light. */
export const dustMotes = (canvas: SkCanvas, rand: Rng, rect: SkRect, count: number, color: string, maxR = 1) => {
  for (let i = 0; i < count; i++) {
    const x = rand.range(rect.x, rect.x + rect.width);
    const y = rand.range(rect.y, rect.y + rect.height);
    const r = rand.range(0.25, maxR);
    canvas.drawCircle(x, y, r * 2.2, makePaint({ shader: radial([x, y], r * 2.2, [withAlpha(color, rand.range(0.4, 0.85)), withAlpha(color, 0)]), blend: BlendMode.Plus }));
  }
};

/** Still water reflecting the sky, with glints. */
export const water = (
  canvas: SkCanvas,
  rand: Rng,
  rect: SkRect,
  { top, bottom, glint, glints = 26 }: { top: string; bottom: string; glint: string; glints?: number },
) => {
  canvas.drawRect(rect, makePaint({ shader: linear([0, rect.y], [0, rect.y + rect.height], [top, bottom]) }));
  for (let i = 0; i < glints; i++) {
    const y = rand.range(rect.y + 1, rect.y + rect.height - 1);
    const x = rand.range(rect.x, rect.x + rect.width);
    const w = rand.range(3, 16) * (0.5 + (y - rect.y) / rect.height);
    canvas.drawLine(x, y, x + w, y, makePaint({ color: glint, alpha: rand.range(0.25, 0.8), stroke: rand.range(0.5, 1.1) }));
  }
};

let noiseTile: SkImage | null = null;

/** A small tileable noise texture, baked once and reused by every illustration. */
const getNoiseTile = (): SkImage => {
  noiseTile ??= bakeImage(160, 160, (canvas) => {
    canvas.drawRect({ x: 0, y: 0, width: 160, height: 160 }, makePaint({ shader: Skia.Shader.MakeFractalNoise(0.7, 0.7, 2, 17, 160, 160) }));
  });
  return noiseTile;
};

/** Film grain and a faint painterly texture over a finished illustration. */
export const grain = (canvas: SkCanvas, rect: SkRect, alpha = 0.08) => {
  const shader = getNoiseTile().makeShaderOptions(TileMode.Repeat, TileMode.Repeat, FilterMode.Linear, MipmapMode.None);
  canvas.drawRect(rect, makePaint({ shader, alpha, blend: BlendMode.Overlay }));
};

export const vignette = (canvas: SkCanvas, rect: SkRect, strength = 0.65, color = '#000000') => {
  const c: Pt = [rect.x + rect.width / 2, rect.y + rect.height / 2];
  const r = Math.hypot(rect.width, rect.height) * 0.62;
  canvas.drawRect(rect, makePaint({ shader: radial(c, r, [withAlpha(color, 0), withAlpha(color, 0), withAlpha(color, strength)], [0, 0.55, 1]) }));
};

/** Re-exported color helpers commonly used by scenes. */
export { mix, withAlpha };

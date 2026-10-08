import {
  BlendMode,
  BlurStyle,
  PaintStyle,
  PathOp,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkCanvas,
  type SkMatrix,
  type SkPaint,
  type SkPath,
  type SkShader,
} from '@shopify/react-native-skia';

/**
 * Thin helpers over the imperative Skia API, used to bake procedural art
 * into textures. Everything here is synchronous and side-effect free apart
 * from drawing into the canvas passed in.
 */
export type Pt = readonly [number, number];

export interface PaintOptions {
  readonly color?: string;
  readonly shader?: SkShader;
  readonly alpha?: number;
  readonly blend?: BlendMode;
  /** Stroke width; omit for a fill. */
  readonly stroke?: number;
  readonly cap?: 'round' | 'butt' | 'square';
  readonly join?: 'round' | 'miter' | 'bevel';
  /** Gaussian mask blur sigma (soft edges, glows). */
  readonly blur?: number;
}

export const makePaint = (o: PaintOptions = {}): SkPaint => {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  if (o.color) p.setColor(Skia.Color(o.color));
  if (o.shader) p.setShader(o.shader);
  if (o.alpha !== undefined) p.setAlphaf(o.alpha);
  if (o.blend !== undefined) p.setBlendMode(o.blend);
  if (o.stroke !== undefined) {
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(o.stroke);
    p.setStrokeCap(o.cap === 'butt' ? StrokeCap.Butt : o.cap === 'square' ? StrokeCap.Square : StrokeCap.Round);
    p.setStrokeJoin(o.join === 'miter' ? StrokeJoin.Miter : o.join === 'bevel' ? StrokeJoin.Bevel : StrokeJoin.Round);
  }
  if (o.blur !== undefined && o.blur > 0) p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, o.blur, true));
  return p;
};

export const linear = (from: Pt, to: Pt, colors: readonly string[], positions?: readonly number[]): SkShader =>
  Skia.Shader.MakeLinearGradient(
    { x: from[0], y: from[1] },
    { x: to[0], y: to[1] },
    colors.map((c) => Skia.Color(c)),
    positions ? [...positions] : null,
    TileMode.Clamp,
  );

export const radial = (center: Pt, r: number, colors: readonly string[], positions?: readonly number[]): SkShader =>
  Skia.Shader.MakeRadialGradient(
    { x: center[0], y: center[1] },
    Math.max(0.001, r),
    colors.map((c) => Skia.Color(c)),
    positions ? [...positions] : null,
    TileMode.Clamp,
  );

export const svgPath = (d: string): SkPath => Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make();

export const polygon = (points: readonly Pt[], close = true): SkPath =>
  Skia.Path.Polygon(
    points.map(([x, y]) => ({ x, y })),
    close,
  );

/**
 * Smooth curve through points (Catmull–Rom converted to cubic Béziers).
 * When `closeTo` is given, the curve is closed down to that y (a ridge or silhouette).
 */
export const smoothPath = (points: readonly Pt[], closeTo?: number): SkPath => {
  const builder = Skia.PathBuilder.Make();
  const first = points[0];
  if (!first) return builder.build();
  builder.moveTo(first[0], first[1]);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    builder.cubicTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1],
    );
  }
  if (closeTo !== undefined) {
    const last = points[points.length - 1]!;
    builder.lineTo(last[0], closeTo);
    builder.lineTo(first[0], closeTo);
    builder.close();
  }
  return builder.build();
};

/** Boolean union of several paths (shapes with mixed winding merge cleanly). */
export const union = (paths: readonly SkPath[]): SkPath => {
  let out: SkPath | null = null;
  for (const path of paths) {
    out = out ? (Skia.Path.MakeFromOp(out, path, PathOp.Union) ?? out) : path;
  }
  return out ?? Skia.Path.Make();
};

/** Returns a transformed copy of a path. */
export const transformPath = (path: SkPath, matrix: SkMatrix): SkPath =>
  Skia.PathBuilder.MakeFromPath(path).transform(matrix).build();

/** Stroke outline of an open curve as a fillable path. */
export const strokeOutline = (path: SkPath, width: number): SkPath =>
  Skia.Path.Stroke(path, { width, cap: StrokeCap.Round, join: StrokeJoin.Round }) ?? Skia.Path.Make();

/** Deterministic PRNG (mulberry32) so every bake of a card is identical. */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
  };
};
export type Rng = ReturnType<typeof rng>;

/** Hex color with alpha (0–1) → #RRGGBBAA. */
export const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
};

/** Linear blend of two #RRGGBB colors. */
export const mix = (a: string, b: string, t: number): string => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + ((pb[i] ?? v) - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

export const withSave = (canvas: SkCanvas, draw: () => void): void => {
  canvas.save();
  try {
    draw();
  } finally {
    canvas.restore();
  }
};

export { BlendMode };

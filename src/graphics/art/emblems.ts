import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { BlendMode, linear, makePaint, polygon, radial, smoothPath, union, withAlpha, withSave, type Pt } from '../skia/draw';

/** Four-stop metal ramp, darkest → brightest. */
export type MetalRamp = readonly [string, string, string, string];

export const GOLD: MetalRamp = ['#4D3617', '#9C7637', '#E1BF78', '#FFF1C9'];

/** Brushed-metal fill across a bounding box, with a bright diagonal band. */
export const metalShader = (ramp: MetalRamp, x: number, y: number, w: number, h: number) =>
  linear([x, y], [x + w * 0.7, y + h], [ramp[1], ramp[3], ramp[2], ramp[1], ramp[2], ramp[0]], [0, 0.18, 0.36, 0.58, 0.8, 1]);

/**
 * The Kingdom Legends crown crest (original design), drawn in a 100 × 80 box
 * scaled to `size` and centered at `center`.
 */
export const drawCrown = (canvas: SkCanvas, center: Pt, size: number, ramp: MetalRamp = GOLD, glow = true) => {
  const s = size / 100;
  withSave(canvas, () => {
    canvas.translate(center[0] - 50 * s, center[1] - 42 * s);
    canvas.scale(s, s);
    if (glow) {
      canvas.drawCircle(50, 44, 60, makePaint({ shader: radial([50, 44], 60, [withAlpha(ramp[3], 0.35), withAlpha(ramp[2], 0)]), blend: BlendMode.Plus }));
    }
    const points = polygon([
      [10, 60],
      [5, 26],
      [24, 45],
      [31, 18],
      [43, 41],
      [50, 8],
      [57, 41],
      [69, 18],
      [76, 45],
      [95, 26],
      [90, 60],
    ]);
    const band = Skia.Path.RRect({ rect: { x: 9, y: 58, width: 82, height: 15 }, rx: 3, ry: 3 });
    const orbs = [
      Skia.Path.Circle(5, 25, 4),
      Skia.Path.Circle(31, 17, 4),
      Skia.Path.Circle(50, 7, 5),
      Skia.Path.Circle(69, 17, 4),
      Skia.Path.Circle(95, 25, 4),
    ];
    const crown = union([points, band, ...orbs]);
    // Shadow, body, engraved highlights.
    canvas.save();
    canvas.translate(0, 2.5);
    canvas.drawPath(crown, makePaint({ color: '#000000', alpha: 0.55, blur: 3 }));
    canvas.restore();
    canvas.drawPath(crown, makePaint({ shader: linear([0, 4], [0, 74], [ramp[3], ramp[2], ramp[1], ramp[0]], [0, 0.35, 0.75, 1]) }));
    canvas.drawPath(crown, makePaint({ color: ramp[3], stroke: 1.2, alpha: 0.8 }));
    canvas.drawPath(smoothPath([[14, 64], [50, 62.5], [86, 64]]), makePaint({ color: ramp[0], stroke: 1.4, alpha: 0.9 }));
    // Jewels on the band.
    for (const [x, c] of [
      [30, '#7A1F2B'],
      [50, '#1E3F7A'],
      [70, '#7A1F2B'],
    ] as const) {
      canvas.drawOval({ x: x - 4.5, y: 62, width: 9, height: 7 }, makePaint({ shader: radial([x - 1.5, 63.5], 6, ['#FFFFFF', c, '#100A08'], [0, 0.35, 1]) }));
    }
  });
};

/** A small engraved scroll ornament for frame corners, pointing into the corner at (x, y). */
export const drawCornerFlourish = (canvas: SkCanvas, x: number, y: number, flipX: boolean, flipY: boolean, size: number, color: string) => {
  withSave(canvas, () => {
    canvas.translate(x, y);
    canvas.scale(flipX ? -size / 20 : size / 20, flipY ? -size / 20 : size / 20);
    const p = makePaint({ color, stroke: 1.15 });
    canvas.drawPath(smoothPath([[0, 16], [0, 4], [4, 0], [16, 0]]), p);
    canvas.drawPath(smoothPath([[4, 12], [5, 6], [8, 4.5], [11, 6], [9.5, 9], [7, 8]]), p);
    canvas.drawCircle(2.2, 2.2, 1.4, makePaint({ color }));
  });
};

/** Diamond lattice used on card backs and pack wrappers. */
export const drawLattice = (canvas: SkCanvas, rect: { x: number; y: number; width: number; height: number }, step: number, color: string, alpha: number) => {
  const p = makePaint({ color, stroke: 0.6, alpha });
  for (let d = -rect.height; d < rect.width + rect.height; d += step) {
    canvas.drawLine(rect.x + d, rect.y, rect.x + d + rect.height, rect.y + rect.height, p);
    canvas.drawLine(rect.x + d + rect.height, rect.y, rect.x + d, rect.y + rect.height, p);
  }
};

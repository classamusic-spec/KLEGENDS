import { dustMotes, grain, sky, vignette } from '../environment';
import { body, BUILDS, capsule, garment, oval, placeFigure, robe, veil, type Pose } from '../figures';
import { drawSubject, type ArtScene, type SceneContext } from '../scene';
import { BlendMode, linear, makePaint, polygon, radial, smoothPath, withAlpha, type Pt } from '../../skia/draw';

/**
 * Esther — For Such a Time (Esther 4:14; 5:1–2). Esther, in her royal
 * robes, enters the inner court of the palace at Susa; at the far end the
 * king on his throne holds out the golden scepter. Original procedural art.
 */
const THRONE: Pt = [194, 150];

const ESTHER: Pose = {
  head: [4, -93],
  neck: [3, -85.5],
  shoulderL: [-2, -81],
  shoulderR: [5.5, -81],
  elbowL: [-5.5, -67],
  elbowR: [10, -67],
  handL: [-3, -56],
  handR: [13, -56],
  hipL: [-2, -48],
  hipR: [3.5, -48],
  kneeL: [-4.5, -24],
  kneeR: [8.5, -25],
  footL: [-8, 0],
  footR: [12, 0],
};

const KING: Pose = {
  head: [2, -80],
  neck: [1.5, -72.5],
  shoulderL: [-4, -68],
  shoulderR: [6, -68],
  elbowL: [-6, -54],
  elbowR: [14, -60],
  handL: [-1, -46],
  handR: [24, -66],
  hipL: [-3, -42],
  hipR: [4, -42],
  kneeL: [12, -40],
  kneeR: [14, -39],
  footL: [12, -12],
  footR: [15, -12],
};

const estherPath = () => {
  const s = body(ESTHER, BUILDS.woman);
  // Royal robe with a long train sweeping behind.
  s.add(robe(ESTHER, { hemY: -2.5, flare: 14, back: 18, sway: -2 }));
  s.add(smoothPath([[-6, -40], [-20, -16], [-44, -3], [-60, 1], [-30, 2], [-6, 0]]));
  s.add(veil(ESTHER.head, 6, 1, -64, 1.25));
  // A low royal crown resting on the veil.
  s.add(polygon([[-2.5, -99], [-2, -102.5], [0, -100.6], [1.8, -103.4], [3.6, -100.8], [5.4, -103.4], [7.2, -100.6], [9.2, -102.5], [9.6, -99]]));
  return placeFigure(s.build(), { x: 108, y: 268, scale: 1.48 });
};

const kingPath = () => {
  const s = body(KING, BUILDS.man);
  s.add(garment(KING, { hemY: -12, flare: 14, front: 8 }));
  s.add(polygon([[-4, -86], [-3, -93], [0, -89], [2, -95], [4, -89], [7, -93], [8, -86]])); // crown
  s.addStroke([KING.handR, [38, -80]], 1.4, false); // the golden scepter
  s.add(oval(38.5, -80.5, 2, 2));
  // The throne.
  s.add(capsule([-8, -40], [-8, -96], 5, 4));
  s.add(polygon([[-12, -40], [22, -40], [22, -34], [-12, -34]]));
  s.add(polygon([[-12, -34], [-9, -34], [-9, 0], [-12, 0]]));
  s.add(polygon([[18, -34], [21, -34], [21, 0], [18, 0]]));
  return placeFigure(s.build(), { x: 186, y: 182, scale: 0.62, flip: true });
};

/** A Persian column with a double-bull capital, drawn into a path. */
const column = (x: number, base: number, top: number, w: number) => {
  const parts = [polygon([[x - w / 2, base], [x - w / 2, top], [x + w / 2, top], [x + w / 2, base]])];
  parts.push(polygon([[x - w * 0.9, base], [x - w * 0.9, base - w * 0.5], [x + w * 0.9, base - w * 0.5], [x + w * 0.9, base]]));
  // Capital: a block flanked by two kneeling bull forms.
  const cy = top;
  parts.push(polygon([[x - w * 0.8, cy], [x - w * 0.8, cy - w * 0.9], [x + w * 0.8, cy - w * 0.9], [x + w * 0.8, cy]]));
  parts.push(smoothPath([[x - w * 0.8, cy - w * 0.9], [x - w * 2.1, cy - w * 1.3], [x - w * 2.4, cy - w * 2.0], [x - w * 1.3, cy - w * 1.9], [x, cy - w * 1.6], [x + w * 1.3, cy - w * 1.9], [x + w * 2.4, cy - w * 2.0], [x + w * 2.1, cy - w * 1.3], [x + w * 0.8, cy - w * 0.9]]));
  return parts;
};

export const esther: ArtScene = {
  key: 'esther',
  seed: 4140,
  light: '#E8C2FF',

  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    // The hall: violet shadow deepening to the edges, warm gold at the throne.
    sky(canvas, area, ['#140C22', '#2A1840', '#4A2A62', '#6C3E78', '#3A2048', '#1A0E24'], [0, 0.2, 0.42, 0.55, 0.75, 1]);
    canvas.drawCircle(THRONE[0], THRONE[1], 170, makePaint({ shader: radial(THRONE, 170, [withAlpha('#FFD9A0', 0.6), withAlpha('#C88AE0', 0.22), withAlpha('#C88AE0', 0)], [0, 0.35, 1]), blend: BlendMode.Plus }));

    // Light falling through tall openings between the columns.
    for (const [cx, w, a] of [
      [128, 26, 0.16],
      [168, 18, 0.2],
      [226, 18, 0.2],
      [266, 26, 0.16],
    ] as const) {
      canvas.drawPath(
        polygon([[cx - w * 0.3, 20], [cx + w * 0.3, 20], [cx + w, 270], [cx - w, 270]]),
        makePaint({ shader: linear([0, 20], [0, 270], [withAlpha('#FFE6C4', a), withAlpha('#FFE6C4', a * 0.3), withAlpha('#FFE6C4', 0)]), blend: BlendMode.Plus }),
      );
    }

    // The floor: polished stone with a long reflection toward the throne.
    canvas.drawRect({ x: x0, y: 182, width: x1 - x0, height: 140 }, makePaint({ shader: linear([0, 182], [0, 300], ['#3A2244', '#1E1026', '#0C0610']) }));
    for (let i = 0; i < 9; i++) {
      const y = 182 + Math.pow(i / 8, 2.1) * 118;
      canvas.drawLine(x0, y, x1, y, makePaint({ color: '#C9A2E0', stroke: 0.5, alpha: 0.12 }));
    }
    for (let i = -8; i <= 8; i++) {
      canvas.drawLine(THRONE[0], 182, THRONE[0] + i * 46, 300, makePaint({ color: '#C9A2E0', stroke: 0.5, alpha: 0.1 }));
    }
    canvas.drawPath(polygon([[THRONE[0] - 10, 182], [THRONE[0] + 10, 182], [THRONE[0] + 40, 300], [THRONE[0] - 40, 300]]), makePaint({ shader: linear([0, 182], [0, 300], [withAlpha('#FFD9A0', 0.45), withAlpha('#FFD9A0', 0)]), blend: BlendMode.Plus }));

    // Rows of columns receding toward the throne.
    const rows: [number, number, number, number][] = [
      [150, 182, 46, 4.2],
      [238, 182, 46, 4.2],
      [118, 196, 34, 6.2],
      [270, 196, 34, 6.2],
      [72, 222, 16, 9.5],
      [316, 222, 16, 9.5],
      [16, 262, -6, 14],
    ];
    for (const [x, base, top, w] of rows) {
      const shade = Math.min(1, (base - 170) / 100);
      for (const part of column(x, base, top, w)) {
        canvas.drawPath(part, makePaint({ shader: linear([x - w, 0], [x + w, 0], [withAlpha('#120A18', 0.95), withAlpha('#3A2448', 0.95 - shade * 0.4), withAlpha('#120A18', 0.95)]) }));
      }
    }
    // Canopy above the throne.
    canvas.drawPath(polygon([[THRONE[0] - 26, 112], [THRONE[0] + 26, 112], [THRONE[0] + 20, 104], [THRONE[0] - 20, 104]]), makePaint({ color: '#2A1636' }));
    for (let i = 0; i < 7; i++) canvas.drawLine(THRONE[0] - 24 + i * 8, 112, THRONE[0] - 22 + i * 8, 118, makePaint({ color: '#FFD08A', stroke: 0.8, alpha: 0.6 }));
  },

  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    drawSubject(ctx, kingPath(), { fill: '#1A0F20', fillLit: '#3A2440', rim: '#FFD9A0', lightDir: [0, -1], rimWidth: 0.6, glow: 1.5 });
    if (mode === 'full') {
      // The golden scepter catches the light.
      canvas.drawCircle(THRONE[0] - 22, 132, 7, makePaint({ shader: radial([THRONE[0] - 22, 132], 7, [withAlpha('#FFE6A8', 0.9), withAlpha('#FFE6A8', 0)]), blend: BlendMode.Plus }));
    }
    drawSubject(ctx, estherPath(), { fill: '#150B1C', fillLit: '#4A2C58', rim: '#F0D2FF', lightDir: [1, -0.6], rimWidth: 1.1, glow: 1.4 });
    if (mode === 'full') {
      dustMotes(canvas, rand, { x: 120, y: 60, width: 160, height: 190 }, 34, '#FFE6C4', 0.9);
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.55);
    }
  },
};

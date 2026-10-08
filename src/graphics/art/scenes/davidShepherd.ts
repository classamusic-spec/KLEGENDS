import { dustMotes, grain, haze, ridge, ridgePoints, sky, stars, vignette } from '../environment';
import { body, BUILDS, crook, curlyHair, garment, oval, placeFigure, sheep, type Pose } from '../figures';
import { drawProp, drawSubject, type ArtScene, type SceneContext } from '../scene';
import { PathOp, Skia } from '@shopify/react-native-skia';

import { BlendMode, linear, makePaint, radial, smoothPath, withAlpha, type Pt } from '../../skia/draw';

/**
 * David — The Shepherd (1 Samuel 16). Dusk on the hills outside Bethlehem:
 * the youngest son of Jesse keeps watch over the flock, crook in hand,
 * while lamps are lit in the town beyond. Original procedural art.
 */
const GLOW: Pt = [200, 182];

const DAVID: Pose = {
  head: [4.5, -92],
  neck: [3.2, -84.5],
  shoulderL: [-2, -80],
  shoulderR: [6, -80],
  elbowL: [-5.5, -65],
  elbowR: [14, -71],
  handL: [-4.5, -52],
  handR: [19, -63],
  hipL: [-2.5, -47],
  hipR: [3.5, -47],
  kneeL: [-4.5, -24],
  kneeR: [8, -24],
  footL: [-6.5, 0],
  footR: [10, 0],
};

const davidPath = () => {
  const s = body(DAVID, BUILDS.youth);
  s.add(garment(DAVID, { hemY: -25, flare: 9.5, back: 2 }));
  // A short mantle over one shoulder.
  s.add(
    smoothPath([
      [-1.5, -82],
      [-7, -76],
      [-9.5, -62],
      [-6, -60],
      [-2, -70],
      [4, -80],
      [-1.5, -82],
    ]),
  );
  s.add(curlyHair(DAVID.head, 6.3, 1));
  s.add(oval(-6, -41, 4, 5)); // shepherd's bag
  s.add(crook([21.5, 1.5], [17.5, -110], 1.9, 5));
  return placeFigure(s.build(), { x: 104, y: 238, scale: 1.3 });
};

const flock: readonly { x: number; y: number; s: number; flip?: boolean; grazing?: boolean }[] = [
  { x: 196, y: 228, s: 0.62, grazing: true },
  { x: 234, y: 232, s: 0.7, flip: true },
  { x: 262, y: 226, s: 0.56, grazing: true, flip: true },
  { x: 172, y: 252, s: 0.86, grazing: true },
  { x: 222, y: 262, s: 1.0, flip: true, grazing: true },
  { x: 50, y: 262, s: 0.95 },
];

export const davidShepherd: ArtScene = {
  key: 'david-shepherd',
  seed: 1611,
  light: '#FFC27A',

  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    sky(canvas, area, ['#0B1024', '#1B2346', '#3A3560', '#7C5468', '#D38B5E', '#F2BE7A'], [0, 0.25, 0.42, 0.55, 0.64, 0.7]);
    stars(canvas, rand, { x: area.x, y: area.y, width: area.width, height: 110 }, 46, '#EAF0FF');
    // A thin crescent moon.
    const moon: Pt = [74, 62];
    canvas.drawCircle(moon[0], moon[1], 30, makePaint({ shader: radial(moon, 30, [withAlpha('#DDE6FF', 0.22), withAlpha('#DDE6FF', 0)]) }));
    const crescent = Skia.Path.MakeFromOp(Skia.Path.Circle(moon[0], moon[1], 8), Skia.Path.Circle(moon[0] + 3.6, moon[1] - 2.2, 7.2), PathOp.Difference);
    if (crescent) canvas.drawPath(crescent, makePaint({ color: '#F4F1E4' }));
    canvas.drawCircle(GLOW[0], GLOW[1], 150, makePaint({ shader: radial(GLOW, 150, [withAlpha('#FFC27A', 0.35), withAlpha('#FFC27A', 0)]), blend: BlendMode.Plus }));

    // Far hills, and Bethlehem on its ridge with lamps lit.
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 186, amp: 8, steps: 10 }), 320, '#5A4A6A', '#3E3452');
    haze(canvas, area, 190, 26, '#F2B276', 0.45);
    const townRidge = ridgePoints(rand, { x0, x1, baseY: 198, amp: 9, steps: 9, peaks: [[226, 184]] });
    ridge(canvas, townRidge, 320, '#3A2E44', '#251E30');
    for (let i = 0; i < 16; i++) {
      const x = 196 + i * 4.4 + rand.range(-1, 1);
      const w = rand.range(4, 7);
      const h = rand.range(4, 9) * (1 - Math.abs(i - 7.5) / 12);
      const y = 188 - h + Math.abs(i - 7.5) * 0.7;
      canvas.drawRect({ x, y, width: w, height: h + 6 }, makePaint({ color: '#221A2C' }));
      if (rand.next() > 0.55) {
        const wx = x + rand.range(1, w - 2);
        const wy = y + rand.range(1.5, h);
        canvas.drawRect({ x: wx, y: wy, width: 1.2, height: 1.4 }, makePaint({ color: '#FFD08A' }));
        canvas.drawCircle(wx + 0.6, wy + 0.7, 3, makePaint({ shader: radial([wx + 0.6, wy + 0.7], 3, [withAlpha('#FFC070', 0.5), withAlpha('#FFC070', 0)]), blend: BlendMode.Plus }));
      }
    }

    // The near pasture where the flock grazes.
    const pasture = ridgePoints(rand, { x0, x1, baseY: 226, amp: 7, steps: 8, peaks: [[100, 236]] });
    canvas.drawPath(smoothPath(pasture, 420), makePaint({ shader: linear([0, 214], [0, 300], ['#4A3A3A', '#231B22', '#0E0B10']) }));
    canvas.drawPath(smoothPath(pasture, 420), makePaint({ shader: radial(GLOW, 180, [withAlpha('#E8A066', 0.32), withAlpha('#E8A066', 0)]), blend: BlendMode.Plus }));
  },

  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    const light = { fill: '#120D12', fillLit: '#3A2A2C', rim: '#FFCF94', lightDir: [1, -0.15] as Pt, rimWidth: 1, glow: 2 };
    for (const lamb of flock.slice(0, 3)) {
      drawSubject(ctx, placeFigure(sheep(lamb.grazing), { x: lamb.x, y: lamb.y, scale: lamb.s, flip: lamb.flip }), { ...light, fillLit: '#2A2024', rimWidth: 0.6, glow: 0 });
    }

    // The rock David stands on.
    const rock = smoothPath([[44, 246], [70, 232], [112, 230], [146, 238], [160, 252], [40, 262]], 300);
    drawProp(ctx, rock, makePaint({ shader: linear([0, 230], [0, 270], ['#3C2D2E', '#120D10']) }));
    if (mode === 'full') canvas.drawPath(smoothPath([[70, 232], [112, 230], [146, 238]]), makePaint({ color: '#F0B27A', stroke: 1, alpha: 0.5 }));

    drawSubject(ctx, davidPath(), light);

    for (const lamb of flock.slice(3)) {
      drawSubject(ctx, placeFigure(sheep(lamb.grazing), { x: lamb.x, y: lamb.y, scale: lamb.s, flip: lamb.flip }), { ...light, fillLit: '#2E2226', rimWidth: 0.8, glow: 0 });
    }

    // Grass along the bottom edge.
    for (let i = 0; i < 40; i++) {
      const x = rand.range(area.x - 5, area.x + area.width + 5);
      const y = rand.range(276, 300);
      const h = rand.range(5, 12);
      const lean = rand.range(-3, 3);
      canvas.drawPath(smoothPath([[x, y], [x + lean * 0.4, y - h * 0.6], [x + lean, y - h]]), makePaint({ color: mode === 'silhouette' ? '#0B0C10' : '#1C1418', stroke: rand.range(0.6, 1.2) }));
    }

    if (mode === 'full') {
      dustMotes(canvas, rand, { x: 150, y: 150, width: 140, height: 100 }, 14, '#FFD9A0', 0.8);
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.55);
    }
  },
};

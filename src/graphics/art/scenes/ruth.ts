import { dustMotes, godRays, grain, haze, ridge, ridgePoints, sky, sunGlow, vignette } from '../environment';
import { body, BUILDS, oliveTree, placeFigure, robe, veil, capsule, type Pose } from '../figures';
import { drawSubject, type ArtScene, type SceneContext } from '../scene';
import { BlendMode, linear, makePaint, radial, smoothPath, withAlpha, type Pt } from '../../skia/draw';

/**
 * Ruth — Where You Go (Ruth 1:16). Ruth will not leave Naomi: the two
 * widows walk the road from Moab toward Bethlehem, into the evening sun
 * (Bethlehem lies west of Moab). Ruth keeps a hand on Naomi's shoulder.
 * Original procedural art.
 */
const SUN: Pt = [232, 150];

const NAOMI: Pose = {
  head: [8.5, -87.5],
  neck: [5.8, -80.5],
  shoulderL: [0.5, -76.5],
  shoulderR: [7.5, -76.5],
  elbowL: [-1.5, -62],
  elbowR: [15, -64],
  handL: [1.5, -51],
  handR: [21, -57],
  hipL: [-1, -45],
  hipR: [4.5, -45],
  kneeL: [-5, -23],
  kneeR: [11, -23],
  footL: [-10, 0],
  footR: [14, 0],
};

const RUTH: Pose = {
  head: [4, -92.5],
  neck: [2.8, -85],
  shoulderL: [-2, -80.5],
  shoulderR: [5.5, -80.5],
  elbowL: [-4.5, -66],
  elbowR: [14, -73],
  handL: [-3, -54],
  handR: [24, -75],
  hipL: [-2, -47],
  hipR: [3.5, -47],
  kneeL: [-7.5, -24],
  kneeR: [10, -25],
  footL: [-12.5, 0],
  footR: [14.5, 0],
};

const naomiPath = () => {
  const s = body(NAOMI, BUILDS.woman);
  s.add(robe(NAOMI, { hemY: -4.5, flare: 12.5, back: 3, sway: 1 }));
  s.add(veil(NAOMI.head, 6.1, 1, -50, 1.05));
  // A traveler's staff and a bundle on the back.
  s.add(capsule([25.5, 1], [19.5, -97], 1.9, 1.7));
  s.add(capsule([-7, -70], [-9, -56], 9.5, 8.5));
  return placeFigure(s.build(), { x: 164, y: 241, scale: 1.18 });
};

const ruthPath = () => {
  const s = body(RUTH, BUILDS.woman);
  s.add(robe(RUTH, { hemY: -5, flare: 13.5, back: 4, sway: 1.5 }));
  s.add(veil(RUTH.head, 6.1, 1, -58, 1.1));
  return placeFigure(s.build(), { x: 126, y: 246, scale: 1.22 });
};

export const ruth: ArtScene = {
  key: 'ruth',
  seed: 1416,
  light: '#FFC98A',

  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    sky(canvas, area, ['#211726', '#4B2E3D', '#94505A', '#D98A62', '#F4C27F', '#FCE2A8'], [0, 0.2, 0.38, 0.5, 0.6, 0.66]);
    sunGlow(canvas, SUN, { radius: 13, halo: '#FFB774', core: '#FFF1D2' });
    godRays(canvas, rand, SUN, { count: 18, length: 320, angle: -2.6, spread: 2.4, color: '#FFDDA8', alpha: 0.12, width: 0.035 });
    // Long, thin evening clouds lit from below.
    for (const [cy, w, a] of [
      [62, 150, 0.35],
      [92, 110, 0.28],
      [118, 80, 0.22],
    ] as const) {
      const cx = rand.range(70, 200);
      canvas.drawOval({ x: cx - w / 2, y: cy - 3, width: w, height: 6 }, makePaint({ shader: linear([0, cy - 3], [0, cy + 3], [withAlpha('#2E1E2C', a + 0.2), withAlpha('#FFB37A', a)]), blur: 1.2 }));
    }

    // The hills of Judah ahead, softened by evening haze.
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 168, amp: 9, steps: 10, peaks: [[250, 160]] }), 320, '#B9767A', '#9A6070');
    haze(canvas, area, 172, 40, '#FFD39A', 0.55);
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 192, amp: 10, steps: 9 }), 320, '#7C4A55', '#5A3442');
    haze(canvas, area, 196, 22, '#FFC98A', 0.3);

    // Fields falling away to the road.
    const land = ridgePoints(rand, { x0, x1, baseY: 214, amp: 5, steps: 8 });
    canvas.drawPath(smoothPath(land, 420), makePaint({ shader: linear([0, 205], [0, 300], ['#5A3A33', '#2C1C1E', '#120C10']) }));

    // The road from the foreground toward the sun, catching the light.
    const road = smoothPath([
      [40, 300],
      [92, 268],
      [148, 244],
      [196, 222],
      [226, 212],
      [244, 211],
      [238, 213],
      [210, 224],
      [176, 246],
      [140, 276],
      [118, 300],
    ]);
    canvas.drawPath(road, makePaint({ shader: linear([0, 300], [0, 210], ['#3B2A27', '#8A5C45', '#E7AF7A']) }));
    canvas.drawPath(road, makePaint({ shader: radial(SUN, 120, [withAlpha('#FFD9A0', 0.55), withAlpha('#FFD9A0', 0)]), blend: BlendMode.Plus }));
  },

  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    const light = { fill: '#170E12', fillLit: '#4A2D2C', rim: '#FFD7A0', lightDir: [1, -0.25] as Pt, rimWidth: 1.1, glow: 2.2 };

    // An olive tree at the roadside, framing the travelers.
    const tree = placeFigure(oliveTree(rand, 128), { x: 30, y: 268, scale: 1 });
    drawSubject(ctx, tree, { ...light, fill: '#110A0D', fillLit: '#24171A', rimWidth: 0.7, glow: 0 });

    drawSubject(ctx, naomiPath(), light);
    drawSubject(ctx, ruthPath(), { ...light, rimWidth: 1.2 });

    // Foreground grasses.
    for (let i = 0; i < 46; i++) {
      const x = rand.range(area.x - 5, area.x + area.width + 5);
      const y = rand.range(272, 300);
      const h = rand.range(5, 14);
      const lean = rand.range(-3, 4);
      canvas.drawPath(
        smoothPath([[x, y], [x + lean * 0.4, y - h * 0.6], [x + lean, y - h]]),
        makePaint({ color: mode === 'silhouette' ? '#0B0C10' : rand.next() > 0.6 ? '#C88E62' : '#2A1A18', stroke: rand.range(0.6, 1.3), alpha: 0.9 }),
      );
    }

    if (mode === 'full') {
      dustMotes(canvas, rand, { x: 150, y: 120, width: 140, height: 120 }, 24, '#FFDDA8', 0.9);
      canvas.drawCircle(SUN[0], SUN[1], 110, makePaint({ shader: radial(SUN, 110, [withAlpha('#FFC98A', 0.18), withAlpha('#FFC98A', 0)]), blend: BlendMode.Plus }));
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.5);
    }
  },
};

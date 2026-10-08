import { cloudBank, dustMotes, godRays, grain, haze, ridge, ridgePoints, sky, sunGlow, vignette } from '../environment';
import { body, BUILDS, capsule, garment, oval, placeFigure, type Pose } from '../figures';
import { drawProp, drawSubject, type ArtScene, type SceneContext } from '../scene';
import { BlendMode, linear, makePaint, polygon, radial, smoothPath, withAlpha, type Pt } from '../../skia/draw';

/**
 * Joshua — Strong and Courageous (Joshua 1). At first light Joshua stands
 * above the Jordan, looking toward the land he has been told to enter;
 * Israel's tents fill the plain below. Original procedural art.
 */
const SUN: Pt = [222, 148];

const JOSHUA: Pose = {
  head: [5, -92],
  neck: [3.6, -84.5],
  shoulderL: [-3, -80],
  shoulderR: [8, -80],
  elbowL: [-9, -66],
  elbowR: [16, -76],
  handL: [-4, -55],
  handR: [21, -94],
  hipL: [-3, -47],
  hipR: [5, -47],
  kneeL: [-9, -24],
  kneeR: [12, -24],
  footL: [-14, 0],
  footR: [17, 0],
};

const joshuaPath = () => {
  const s = body(JOSHUA, BUILDS.man);
  s.add(garment(JOSHUA, { hemY: -26, flare: 11 }));
  // Cloak streaming back in the dawn wind.
  s.add(
    smoothPath([
      [-2, -83],
      [-14, -78],
      [-28, -60],
      [-36, -40],
      [-26, -44],
      [-18, -38],
      [-10, -56],
      [6, -81],
      [-2, -83],
    ]),
  );
  s.add(oval(5, -95.5, 6.9, 5)); // head cloth
  s.add(capsule([-4, -48], [6, -48], 6, 6)); // belt
  // Spear held upright, butt planted on the rock.
  s.add(capsule([23, 1], [21, -132], 2.1, 1.8));
  s.add(polygon([[21, -146], [24.2, -133], [21, -129], [17.8, -133]]));
  s.add(capsule([-11, -52], [-19, -38], 2.6, 2.2)); // sword at the hip
  return placeFigure(s.build(), { x: 86, y: 216, scale: 1.34 });
};

export const joshua: ArtScene = {
  key: 'joshua',
  seed: 1909,
  light: '#CFE0FF',

  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    sky(canvas, area, ['#0E1830', '#25395E', '#5A7092', '#B7BBC8', '#F2D7B0', '#FFF0D6'], [0, 0.22, 0.4, 0.52, 0.6, 0.66]);
    sunGlow(canvas, SUN, { radius: 11, halo: '#FFE2B8', core: '#FFFBF0' });
    godRays(canvas, rand, SUN, { count: 16, length: 300, angle: -2.2, spread: 2.6, color: '#E8F0FF', alpha: 0.13, width: 0.03 });
    cloudBank(canvas, rand, { x0: 120, x1: 290, y: 78, puffs: 8, size: 9, body: '#3A4A6A', lit: '#F6E2C2', light: SUN, litAlpha: 0.8 });
    cloudBank(canvas, rand, { x0: -10, x1: 110, y: 104, puffs: 6, size: 7, body: '#2C3A58', lit: '#D8DEEA', light: SUN, litAlpha: 0.6 });

    // The land across the Jordan: layered hills in cool morning haze.
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 160, amp: 8, steps: 10 }), 320, '#8C98B2', '#7884A0');
    haze(canvas, area, 164, 30, '#F4E4CC', 0.6);
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 178, amp: 9, steps: 9, peaks: [[250, 170]] }), 320, '#5D6A88', '#4A5674');
    haze(canvas, area, 182, 16, '#E6E8F2', 0.35);

    // The plain, the river and the camp of Israel.
    canvas.drawRect({ x: x0, y: 186, width: x1 - x0, height: 140 }, makePaint({ shader: linear([0, 186], [0, 300], ['#4C5470', '#2A3048', '#141826']) }));
    const river = smoothPath([
      [x0, 214],
      [70, 207],
      [130, 212],
      [196, 203],
      [x1, 206],
      [x1, 209.5],
      [196, 207],
      [130, 216.5],
      [70, 211.5],
      [x0, 219],
    ]);
    canvas.drawPath(river, makePaint({ shader: linear([0, 200], [0, 222], ['#C9D2E4', '#7F92B6']) }));
    canvas.drawPath(river, makePaint({ shader: radial(SUN, 140, [withAlpha('#FFF6E6', 0.45), withAlpha('#FFF6E6', 0)]), blend: BlendMode.Plus }));
    for (let i = 0; i < 70; i++) {
      const x = rand.range(120, 300);
      const y = rand.range(222, 246);
      const s = rand.range(1.6, 3.2) * (0.7 + (y - 222) / 40);
      canvas.drawPath(polygon([[x - s, y], [x, y - s * 0.9], [x + s, y]]), makePaint({ color: '#1C2134', alpha: 0.9 }));
      if (rand.next() > 0.85) canvas.drawCircle(x, y - s * 0.3, 0.8, makePaint({ color: '#FFD9A0' }));
    }
  },

  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    // The rocky height Joshua stands on.
    const cliff = smoothPath([[-30, 214], [40, 210], [96, 214], [128, 226], [150, 252], [160, 300], [-30, 300]], 320);
    drawProp(ctx, cliff, makePaint({ shader: linear([0, 210], [0, 300], ['#2C3448', '#10131E']) }));
    if (mode === 'full') canvas.drawPath(smoothPath([[40, 210], [96, 214], [128, 226]]), makePaint({ color: '#E6E2DA', stroke: 1, alpha: 0.55 }));

    drawSubject(ctx, joshuaPath(), { fill: '#0E1220', fillLit: '#2C3550', rim: '#F4EEDC', lightDir: [1, -0.3], rimWidth: 1.1, glow: 1.2 });

    if (mode === 'full') {
      dustMotes(canvas, rand, { x: 140, y: 110, width: 150, height: 110 }, 18, '#F4F0FF', 0.8);
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.5);
    }
  },
};

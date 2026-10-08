import { cloudBank, dustMotes, godRays, grain, haze, ridge, ridgePoints, sky, sunGlow, vignette, water } from '../environment';
import { body, BUILDS, capsule, curlyHair, garment, oval, placeFigure, stripSkirt, type Pose } from '../figures';
import { drawSubject, type ArtScene, type SceneContext } from '../scene';
import { BlendMode, linear, makePaint, polygon, radial, smoothPath, withAlpha, type Pt } from '../../skia/draw';

/**
 * David — The Giant Slayer (1 Samuel 17). Full-art Legendary.
 * Sunrise over the Valley of Elah: Goliath, preceded by his shield-bearer
 * (17:7), looms against the sun; David whirls his sling in the foreground.
 * Original procedural art — a temporary placeholder pending commissioned
 * illustration.
 */
const SUN: Pt = [236, 182];

const DAVID_POSE: Pose = {
  head: [7.5, -91.5],
  neck: [5.2, -83.5],
  shoulderL: [1.5, -79],
  shoulderR: [6, -79.5],
  elbowL: [15, -71],
  elbowR: [-1.5, -98.5],
  handL: [24.5, -62.5],
  handR: [-8.5, -112],
  hipL: [-2.5, -46],
  hipR: [3.5, -46.5],
  kneeL: [-9.5, -23.5],
  kneeR: [13.5, -24.5],
  footL: [-16, 0],
  footR: [17.5, -0.5],
};

const GOLIATH_POSE: Pose = {
  head: [6.5, -91],
  neck: [4.5, -84],
  shoulderL: [-6, -79],
  shoulderR: [10.5, -79.5],
  elbowL: [-14, -63],
  elbowR: [18, -66],
  handL: [-11, -50],
  handR: [22.5, -57],
  hipL: [-5.5, -47],
  hipR: [6, -47],
  kneeL: [-11, -24],
  kneeR: [11.5, -24.5],
  footL: [-15, 0],
  footR: [16, 0],
};

const BEARER_POSE: Pose = {
  head: [2.5, -92],
  neck: [1.8, -84],
  shoulderL: [-2.5, -79.5],
  shoulderR: [5, -79.5],
  elbowL: [8, -70],
  elbowR: [11, -68],
  handL: [13, -64],
  handR: [15, -60],
  hipL: [-2.5, -47],
  hipR: [3.5, -47],
  kneeL: [-8, -23.5],
  kneeR: [10.5, -24],
  footL: [-14, 0],
  footR: [15, 0],
};

const davidPath = () => {
  const s = body(DAVID_POSE, BUILDS.youth);
  s.add(garment(DAVID_POSE, { hemY: -24, flare: 11, back: 4, front: 0.5, sway: -1 }));
  s.add(curlyHair(DAVID_POSE.head, 6.3, 1));
  s.add(oval(-5.5, -42, 4, 5.2)); // shepherd's bag
  s.addStroke([[-3, -79], [-6, -60], [-5.5, -46]], 1.1); // bag strap
  s.addStroke([DAVID_POSE.handR, [-20, -118], [-31, -121.5]], 0.85);
  s.addStroke([DAVID_POSE.handR, [-19, -115], [-31, -121.5]], 0.7);
  s.add(oval(-31.5, -121.4, 3.2, 2.3)); // sling pouch
  return placeFigure(s.build(), { x: 74, y: 330, scale: 1.42 });
};

const goliathPath = () => {
  const s = body(GOLIATH_POSE, BUILDS.giant);
  // Bronze breastplate over a scale coat, with a skirt of leather strips.
  s.add(garment(GOLIATH_POSE, { hemY: -40, flare: 12, back: 1, front: 1 }));
  s.add(stripSkirt(GOLIATH_POSE, { top: -46, bottom: -28, flare: 14, strips: 7 }));
  s.add(capsule([-8.5, -79], [-4.5, -75], 11, 8));
  s.add(capsule([13, -79.5], [9, -75], 11, 8));
  // Greaves.
  s.add(capsule([-11.2, -22], [-14.6, -4], 10.4, 9));
  s.add(capsule([11.8, -22], [15.6, -4], 10.4, 9));
  // Bronze helmet with cheek guards and a sweeping horsehair crest.
  s.add(oval(6.8, -95, 8.6, 7.8));
  s.add(capsule([10, -91], [12, -85], 3, 2.4));
  s.addStroke([[12.5, -99], [8, -105.5], [1, -106.5], [-5, -102.5], [-9, -96], [-11.5, -88]], 3.6);
  // Javelin slung across the back, tip showing above the far shoulder.
  s.addStroke([[-14, -66], [-3, -97]], 2.2, false);
  // Spear with a shaft like a weaver's beam.
  s.add(capsule([25, 1], [25, -116], 3.8, 3.2));
  s.add(polygon([[25, -131], [28.8, -118], [25, -113.5], [21.2, -118]]));
  // Sword at the hip.
  s.addStroke([[-12, -50], [-19.5, -32]], 3.2, false);
  return placeFigure(s.build(), { x: 214, y: 292, scale: 2.0, flip: true });
};

const bearerPath = () => {
  const s = body(BEARER_POSE, BUILDS.man);
  s.add(garment(BEARER_POSE, { hemY: -26, flare: 10 }));
  s.add(oval(2.5, -94.5, 7.2, 5.6)); // cap
  // The great shield carried before Goliath.
  s.add(oval(17, -58, 9.5, 21));
  return placeFigure(s.build(), { x: 160, y: 296, scale: 1.02, flip: true });
};

export const davidGiantSlayer: ArtScene = {
  key: 'david-giant-slayer',
  seed: 1717,
  light: '#FFD27A',

  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    sky(canvas, area, ['#1A100A', '#43281A', '#93592B', '#DE9F55', '#F7D894', '#FFEDC2'], [0, 0.17, 0.4, 0.58, 0.68, 0.74]);
    sunGlow(canvas, SUN, { radius: 15, halo: '#FFC46A', core: '#FFF6DC' });
    godRays(canvas, rand, SUN, { count: 22, length: 440, angle: -1.95, spread: 3.0, color: '#FFE3A6', alpha: 0.16, width: 0.03 });
    cloudBank(canvas, rand, { x0: -20, x1: 130, y: 80, puffs: 9, size: 12, body: '#2E1C12', lit: '#F0B565', light: SUN });
    cloudBank(canvas, rand, { x0: 96, x1: 214, y: 116, puffs: 7, size: 9, body: '#4A2E1B', lit: '#FFC979', light: SUN });
    cloudBank(canvas, rand, { x0: 236, x1: 334, y: 90, puffs: 6, size: 11, body: '#3A2416', lit: '#FFD38A', light: SUN });
    cloudBank(canvas, rand, { x0: 262, x1: 326, y: 150, puffs: 5, size: 6, body: '#7A4A26', lit: '#FFE2A6', light: SUN });

    // Distant ridges of the Valley of Elah with atmospheric perspective.
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 260, amp: 12, steps: 11 }), 360, '#CD965D', '#B98552');
    haze(canvas, area, 266, 42, '#FFE0A8', 0.6);
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 278, amp: 11, steps: 10, peaks: [[20, 252], [250, 268]] }), 360, '#7E4E2A', '#4E2F18');

    // The two armies along the ridges: tents and spear points.
    const camp = (from: number, to: number, y: number, color: string) => {
      for (let x = from; x < to; x += rand.range(4.5, 8.5)) {
        const h = rand.range(2.2, 4);
        canvas.drawPath(polygon([[x, y], [x + h * 0.9, y - h], [x + h * 1.8, y]]), makePaint({ color, alpha: 0.85 }));
        if (rand.next() > 0.45) canvas.drawLine(x + 1, y, x + 1.2, y - h - rand.range(3, 6.5), makePaint({ color, stroke: 0.55, alpha: 0.8 }));
      }
    };
    camp(2, 64, 255, '#4E2F1A');
    camp(238, 304, 270, '#3E2615');

    // Valley floor, the brook, and its smooth stones.
    const floor = ridgePoints(rand, { x0, x1, baseY: 297, amp: 3, steps: 8 });
    canvas.drawPath(smoothPath(floor, 440), makePaint({ shader: linear([0, 290], [0, 420], ['#3E2716', '#1E140C', '#0A0705']) }));
    haze(canvas, area, 296, 18, '#FFCF8A', 0.35);
    water(canvas, rand, { x: x0, y: 318, width: x1 - x0, height: 15 }, { top: '#F4C57C', bottom: '#8E5D2D', glint: '#FFF5D8', glints: 40 });
    canvas.drawRect({ x: x0, y: 316, width: x1 - x0, height: 2.6 }, makePaint({ color: '#1E140C', alpha: 0.65 }));
    for (let i = 0; i < 11; i++) {
      const x = rand.range(14, 296);
      const y = rand.range(327, 340);
      const r = rand.range(2, 3.8);
      canvas.drawOval({ x: x - r * 1.4, y: y - r, width: r * 2.8, height: r * 2 }, makePaint({ shader: radial([x - r * 0.4, y - r * 0.6], r * 1.7, ['#C9A880', '#5A4029', '#2A1D12']) }));
    }
  },

  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    const giantLight = { fill: '#120C08', fillLit: '#3A2617', rim: '#FFDFA0', lightDir: [0.55, -0.85] as Pt, rimWidth: 1.3, glow: 4.5 };
    drawSubject(ctx, goliathPath(), giantLight);
    drawSubject(ctx, bearerPath(), { ...giantLight, rimWidth: 0.9, glow: 3 });

    // Foreground rocks framing David.
    const rocks = smoothPath([[-30, 340], [4, 324], [36, 327], [62, 338], [76, 356], [-30, 366]], 450);
    canvas.drawPath(rocks, makePaint({ shader: linear([0, 340], [0, 400], ['#2A1B10', '#0A0705']) }));

    if (mode === 'full') {
      // The sling's whirl: a fading arc of light around the raised hand.
      const center: Pt = [74 - 8.5 * 1.42 - 4, 330 - 116 * 1.42];
      for (let i = 0; i < 28; i++) {
        const t0 = Math.PI * 0.12 + i * 0.18;
        const a = (i + 1) / 28;
        const p0: Pt = [center[0] + Math.cos(t0) * 35, center[1] + Math.sin(t0) * 8.5];
        const p1: Pt = [center[0] + Math.cos(t0 + 0.18) * 35, center[1] + Math.sin(t0 + 0.18) * 8.5];
        canvas.drawLine(p0[0], p0[1], p1[0], p1[1], makePaint({ color: '#FFE6B0', alpha: 0.04 + a * 0.5, stroke: 0.5 + a * 1.1, blend: BlendMode.Plus }));
      }
    }
    drawSubject(ctx, davidPath(), { fill: '#140D08', fillLit: '#4A2F1B', rim: '#FFE0A2', lightDir: [1, -0.32], rimWidth: 1.4, glow: 5 });

    if (mode === 'full') {
      dustMotes(canvas, rand, { x: 120, y: 120, width: 190, height: 170 }, 26, '#FFE1A6', 0.9);
      dustMotes(canvas, rand, { x: area.x, y: 250, width: area.width, height: 80 }, 12, '#FFE1A6', 0.7);
      canvas.drawCircle(SUN[0], SUN[1], 120, makePaint({ shader: radial(SUN, 120, [withAlpha('#FFD58A', 0.16), withAlpha('#FFD58A', 0)]), blend: BlendMode.Plus }));
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.5);
    }
  },
};


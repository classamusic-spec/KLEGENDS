import { Skia, type SkPath } from '@shopify/react-native-skia';

import { cloudBank, dustMotes, godRays, grain, haze, ridge, ridgePoints, sky, stars, sunGlow, vignette, water } from '../environment';
import { body, BUILDS, capsule, curlyHair, garment, oval, placeFigure, robe, sheep, Silhouette, type Pose } from '../figures';
import { drawProp, drawSubject, type ArtScene, type SceneContext } from '../scene';
import { BlendMode, linear, makePaint, polygon, radial, smoothPath, union, withAlpha, type Pt } from '../../skia/draw';

/**
 * Six further Kingdom Discovery scenes. In Milestone 1 these cards can only
 * be seen undiscovered, so their subjects are composed to read clearly as
 * silhouettes. Original procedural art.
 */

// ── Shared shapes ──────────────────────────────────────────────────────────

const STANDING: Pose = {
  head: [4, -92],
  neck: [3, -84.5],
  shoulderL: [-2.5, -80],
  shoulderR: [6, -80],
  elbowL: [-5, -65],
  elbowR: [13, -68],
  handL: [-3.5, -53],
  handR: [17, -58],
  hipL: [-2.5, -47],
  hipR: [3.5, -47],
  kneeL: [-4.5, -24],
  kneeR: [8, -24],
  footL: [-7, 0],
  footR: [10, 0],
};

/** Arms raised high (prayer, command). */
const ARMS_RAISED: Pose = {
  ...STANDING,
  elbowL: [-9, -98],
  handL: [-12, -114],
  elbowR: [15, -98],
  handR: [20, -114],
};

const beard = (head: Pt, r: number, facing: 1 | -1): SkPath =>
  smoothPath([
    [head[0] + r * 0.2 * facing, head[1] + r * 0.4],
    [head[0] + r * 1.05 * facing, head[1] + r * 0.6],
    [head[0] + r * 0.9 * facing, head[1] + r * 1.9],
    [head[0] + r * 0.1 * facing, head[1] + r * 1.5],
    [head[0] + r * 0.2 * facing, head[1] + r * 0.4],
  ]);

/** A lion (feet on y = 0, facing +x, ~50 units long). `lying` folds the legs. */
const lion = (lying = false): SkPath => {
  const s = new Silhouette();
  const y = lying ? 7 : 0;
  s.add(capsule([-15, -17 + y], [8, -19 + y], 19, 21)); // body
  s.add(oval(-12, -15 + y, 10, 9)); // haunch
  s.add(Skia.Path.Circle(16, -26 + y, 12.5)); // mane
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI * 1.05 + (i / 10) * Math.PI * 1.7;
    s.add(oval(16 + Math.cos(a) * 11.5, -26 + y + Math.sin(a) * 11.5, 4.8, 3.6));
  }
  s.add(oval(26, -21 + y, 6, 4.8)); // muzzle
  s.add(oval(24.5, -14.5 + y, 3.6, 2.4)); // jaw
  if (lying) {
    s.add(capsule([12, -6], [32, -2.5], 7, 5.5)); // forelegs stretched out
    s.add(oval(33, -2.6, 4.2, 2.6));
    s.add(capsule([-16, -7], [-2, -2], 9, 6));
  } else {
    for (const [x0, x1] of [
      [-15, -17],
      [-8, -7],
      [5, 6],
      [11, 13],
    ] as const) {
      s.add(capsule([x0, -15], [x1, 0], 7.5, 5.5));
      s.add(oval(x1 + 1.5, -1.2, 3.8, 2));
    }
  }
  s.addStroke([[-24, -20 + y], [-33, -14 + y], [-36, -22 + y]], 2.2);
  s.add(oval(-37, -23 + y, 3.4, 2.8)); // tail tuft
  return s.build();
};

/** A rainbow: concentric spectral arcs, drawn additively at low strength. */
const rainbow = (canvas: Parameters<ArtScene['back']>[0]['canvas'], center: Pt, radius: number, width: number, alpha: number) => {
  const bands = ['#FF6A5E', '#FFA85A', '#FFE27A', '#8FE08A', '#6EB8FF', '#8A7CFF', '#C08AFF'];
  bands.forEach((color, i) => {
    const r = radius - (i * width) / bands.length;
    const b = Skia.PathBuilder.Make();
    b.arcToOval({ x: center[0] - r, y: center[1] - r, width: r * 2, height: r * 2 }, 180, 180, true);
    canvas.drawPath(b.build(), makePaint({ color, stroke: width / bands.length + 0.6, alpha, blend: BlendMode.Plus, blur: 1.2 }));
  });
};

// ── Noah — The Covenant Rainbow (Genesis 9) ────────────────────────────────

const ark = (): SkPath => {
  const hull = smoothPath([[-60, -18], [-48, 0], [48, 0], [62, -20], [40, -16], [-40, -16], [-60, -18]]);
  const house = polygon([[-30, -16], [-30, -34], [28, -34], [28, -16]]);
  const roof = polygon([[-36, -33], [0, -46], [34, -33]]);
  return union([hull, house, roof]);
};

export const noah: ArtScene = {
  key: 'noah',
  seed: 913,
  light: '#FFE3B0',
  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    sky(canvas, area, ['#2A3550', '#566A88', '#A8B4C2', '#F2D9A8', '#FFE9C2'], [0, 0.3, 0.55, 0.72, 0.8]);
    sunGlow(canvas, [236, 70], { radius: 10, halo: '#FFE2A8', core: '#FFFBEE' });
    godRays(canvas, rand, [236, 70], { count: 14, length: 260, angle: 2.1, spread: 1.6, color: '#FFF0D0', alpha: 0.14 });
    cloudBank(canvas, rand, { x0: -10, x1: 140, y: 50, puffs: 8, size: 12, body: '#3A4660', lit: '#F4E2C4', light: [236, 70] });
    rainbow(canvas, [150, 236], 168, 26, 0.32);
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 196, amp: 12, steps: 10, peaks: [[176, 158]] }), 320, '#5E6478', '#363C50');
    haze(canvas, area, 214, 26, '#F2E4CC', 0.5);
    water(canvas, rand, { x: x0, y: 232, width: x1 - x0, height: 70 }, { top: '#B8C2D0', bottom: '#4A5468', glint: '#FFF6E6', glints: 40 });
  },
  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    const light = { fill: '#141822', fillLit: '#343C50', rim: '#FFF0D0', lightDir: [0.6, -0.8] as Pt, rimWidth: 1, glow: 1.5 };
    // The ark at rest on the mountains (8:4), Noah below with raised hands.
    drawSubject(ctx, placeFigure(ark(), { x: 176, y: 171, scale: 0.92 }), light);
    const n = body(ARMS_RAISED, BUILDS.man);
    n.add(robe(ARMS_RAISED, { flare: 12 }));
    n.add(beard(ARMS_RAISED.head, 6.5, 1));
    drawSubject(ctx, placeFigure(n.build(), { x: 70, y: 264, scale: 1.0 }), light);
    drawSubject(ctx, placeFigure(sheep(true), { x: 180, y: 264, scale: 0.9 }), light);
    drawSubject(ctx, placeFigure(sheep(false), { x: 214, y: 266, scale: 0.95, flip: true }), light);
    const shore = smoothPath([[-20, 262], [60, 254], [140, 258], [240, 262], [320, 270], [320, 300], [-20, 300]], 320);
    drawProp(ctx, shore, makePaint({ shader: linear([0, 254], [0, 300], ['#3A3A40', '#141418']) }));
    if (mode === 'full') {
      dustMotes(canvas, rand, area, 16, '#FFF4DE', 0.8);
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.45);
    }
  },
};

// ── Moses — The Sea Divided (Exodus 14) ────────────────────────────────────

export const moses: ArtScene = {
  key: 'moses',
  seed: 1421,
  light: '#C8B8FF',
  back({ canvas, area, rand }: SceneContext) {
    sky(canvas, area, ['#0E0A20', '#2A1E4A', '#4C3A78', '#8C6AA8', '#E6C2C8'], [0, 0.3, 0.5, 0.66, 0.74]);
    stars(canvas, rand, { x: area.x, y: area.y, width: area.width, height: 90 }, 30, '#EDE6FF');
    // The walls of water on the right and on the left (14:22), and the dry path between.
    const path = polygon([[120, 300], [180, 300], [160, 160], [146, 160]]);
    canvas.drawPath(path, makePaint({ shader: linear([0, 160], [0, 300], ['#C8B48A', '#6A5A44']) }));
    for (const side of [-1, 1] as const) {
      const inner = side < 0 ? 138 : 168;
      const outer = side < 0 ? -40 : 340;
      const wall = smoothPath([[inner, 300], [inner + side * 4, 220], [inner + side * 10, 150], [inner + side * 30, 96], [outer, 70], [outer, 300]]);
      canvas.drawPath(wall, makePaint({ shader: linear([inner, 0], [outer, 0], ['#7FA6E0', '#2A4A8A', '#101A3A']) }));
      for (let i = 0; i < 26; i++) {
        const y = rand.range(90, 290);
        const x = inner + side * rand.range(2, 60);
        canvas.drawLine(x, y, x + side * rand.range(8, 30), y - rand.range(2, 10), makePaint({ color: '#CFE2FF', stroke: rand.range(0.5, 1.2), alpha: rand.range(0.15, 0.45) }));
      }
      canvas.drawPath(smoothPath([[inner, 300], [inner + side * 4, 220], [inner + side * 10, 150], [inner + side * 30, 96]]), makePaint({ color: '#E6F0FF', stroke: 1.4, alpha: 0.6 }));
    }
    haze(canvas, area, 170, 30, '#E6C2C8', 0.4);
  },
  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    const light = { fill: '#120E20', fillLit: '#342A50', rim: '#E6DAFF', lightDir: [0, -1] as Pt, rimWidth: 1, glow: 1.4 };
    // The people crossing on dry ground.
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const p = body(STANDING, BUILDS.man);
      p.add(robe(STANDING, { flare: 11 }));
      drawSubject(ctx, placeFigure(p.build(), { x: 148 + rand.range(-5, 5), y: 168 + t * 52, scale: 0.18 + t * 0.22 }), { ...light, rimWidth: 0.4, glow: 0 });
    }
    const m = body({ ...STANDING, elbowR: [16, -100], handR: [22, -116] }, BUILDS.man);
    m.add(robe(STANDING, { flare: 13, back: 3 }));
    m.add(beard(STANDING.head, 6.5, 1));
    m.add(capsule([24, -150], [16, -84], 2.2, 2)); // staff raised over the sea
    drawSubject(ctx, placeFigure(m.build(), { x: 126, y: 286, scale: 1.25 }), light);
    if (mode === 'full') {
      dustMotes(canvas, rand, area, 20, '#E6F0FF', 0.9);
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.5);
    }
  },
};

// ── David — The King (2 Samuel 5) ──────────────────────────────────────────

export const davidKing: ArtScene = {
  key: 'david-king',
  seed: 534,
  light: '#FFD9A0',
  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    sky(canvas, area, ['#1C2A44', '#3C5A84', '#8AA2BC', '#F2D6A2', '#FFE8BE'], [0, 0.3, 0.55, 0.72, 0.8]);
    sunGlow(canvas, [210, 120], { radius: 12, halo: '#FFD596', core: '#FFF6E0' });
    godRays(canvas, rand, [210, 120], { count: 16, length: 280, angle: -1.9, spread: 3, color: '#FFE8BE', alpha: 0.12 });
    // The city: walls and towers on the hill.
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 206, amp: 8, steps: 9 }), 320, '#8A7660', '#5A4A3C');
    for (let i = 0; i < 12; i++) {
      const x = 140 + i * 13;
      const h = 18 + (i % 3) * 8 + rand.range(-2, 2);
      canvas.drawRect({ x, y: 200 - h, width: 12, height: h + 10 }, makePaint({ color: '#4A3C30' }));
      for (let k = 0; k < 3; k++) canvas.drawRect({ x: x + 1 + k * 4, y: 197 - h, width: 2.4, height: 3 }, makePaint({ color: '#4A3C30' }));
    }
    haze(canvas, area, 200, 30, '#FFE2B0', 0.45);
    canvas.drawRect({ x: x0, y: 230, width: x1 - x0, height: 80 }, makePaint({ shader: linear([0, 230], [0, 300], ['#5A4636', '#1E1610']) }));
  },
  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    const pose: Pose = { ...STANDING, elbowR: [14, -72], handR: [20, -80] };
    const k = body(pose, BUILDS.man);
    k.add(robe(pose, { flare: 15, back: 10 }));
    // Royal mantle and crown.
    k.add(smoothPath([[-2, -82], [-16, -70], [-26, -30], [-30, 0], [-6, 0], [-4, -60], [6, -81], [-2, -82]]));
    k.add(polygon([[-3, -97], [-2.5, -102], [0, -99], [2.5, -104], [5, -99], [7.5, -102], [8.5, -97]]));
    k.add(curlyHair(pose.head, 6.3, 1));
    k.add(beard(pose.head, 6.3, 1));
    k.add(capsule([20, -80], [26, -112], 2, 1.8)); // scepter
    k.add(Skia.Path.Circle(26.5, -114, 3));
    drawSubject(ctx, placeFigure(k.build(), { x: 112, y: 274, scale: 1.5 }), { fill: '#16100E', fillLit: '#3E2E22', rim: '#FFE2B0', lightDir: [1, -0.5], rimWidth: 1.1, glow: 1.6 });
    if (mode === 'full') {
      dustMotes(canvas, rand, area, 20, '#FFE8BE', 0.9);
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.5);
    }
  },
};

// ── David — The Psalmist (Psalm 23) ────────────────────────────────────────

const lyre = (): SkPath => {
  const s = new Silhouette();
  s.add(capsule([-7, 0], [7, 0], 7, 7)); // sound box
  s.addStroke([[-6, -1], [-10, -12], [-8, -24]], 2.2);
  s.addStroke([[6, -1], [10, -12], [8, -24]], 2.2);
  s.add(capsule([-10, -24], [10, -24], 2.2, 2.2)); // yoke
  for (let i = -2; i <= 2; i++) s.addStroke([[i * 2.4, -2], [i * 2.4, -23]], 0.5, false);
  return s.build();
};

export const davidPsalmist: ArtScene = {
  key: 'david-psalmist',
  seed: 2323,
  light: '#D6C8FF',
  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    sky(canvas, area, ['#070A1C', '#141A3A', '#2C2A5A', '#4A3A70', '#7A5A8A'], [0, 0.3, 0.55, 0.7, 0.78]);
    stars(canvas, rand, { x: area.x, y: area.y, width: area.width, height: 170 }, 90, '#F2EEFF');
    // A band of the Milky Way.
    canvas.drawPath(polygon([[x0, 40], [x1, 120], [x1, 150], [x0, 70]]), makePaint({ color: '#C8B8FF', alpha: 0.08, blur: 14, blend: BlendMode.Plus }));
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 196, amp: 10, steps: 9 }), 320, '#2A2448', '#1A1630');
    // Quiet waters (23:2) holding the starlight.
    water(canvas, rand, { x: x0, y: 214, width: x1 - x0, height: 26 }, { top: '#5A4A80', bottom: '#2A2448', glint: '#F2EEFF', glints: 30 });
    canvas.drawRect({ x: x0, y: 238, width: x1 - x0, height: 80 }, makePaint({ shader: linear([0, 238], [0, 300], ['#2E2A40', '#0E0C16']) }));
  },
  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    const seated: Pose = {
      head: [4, -74],
      neck: [3, -66.5],
      shoulderL: [-2.5, -62],
      shoulderR: [6, -62],
      elbowL: [8, -48],
      elbowR: [14, -54],
      handL: [16, -46],
      handR: [20, -58],
      hipL: [-3, -30],
      hipR: [3, -30],
      kneeL: [16, -32],
      kneeR: [18, -30],
      footL: [20, -6],
      footR: [24, -5],
    };
    const d = body(seated, BUILDS.youth);
    d.add(garment(seated, { hemY: -18, flare: 13, front: 8 }));
    d.add(curlyHair(seated.head, 6.3, 1));
    d.add(placeFigure(lyre(), { x: 20, y: -40, scale: 0.9 }));
    const light = { fill: '#100E1C', fillLit: '#2E2848', rim: '#D6C8FF', lightDir: [0.4, -1] as Pt, rimWidth: 0.9, glow: 1.6 };
    // The rock David sits on.
    const rock = smoothPath([[80, 262], [110, 244], [150, 244], [170, 262]], 300);
    drawProp(ctx, rock, makePaint({ shader: linear([0, 244], [0, 280], ['#2E2A3E', '#0E0C14']) }));
    drawSubject(ctx, placeFigure(d.build(), { x: 112, y: 252, scale: 1.3 }), light);
    drawSubject(ctx, placeFigure(sheep(false, 0.95), { x: 214, y: 270, scale: 0.85, flip: true }), { ...light, rimWidth: 0.6, glow: 0 });
    drawSubject(ctx, placeFigure(sheep(true, 0.95), { x: 46, y: 276, scale: 0.8 }), { ...light, rimWidth: 0.6, glow: 0 });
    if (mode === 'full') {
      dustMotes(canvas, rand, area, 18, '#E6DEFF', 0.8);
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.5);
    }
  },
};

// ── Elijah — Fire on Carmel (1 Kings 18) ───────────────────────────────────

export const elijah: ArtScene = {
  key: 'elijah',
  seed: 1838,
  light: '#FFB070',
  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    sky(canvas, area, ['#140C10', '#3A1E1E', '#6A3424', '#B0582C', '#E8904A'], [0, 0.3, 0.55, 0.72, 0.8]);
    cloudBank(canvas, rand, { x0: -20, x1: 320, y: 50, puffs: 12, size: 13, body: '#2A1614', lit: '#FFB070', light: [176, 120] });
    // Fire falling from heaven onto the altar.
    canvas.drawPath(polygon([[160, 0], [192, 0], [200, 210], [150, 210]]), makePaint({ shader: linear([0, 0], [0, 210], [withAlpha('#FFE2A0', 0.65), withAlpha('#FF9A4A', 0.5), withAlpha('#FF7A2A', 0.2)]), blend: BlendMode.Plus, blur: 6 }));
    ridge(canvas, ridgePoints(rand, { x0, x1, baseY: 214, amp: 10, steps: 9 }), 320, '#5A2E22', '#2A1610');
    canvas.drawCircle(176, 212, 70, makePaint({ shader: radial([176, 212], 70, [withAlpha('#FFC070', 0.7), withAlpha('#FF8A3A', 0)]), blend: BlendMode.Plus }));
  },
  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    // The altar of twelve stones (18:31) with its trench of water (18:35).
    const altar = new Silhouette();
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4; i++) altar.add(Skia.Path.RRect({ rect: { x: 150 + i * 13 + (row % 2) * 4, y: 232 - row * 10, width: 12, height: 9.5 }, rx: 2.5, ry: 2.5 }));
    }
    if (mode === 'full') {
      // Tongues of fire consuming the offering (18:38).
      for (let i = 0; i < 14; i++) {
        const x = 156 + i * 3.4 + rand.range(-2, 2);
        const h = 18 + Math.sin((i / 13) * Math.PI) * 34 + rand.range(-6, 6);
        const lean = rand.range(-5, 5);
        const tongue = smoothPath([[x - 5, 208], [x - 3 + lean * 0.3, 208 - h * 0.5], [x + lean, 208 - h], [x + 3 + lean * 0.3, 208 - h * 0.5], [x + 5, 208]]);
        canvas.drawPath(tongue, makePaint({ shader: linear([0, 208 - h], [0, 208], ['#FFF6D0', '#FFB050', '#FF6A20']), alpha: 0.75, blend: BlendMode.Plus, blur: 0.8 }));
      }
      canvas.drawCircle(178, 196, 46, makePaint({ shader: radial([178, 196], 46, [withAlpha('#FFD08A', 0.6), withAlpha('#FFD08A', 0)]), blend: BlendMode.Plus }));
    }
    drawSubject(ctx, altar.build(), { fill: '#1E120E', fillLit: '#4A2A1E', rim: '#FFC070', lightDir: [0, -1], rimWidth: 1, glow: 1.5 });
    const e = body(ARMS_RAISED, BUILDS.man);
    e.add(robe(ARMS_RAISED, { flare: 13, back: 4 }));
    e.add(beard(ARMS_RAISED.head, 6.5, 1));
    e.add(smoothPath([[-2, -82], [-14, -70], [-20, -40], [-8, -44], [6, -81], [-2, -82]])); // mantle (2 Kings 2:8)
    drawSubject(ctx, placeFigure(e.build(), { x: 92, y: 270, scale: 1.3 }), { fill: '#160E0C', fillLit: '#40261A', rim: '#FFC88A', lightDir: [1, -0.4], rimWidth: 1.1, glow: 1.8 });
    const ground = smoothPath([[-20, 262], [80, 258], [200, 250], [320, 260], [320, 300], [-20, 300]], 320);
    drawProp(ctx, ground, makePaint({ shader: linear([0, 250], [0, 300], ['#3A1E14', '#120806']) }));
    if (mode === 'full') {
      canvas.drawRect({ x: 140, y: 248, width: 76, height: 3 }, makePaint({ color: '#FFD6A0', alpha: 0.7 }));
      dustMotes(canvas, rand, { x: 120, y: 120, width: 120, height: 110 }, 30, '#FFC070', 1);
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.5);
    }
  },
};

// ── Daniel — The Lions' Den (Daniel 6) ─────────────────────────────────────

export const daniel: ArtScene = {
  key: 'daniel',
  seed: 622,
  light: '#E8F0FF',
  back({ canvas, area, rand }: SceneContext) {
    // The den: rough stone walls, lit from an opening above.
    canvas.drawRect(area, makePaint({ shader: linear([0, area.y], [0, area.y + area.height], ['#1A1E2A', '#10131C', '#0A0C12']) }));
    for (let i = 0; i < 40; i++) {
      const x = rand.range(area.x, area.x + area.width);
      const y = rand.range(area.y, area.y + area.height);
      const w = rand.range(18, 40);
      canvas.drawOval({ x, y, width: w, height: w * 0.6 }, makePaint({ color: rand.next() > 0.5 ? '#232838' : '#141824', alpha: 0.8 }));
    }
    const opening: Pt = [150, 18];
    canvas.drawPath(polygon([[opening[0] - 26, 0], [opening[0] + 26, 0], [opening[0] + 90, 300], [opening[0] - 90, 300]]), makePaint({ shader: linear([0, 0], [0, 300], [withAlpha('#E8F0FF', 0.45), withAlpha('#C8D8FF', 0.1), withAlpha('#C8D8FF', 0)]), blend: BlendMode.Plus, blur: 4 }));
    canvas.drawOval({ x: 60, y: 236, width: 180, height: 40 }, makePaint({ shader: radial([150, 256], 90, [withAlpha('#DDE8FF', 0.35), withAlpha('#DDE8FF', 0)]), blend: BlendMode.Plus }));
  },
  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    const light = { fill: '#0E1018', fillLit: '#2A3046', rim: '#E8F0FF', lightDir: [0, -1] as Pt, rimWidth: 1, glow: 1.4 };
    drawSubject(ctx, placeFigure(lion(true), { x: 60, y: 266, scale: 1.1 }), light);
    drawSubject(ctx, placeFigure(lion(false), { x: 236, y: 262, scale: 1.05, flip: true }), light);
    drawSubject(ctx, placeFigure(lion(true), { x: 214, y: 286, scale: 1.25, flip: true }), light);
    const praying: Pose = { ...STANDING, elbowL: [6, -66], handL: [11, -72], elbowR: [12, -66], handR: [13, -73] };
    const d = body(praying, BUILDS.man);
    d.add(robe(praying, { flare: 13 }));
    d.add(beard(praying.head, 6.4, 1));
    drawSubject(ctx, placeFigure(d.build(), { x: 142, y: 262, scale: 1.3 }), { ...light, rimWidth: 1.2, glow: 2 });
    if (mode === 'full') {
      dustMotes(canvas, rand, { x: 90, y: 20, width: 120, height: 220 }, 34, '#E8F0FF', 0.9);
      grain(canvas, area, 0.06);
      vignette(canvas, area, 0.55);
    }
  },
};

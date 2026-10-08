import { dustMotes, grain, haze, sky, vignette, water } from '../environment';
import { oval, Silhouette } from '../figures';
import { drawSubject, type ArtScene, type SceneContext } from '../scene';
import { BlendMode, linear, makePaint, radial, smoothPath, withAlpha, type Pt } from '../../skia/draw';

/**
 * Sling & Stones — Five Smooth Stones (1 Samuel 17:40). A still life by the
 * brook at first light: a shepherd's sling and five smooth stones on a
 * flat rock. Original procedural art.
 */
const LIGHT: Pt = [220, 70];

const STONES: readonly [number, number, number, number][] = [
  [150, 206, 13, 9.5],
  [178, 214, 11, 8],
  [126, 222, 12.5, 9],
  [158, 230, 14, 10],
  [196, 232, 10.5, 7.5],
];

/** The pouch: a woven leather cradle, wider in the middle. */
const POUCH: Pt[] = [
  [96, 196],
  [108, 186],
  [124, 182],
  [138, 186],
  [146, 194],
  [134, 200],
  [118, 202],
  [104, 201],
];

const slingPath = () => {
  const s = new Silhouette();
  // A braided cord from the finger loop to the pouch…
  s.addStroke([[26, 244], [44, 236], [66, 226], [84, 210], [97, 197]], 2.8);
  s.add(oval(23, 245, 5, 3.8));
  // …the pouch itself…
  s.add(smoothPath([...POUCH, POUCH[0]!]));
  // …and the release cord, ending in a knot.
  s.addStroke([[146, 194], [168, 182], [206, 176], [240, 168], [262, 160]], 2.6);
  s.add(oval(265, 159, 3.6, 2.8));
  return s.build();
};

const stonesPath = () => {
  const s = new Silhouette();
  for (const [x, y, rx, ry] of STONES) s.add(oval(x, y, rx, ry));
  return s.build();
};

export const slingStones: ArtScene = {
  key: 'sling-stones',
  seed: 1740,
  light: '#D8E6FF',

  back({ canvas, area, rand }: SceneContext) {
    const x0 = area.x - 30;
    const x1 = area.x + area.width + 30;
    sky(canvas, area, ['#1A2236', '#33405C', '#6A7896', '#B9C2D2', '#E8DCC6'], [0, 0.25, 0.45, 0.6, 0.7]);
    canvas.drawCircle(LIGHT[0], LIGHT[1], 160, makePaint({ shader: radial(LIGHT, 160, [withAlpha('#FFF0D8', 0.5), withAlpha('#FFF0D8', 0)]), blend: BlendMode.Plus }));
    // Far bank with bushes, softly out of focus.
    canvas.drawRect({ x: x0, y: 112, width: x1 - x0, height: 32 }, makePaint({ shader: linear([0, 112], [0, 144], ['#4E5A60', '#2C3640']), blur: 2 }));
    for (let i = 0; i < 26; i++) {
      const x = rand.range(x0, x1);
      const r = rand.range(8, 20);
      canvas.drawOval({ x: x - r * 1.4, y: 118 - r, width: r * 2.8, height: r * 1.6 }, makePaint({ color: rand.next() > 0.5 ? '#36424A' : '#2A343C', alpha: 0.85, blur: 3 }));
    }
    haze(canvas, area, 128, 30, '#E6ECF6', 0.5);
    // The brook: bright, moving water with bokeh glints.
    water(canvas, rand, { x: x0, y: 136, width: x1 - x0, height: 60 }, { top: '#C9D6EA', bottom: '#5E6E8C', glint: '#FFFFFF', glints: 70 });
    for (let i = 0; i < 18; i++) {
      const x = rand.range(area.x, area.x + area.width);
      const y = rand.range(140, 190);
      const r = rand.range(2, 6);
      canvas.drawCircle(x, y, r, makePaint({ shader: radial([x, y], r, [withAlpha('#FFFFFF', 0.5), withAlpha('#FFFFFF', 0)]), blend: BlendMode.Plus }));
    }
    // The flat rock in the foreground.
    const rock = smoothPath([[-20, 214], [40, 196], [120, 186], [220, 190], [300, 206], [320, 300], [-20, 300]], 320);
    canvas.drawPath(rock, makePaint({ shader: linear([0, 186], [0, 300], ['#8A8478', '#4E4A44', '#22201E']) }));
    canvas.drawPath(smoothPath([[40, 196], [120, 186], [220, 190], [300, 206]]), makePaint({ color: '#F4EEE2', stroke: 1.2, alpha: 0.55 }));
    for (let i = 0; i < 40; i++) {
      const x = rand.range(0, 300);
      const y = rand.range(198, 290);
      canvas.drawCircle(x, y, rand.range(0.4, 1.4), makePaint({ color: rand.next() > 0.5 ? '#A49C8E' : '#2E2B28', alpha: 0.6 }));
    }
  },

  front(ctx: SceneContext) {
    const { canvas, area, rand, mode } = ctx;
    if (mode === 'silhouette') {
      drawSubject(ctx, slingPath(), { fill: '#000', fillLit: '#000', rim: '#000', lightDir: [0, -1], rimWidth: 0 });
      drawSubject(ctx, stonesPath(), { fill: '#000', fillLit: '#000', rim: '#000', lightDir: [0, -1], rimWidth: 0 });
      return;
    }
    // Soft contact shadows.
    for (const [x, y, rx, ry] of STONES) canvas.drawOval({ x: x - rx * 1.1, y: y + ry * 0.2, width: rx * 2.3, height: ry * 1.3 }, makePaint({ color: '#000000', alpha: 0.35, blur: 3 }));
    canvas.drawPath(slingPath(), makePaint({ color: '#000000', alpha: 0.3, blur: 2.5 }));

    // Leather sling: warm brown with a lit upper edge.
    const sling = slingPath();
    canvas.drawPath(sling, makePaint({ shader: linear([0, 160], [0, 250], ['#B07A48', '#6A4426', '#3A2414']) }));
    canvas.save();
    canvas.translate(0, -0.8);
    canvas.drawPath(sling, makePaint({ color: '#F2D2A8', alpha: 0.35, stroke: 0.6 }));
    canvas.restore();
    // Woven texture on the pouch and braiding along the cords.
    canvas.save();
    canvas.clipPath(smoothPath([...POUCH, POUCH[0]!]), 1, true);
    for (let i = -6; i < 14; i++) {
      canvas.drawLine(92 + i * 5, 182, 112 + i * 5, 204, makePaint({ color: '#2A180C', stroke: 0.7, alpha: 0.5 }));
      canvas.drawLine(112 + i * 5, 182, 92 + i * 5, 204, makePaint({ color: '#F2D2A8', stroke: 0.5, alpha: 0.25 }));
    }
    canvas.restore();
    for (const [a, b] of [
      [[26, 244], [97, 197]],
      [[146, 194], [262, 160]],
    ] as const) {
      for (let t = 0.04; t < 1; t += 0.05) {
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        canvas.drawCircle(x, y + Math.sin(t * 40) * 0.6, 0.5, makePaint({ color: '#2A180C', alpha: 0.35 }));
      }
    }

    // Five smooth stones, polished by the water.
    for (const [x, y, rx, ry] of STONES) {
      canvas.drawOval({ x: x - rx, y: y - ry, width: rx * 2, height: ry * 2 }, makePaint({ shader: radial([x - rx * 0.35, y - ry * 0.45], rx * 1.6, ['#E6E2DA', '#9A958C', '#4E4A45', '#2A2826'], [0, 0.35, 0.75, 1]) }));
      canvas.drawOval({ x: x - rx * 0.55, y: y - ry * 0.75, width: rx * 0.7, height: ry * 0.35 }, makePaint({ color: '#FFFFFF', alpha: 0.45, blur: 1 }));
    }
    dustMotes(canvas, rand, { x: 100, y: 60, width: 190, height: 140 }, 22, '#FFF6E6', 0.9);
    grain(canvas, area, 0.06);
    vignette(canvas, area, 0.5);
  },
};

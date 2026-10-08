import { Skia, type SkCanvas, type SkPath } from '@shopify/react-native-skia';

import {
  BlendMode,
  linear,
  makePaint,
  polygon,
  smoothPath,
  strokeOutline,
  transformPath,
  union,
  withSave,
  type Pt,
} from '../skia/draw';

/**
 * Silhouette figures built from a posed skeleton.
 *
 * Poses are authored in figure-local units: the figure is ~100 units tall,
 * feet on y = 0, head near y = −92, facing +x. `placeFigure` maps local units
 * into scene coordinates. All parts are boolean-unioned into one path, so a
 * figure can be rim-lit, shown as an undiscovered silhouette, or used as a mask.
 */
export interface Pose {
  readonly head: Pt;
  readonly neck: Pt;
  readonly shoulderL: Pt;
  readonly shoulderR: Pt;
  readonly elbowL: Pt;
  readonly elbowR: Pt;
  readonly handL: Pt;
  readonly handR: Pt;
  readonly hipL: Pt;
  readonly hipR: Pt;
  readonly kneeL: Pt;
  readonly kneeR: Pt;
  readonly footL: Pt;
  readonly footR: Pt;
}

export interface Build {
  readonly headR: number;
  readonly upperArm: number;
  readonly forearm: number;
  readonly thigh: number;
  readonly shin: number;
  readonly torso: number;
}

export const BUILDS = {
  youth: { headR: 6.3, upperArm: 5.2, forearm: 4.3, thigh: 7.8, shin: 5.8, torso: 1 },
  man: { headR: 6.5, upperArm: 6.2, forearm: 5.2, thigh: 8.8, shin: 6.6, torso: 1.12 },
  giant: { headR: 6.4, upperArm: 8.6, forearm: 7.2, thigh: 11.6, shin: 9.4, torso: 1.55 },
  woman: { headR: 6.1, upperArm: 4.8, forearm: 4, thigh: 7.2, shin: 5.2, torso: 0.92 },
} as const satisfies Record<string, Build>;

/** Tapered capsule between two points (a limb segment), as one clean outline. */
export const capsule = (a: Pt, b: Pt, wa: number, wb: number): SkPath => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.max(0.0001, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const ra = wa / 2;
  const rb = wb / 2;
  return union([
    polygon([
      [a[0] + nx * ra, a[1] + ny * ra],
      [b[0] + nx * rb, b[1] + ny * rb],
      [b[0] - nx * rb, b[1] - ny * rb],
      [a[0] - nx * ra, a[1] - ny * ra],
    ]),
    Skia.Path.Circle(a[0], a[1], ra),
    Skia.Path.Circle(b[0], b[1], rb),
  ]);
};

export const oval = (cx: number, cy: number, rx: number, ry: number): SkPath =>
  Skia.Path.Oval({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 });

/** Accumulates parts and unions them into one silhouette path. */
export class Silhouette {
  private readonly parts: SkPath[] = [];

  add(path: SkPath): this {
    this.parts.push(path);
    return this;
  }

  /** A stroked curve (cords, staffs, cloth edges) converted to a fillable outline. */
  addStroke(points: readonly Pt[], width: number, smooth = true): this {
    this.parts.push(strokeOutline(smooth ? smoothPath(points) : polygon(points, false), width));
    return this;
  }

  build(): SkPath {
    return union(this.parts);
  }
}

const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Body (head, neck, torso, limbs) for a pose. Garments and props are added by callers. */
export const body = (pose: Pose, build: Build): Silhouette => {
  const s = new Silhouette();
  const torsoW = 9.5 * build.torso;
  const shoulders = mid(pose.shoulderL, pose.shoulderR);
  const hips = mid(pose.hipL, pose.hipR);
  s.add(
    smoothPath([
      [pose.shoulderL[0] - torsoW * 0.22, pose.shoulderL[1] + 1],
      [shoulders[0], shoulders[1] - 1.2],
      [pose.shoulderR[0] + torsoW * 0.22, pose.shoulderR[1] + 1],
      [pose.hipR[0] + torsoW * 0.14, pose.hipR[1]],
      [hips[0], hips[1] + 2],
      [pose.hipL[0] - torsoW * 0.14, pose.hipL[1]],
      [pose.shoulderL[0] - torsoW * 0.22, pose.shoulderL[1] + 1],
    ]),
  );
  s.add(capsule(shoulders, hips, torsoW * 1.3, torsoW * 1.02));
  s.add(capsule(pose.neck, pose.head, build.headR * 0.78, build.headR * 0.7));
  s.add(Skia.Path.Circle(pose.head[0], pose.head[1], build.headR));
  s.add(capsule(pose.shoulderL, pose.elbowL, build.upperArm, build.forearm * 1.02));
  s.add(capsule(pose.elbowL, pose.handL, build.forearm, build.forearm * 0.74));
  s.add(capsule(pose.shoulderR, pose.elbowR, build.upperArm, build.forearm * 1.02));
  s.add(capsule(pose.elbowR, pose.handR, build.forearm, build.forearm * 0.74));
  s.add(capsule(pose.hipL, pose.kneeL, build.thigh, build.shin * 1.05));
  s.add(capsule(pose.kneeL, pose.footL, build.shin, build.shin * 0.64));
  s.add(capsule(pose.hipR, pose.kneeR, build.thigh, build.shin * 1.05));
  s.add(capsule(pose.kneeR, pose.footR, build.shin, build.shin * 0.64));
  s.add(capsule([pose.footL[0] - 1, pose.footL[1] - 0.6], [pose.footL[0] + 5, pose.footL[1] - 0.2], build.shin * 0.62, build.shin * 0.42));
  s.add(capsule([pose.footR[0] - 1, pose.footR[1] - 0.6], [pose.footR[0] + 5, pose.footR[1] - 0.2], build.shin * 0.62, build.shin * 0.42));
  return s;
};

/** Tunic or robe hanging from the shoulders with a flared hem. */
export const garment = (
  pose: Pose,
  { hemY, flare, back = 0, front = 0, sway = 0 }: { hemY: number; flare: number; back?: number; front?: number; sway?: number },
): SkPath => {
  const hipMid = (pose.hipL[0] + pose.hipR[0]) / 2;
  return smoothPath([
    [pose.shoulderL[0] - 2.6, pose.shoulderL[1] + 1.5],
    [pose.hipL[0] - 5.2, pose.hipL[1] + 2],
    [hipMid - flare - back + sway, hemY - 0.5],
    [hipMid - flare * 0.25 + sway, hemY + 1.4],
    [hipMid + flare * 0.5 + sway, hemY + 0.6],
    [hipMid + flare + front + sway, hemY - 1],
    [pose.hipR[0] + 5, pose.hipR[1] + 2],
    [pose.shoulderR[0] + 2.6, pose.shoulderR[1] + 1.5],
    [pose.shoulderL[0] - 2.6, pose.shoulderL[1] + 1.5],
  ]);
};

/** Armored skirt of leather strips (pteruges) below a breastplate. */
export const stripSkirt = (pose: Pose, { top, bottom, flare, strips }: { top: number; bottom: number; flare: number; strips: number }): SkPath => {
  const hipMid = (pose.hipL[0] + pose.hipR[0]) / 2;
  const parts: SkPath[] = [];
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1);
    const xTop = hipMid - flare * 0.62 + flare * 1.24 * t;
    const xBottom = hipMid - flare + flare * 2 * t;
    const len = bottom - (i % 2 === 0 ? 0 : 2.2);
    parts.push(capsule([xTop, top], [xBottom, len], 4.2, 4.6));
  }
  return union(parts);
};

/** Curly hair mass around the head. */
export const curlyHair = (head: Pt, r: number, facing = 1): SkPath =>
  union(
    (
      [
        [-0.55, -0.72],
        [0.12, -0.98],
        [0.72, -0.62],
        [-0.92, -0.12],
        [-0.82, 0.42],
      ] as const
    ).map(([cx, cy]) => Skia.Path.Circle(head[0] + cx * r * facing, head[1] + cy * r, r * 0.56)),
  );

export interface Placement {
  /** Scene x of the figure's local origin (between the feet). */
  readonly x: number;
  /** Scene y of the ground under the feet. */
  readonly y: number;
  /** Scene units per local unit. */
  readonly scale: number;
  /** Mirror horizontally (face −x). */
  readonly flip?: boolean;
}

/** Maps a local-space silhouette into scene space. */
export const placeFigure = (path: SkPath, p: Placement): SkPath => {
  const m = Skia.Matrix();
  m.translate(p.x, p.y);
  m.scale(p.flip ? -p.scale : p.scale, p.scale);
  return transformPath(path, m);
};

export interface LightingOptions {
  /** Silhouette base color (shadow side). */
  readonly fill: string;
  /** Slightly lighter tone on the side facing the light. */
  readonly fillLit: string;
  /** Rim light color. */
  readonly rim: string;
  /** Direction toward the light source (e.g. [1, -0.3]). */
  readonly lightDir: Pt;
  /** Rim thickness in scene units. */
  readonly rimWidth: number;
  /** Soft glow radius around the rim. */
  readonly glow?: number;
}

/**
 * Draws a backlit silhouette: a soft glow and a crisp rim on the light side,
 * then the body with a subtle gradient so it reads as volume, not a cutout.
 */
export const drawLitFigure = (canvas: SkCanvas, path: SkPath, o: LightingOptions) => {
  const bounds = path.getBounds();
  const len = Math.max(0.001, Math.hypot(o.lightDir[0], o.lightDir[1]));
  const ux = o.lightDir[0] / len;
  const uy = o.lightDir[1] / len;
  withSave(canvas, () => {
    if (o.glow) {
      canvas.save();
      canvas.translate(ux * o.rimWidth * 0.6, uy * o.rimWidth * 0.6);
      canvas.drawPath(path, makePaint({ color: o.rim, alpha: 0.45, blur: o.glow, blend: BlendMode.Plus }));
      canvas.restore();
    }
    canvas.save();
    canvas.translate(ux * o.rimWidth, uy * o.rimWidth);
    canvas.drawPath(path, makePaint({ color: o.rim }));
    canvas.restore();
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const reach = Math.max(bounds.width, bounds.height) / 2;
    canvas.drawPath(
      path,
      makePaint({
        shader: linear([cx - ux * reach, cy - uy * reach], [cx + ux * reach, cy + uy * reach], [o.fill, o.fill, o.fillLit], [0, 0.55, 1]),
      }),
    );
  });
};

/**
 * Geometry of the foil pack and its tear, in "pack units" (260 × 400).
 *
 * Everything here is pure math. The per-frame functions are worklets so the
 * tear can be computed on the UI thread while the finger moves; their
 * inputs and outputs are plain numbers and arrays.
 */
export const PACK_W = 260;
export const PACK_H = 400;
/** Height of the heat-sealed crimp bands at the top and bottom. */
export const CRIMP_H = 24;
/** Baseline of the perforated seal the player tears along. */
export const SEAL_Y = 50;
/** Horizontal resolution of the tear (columns of the strip mesh). */
export const TEAR_COLUMNS = 40;
const STRIP_ROWS = 2;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Seeded, irregular tear line: the seal's y at each column boundary (length TEAR_COLUMNS + 1). */
export const makeTearProfile = (seed = 7): number[] => {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const profile: number[] = [];
  for (let i = 0; i <= TEAR_COLUMNS; i++) {
    const wave = Math.sin(i * 0.55 + seed) * 1.4 + Math.sin(i * 1.7 + seed * 0.3) * 0.7;
    const tooth = (i % 2 === 0 ? 1 : -1) * (0.8 + rand() * 1.6);
    profile.push(SEAL_Y + wave + tooth);
  }
  return profile;
};

export const columnX = (i: number): number => (i / TEAR_COLUMNS) * PACK_W;

/** Tear y at an arbitrary x by linear interpolation of the profile. */
export const tearYAt = (profile: readonly number[], x: number): number => {
  'worklet';
  const f = Math.min(TEAR_COLUMNS, Math.max(0, (x / PACK_W) * TEAR_COLUMNS));
  const i = Math.floor(f);
  const t = f - i;
  const a = profile[i] ?? SEAL_Y;
  const b = profile[Math.min(TEAR_COLUMNS, i + 1)] ?? a;
  return a + (b - a) * t;
};

export interface TearPose {
  /** 0–1 tear progress from the origin side. */
  readonly progress: number;
  /** +1 tears from the left edge, −1 from the right edge. */
  readonly side: number;
  /** 0–1 how strongly the detached strip curls away. */
  readonly curl: number;
  /** 0–1 pre-tear tension bulge near the origin edge. */
  readonly tension: number;
  /** 0–1 flight of the fully detached strip as it is cast away. */
  readonly fly: number;
}

/** Distance along the tear from the origin side to the tip, in pack units. */
const tipDistance = (pose: TearPose): number => {
  'worklet';
  return Math.max(pose.progress * PACK_W, pose.tension * 10);
};

/**
 * Outline of the pack body, open along the torn part of the seal.
 * Returned as a flat polygon [x0, y0, x1, y1, …] that extends beyond the pack
 * on the untorn sides (it is used as a clip).
 */
export const bodyOutline = (profile: readonly number[], pose: TearPose): number[] => {
  'worklet';
  const pts: number[] = [];
  const tip = pose.progress * PACK_W;
  const pad = 20;
  if (pose.side > 0) {
    const tipX = tip;
    for (let i = 0; i <= TEAR_COLUMNS; i++) {
      const x = (i / TEAR_COLUMNS) * PACK_W;
      if (x >= tipX) break;
      pts.push(x, profile[i] ?? SEAL_Y);
    }
    pts.push(tipX, tearYAt(profile, tipX), tipX, -pad, PACK_W + pad, -pad, PACK_W + pad, PACK_H + pad, -pad, PACK_H + pad, -pad, profile[0] ?? SEAL_Y);
  } else {
    const tipX = PACK_W - tip;
    for (let i = TEAR_COLUMNS; i >= 0; i--) {
      const x = (i / TEAR_COLUMNS) * PACK_W;
      if (x <= tipX) break;
      pts.push(x, profile[i] ?? SEAL_Y);
    }
    pts.push(tipX, tearYAt(profile, tipX), tipX, -pad, -pad, -pad, -pad, PACK_H + pad, PACK_W + pad, PACK_H + pad, PACK_W + pad, profile[TEAR_COLUMNS] ?? SEAL_Y);
  }
  return pts;
};

/** Static texture coordinates of the strip mesh (pack units). */
export const stripTextureCoords = (profile: readonly number[]): Point[] => {
  const coords: Point[] = [];
  for (let i = 0; i <= TEAR_COLUMNS; i++) {
    const x = columnX(i);
    const bottom = profile[i] ?? SEAL_Y;
    for (let r = 0; r <= STRIP_ROWS; r++) coords.push({ x, y: (bottom * r) / STRIP_ROWS });
  }
  return coords;
};

/** Triangle indices of the strip mesh. */
export const stripIndices = (): number[] => {
  const indices: number[] = [];
  const rowSize = STRIP_ROWS + 1;
  for (let i = 0; i < TEAR_COLUMNS; i++) {
    for (let r = 0; r < STRIP_ROWS; r++) {
      const a = i * rowSize + r;
      const b = (i + 1) * rowSize + r;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return indices;
};

const MAX_CURL = 0.3; // radians at full curl (~17°)
const CURL_LENGTH = 90; // pack units over which the curl builds

/**
 * Deformed strip vertices for a tear pose. Detached columns bend around the
 * tear tip (each column rotates a little more than its neighbour, so the
 * strip curls rather than swinging rigidly) and lift away from the seal.
 * Also returns per-vertex shade (1 = flat, lower = bent away from the light).
 */
export const stripMesh = (profile: readonly number[], pose: TearPose): { vertices: Point[]; shade: number[] } => {
  'worklet';
  const vertices: Point[] = [];
  const shade: number[] = [];
  const tip = tipDistance(pose);
  const s = pose.side >= 0 ? 1 : -1;
  const tipX = s > 0 ? tip : PACK_W - tip;
  const pivotY = tearYAt(profile, tipX);
  const curl = Math.max(pose.curl, pose.tension * 0.35);
  // Fly-away: the detached strip is cast up and toward the tear direction.
  const flyX = s * 90 * pose.fly;
  const flyY = -170 * pose.fly;
  const flyRot = -s * 0.7 * pose.fly;
  const cx = PACK_W / 2;
  const cy = SEAL_Y / 2;
  for (let i = 0; i <= TEAR_COLUMNS; i++) {
    const x = (i / TEAR_COLUMNS) * PACK_W;
    const bottom = profile[i] ?? SEAL_Y;
    const along = s > 0 ? x : PACK_W - x;
    const d = tip - along;
    let angle = 0;
    let lift = 0;
    if (d > 0) {
      const t = Math.min(1, d / CURL_LENGTH);
      const eased = t * t * (3 - 2 * t);
      angle = s * MAX_CURL * eased * curl;
      lift = Math.min(14, d * 0.07) * curl;
    }
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let r = 0; r <= 2; r++) {
      const y = (bottom * r) / 2;
      let vx = x - tipX;
      let vy = y - pivotY;
      let px = tipX + vx * cos - vy * sin;
      let py = pivotY + vx * sin + vy * cos - lift;
      if (pose.fly > 0) {
        vx = px - cx;
        vy = py - cy;
        const fc = Math.cos(flyRot);
        const fs = Math.sin(flyRot);
        px = cx + vx * fc - vy * fs + flyX;
        py = cy + vx * fs + vy * fc + flyY;
      }
      vertices.push({ x: px, y: py });
      shade.push(1 - Math.min(0.42, Math.abs(angle) * 0.42));
    }
  }
  return { vertices, shade };
};

/** The torn edge of the pack body, from the origin side to the tip ([x, y, …]). */
export const bodyTornEdge = (profile: readonly number[], pose: TearPose): number[] => {
  'worklet';
  const pts: number[] = [];
  if (pose.progress <= 0) return pts;
  const tip = pose.progress * PACK_W;
  if (pose.side > 0) {
    for (let i = 0; i <= TEAR_COLUMNS; i++) {
      const x = (i / TEAR_COLUMNS) * PACK_W;
      if (x > tip) break;
      pts.push(x, profile[i] ?? SEAL_Y);
    }
    pts.push(tip, tearYAt(profile, tip));
  } else {
    for (let i = TEAR_COLUMNS; i >= 0; i--) {
      const x = (i / TEAR_COLUMNS) * PACK_W;
      if (x < PACK_W - tip) break;
      pts.push(x, profile[i] ?? SEAL_Y);
    }
    pts.push(PACK_W - tip, tearYAt(profile, PACK_W - tip));
  }
  return pts;
};

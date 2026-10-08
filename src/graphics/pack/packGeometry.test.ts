import {
  bodyOutline,
  bodyTornEdge,
  makeTearProfile,
  PACK_W,
  SEAL_Y,
  stripIndices,
  stripMesh,
  stripTextureCoords,
  TEAR_COLUMNS,
  tearYAt,
  type TearPose,
} from './packGeometry';

const pose = (overrides: Partial<TearPose> = {}): TearPose => ({ progress: 0, side: 1, curl: 1, tension: 0, fly: 0, ...overrides });

describe('tear profile', () => {
  it('is deterministic, irregular and stays close to the seal', () => {
    const a = makeTearProfile(7);
    expect(a).toEqual(makeTearProfile(7));
    expect(a).not.toEqual(makeTearProfile(8));
    expect(a).toHaveLength(TEAR_COLUMNS + 1);
    for (const y of a) expect(Math.abs(y - SEAL_Y)).toBeLessThan(5);
    expect(new Set(a.map((y) => y.toFixed(2))).size).toBeGreaterThan(TEAR_COLUMNS / 2);
  });

  it('interpolates between columns', () => {
    const p = makeTearProfile(3);
    const x = (PACK_W / TEAR_COLUMNS) * 2.5;
    expect(tearYAt(p, x)).toBeCloseTo((p[2]! + p[3]!) / 2);
    expect(tearYAt(p, -50)).toBe(p[0]);
    expect(tearYAt(p, PACK_W * 2)).toBe(p[TEAR_COLUMNS]);
  });
});

describe('strip mesh', () => {
  const profile = makeTearProfile(5);

  it('matches the flat strip exactly before any tear', () => {
    const { vertices, shade } = stripMesh(profile, pose());
    const coords = stripTextureCoords(profile);
    expect(vertices).toHaveLength(coords.length);
    vertices.forEach((v, i) => {
      expect(v.x).toBeCloseTo(coords[i]!.x);
      expect(v.y).toBeCloseTo(coords[i]!.y);
    });
    expect(shade.every((s) => s === 1)).toBe(true);
  });

  it('lifts detached columns and leaves attached ones in place', () => {
    const { vertices } = stripMesh(profile, pose({ progress: 0.5 }));
    const coords = stripTextureCoords(profile);
    const first = vertices[0]!; // origin-side top corner, fully detached
    expect(first.y).toBeLessThan(coords[0]!.y - 5);
    const last = vertices[vertices.length - 1]!; // far side, still attached
    expect(last.x).toBeCloseTo(coords[coords.length - 1]!.x);
    expect(last.y).toBeCloseTo(coords[coords.length - 1]!.y);
  });

  it('mirrors when tearing from the right edge', () => {
    const { vertices } = stripMesh(profile, pose({ progress: 0.5, side: -1 }));
    const coords = stripTextureCoords(profile);
    const lastTop = vertices[vertices.length - 3]!;
    expect(lastTop.y).toBeLessThan(coords[coords.length - 3]!.y - 5);
    expect(vertices[0]!.x).toBeCloseTo(0);
  });

  it('has valid triangle indices', () => {
    const indices = stripIndices();
    const count = stripTextureCoords(profile).length;
    expect(indices.length % 3).toBe(0);
    expect(Math.max(...indices)).toBe(count - 1);
    expect(Math.min(...indices)).toBe(0);
  });
});

describe('body outline and torn edge', () => {
  const profile = makeTearProfile(9);

  it('is closed over the whole seal before tearing', () => {
    const outline = bodyOutline(profile, pose());
    expect(outline.length % 2).toBe(0);
    expect(bodyTornEdge(profile, pose())).toEqual([]);
  });

  it('follows the tear line up to the tip', () => {
    const edge = bodyTornEdge(profile, pose({ progress: 0.5 }));
    expect(edge[0]).toBe(0);
    expect(edge[edge.length - 2]).toBeCloseTo(PACK_W / 2);
    const full = bodyTornEdge(profile, pose({ progress: 1 }));
    expect(full[full.length - 2]).toBeCloseTo(PACK_W);
  });
});

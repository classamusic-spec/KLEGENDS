/**
 * Journey levels measure game progression only — never spiritual growth.
 * Level n requires 100 · n(n−1)/2 total XP: L2 at 100, L3 at 300, L4 at 600…
 */
export const xpRequiredForLevel = (level: number): number => (100 * level * (level - 1)) / 2;

export interface LevelProgress {
  readonly level: number;
  readonly xpIntoLevel: number;
  readonly xpForNextLevel: number;
  /** 0–1 progress toward the next level. */
  readonly fraction: number;
}

export const levelProgress = (totalXp: number): LevelProgress => {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) level++;
  const floor = xpRequiredForLevel(level);
  const span = xpRequiredForLevel(level + 1) - floor;
  return { level, xpIntoLevel: xp - floor, xpForNextLevel: span, fraction: (xp - floor) / span };
};

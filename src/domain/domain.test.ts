import { levelProgress, xpRequiredForLevel } from './progression';
import { compareRarity, isRarity, RARITY_EMBLEM, RARITIES } from './rarity';
import { formatReference, verseKeysFor } from './scripture';

describe('scripture references', () => {
  it('formats chapters, verses and ranges', () => {
    expect(formatReference({ book: '1SA', chapter: 17 })).toBe('1 Samuel 17');
    expect(formatReference({ book: '1SA', chapter: 17, verseStart: 45 })).toBe('1 Samuel 17:45');
    expect(formatReference({ book: 'EXO', chapter: 14, verseStart: 21, verseEnd: 22 })).toBe('Exodus 14:21–22');
    expect(formatReference({ book: 'PSA', chapter: 23, verseStart: 1 })).toBe('Psalm 23:1');
  });

  it('expands verse keys', () => {
    expect(verseKeysFor({ book: '1SA', chapter: 17, verseStart: 49, verseEnd: 50 })).toEqual(['1SA 17:49', '1SA 17:50']);
    expect(verseKeysFor({ book: '1SA', chapter: 17 })).toEqual([]);
  });
});

describe('rarity', () => {
  it('orders rarities and gives each a distinct emblem shape', () => {
    expect([...RARITIES].sort(compareRarity)).toEqual(['common', 'rare', 'epic', 'legendary']);
    expect(new Set(Object.values(RARITY_EMBLEM)).size).toBe(RARITIES.length);
    expect(isRarity('epic')).toBe(true);
    expect(isRarity('mythic')).toBe(false);
  });
});

describe('journey levels', () => {
  it('uses triangular XP thresholds', () => {
    expect(xpRequiredForLevel(1)).toBe(0);
    expect(xpRequiredForLevel(2)).toBe(100);
    expect(xpRequiredForLevel(3)).toBe(300);
    expect(levelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100, fraction: 0 });
    expect(levelProgress(150)).toMatchObject({ level: 2, xpIntoLevel: 50, xpForNextLevel: 200 });
    expect(levelProgress(-20).level).toBe(1);
  });
});

import { CARDS } from './cards';
import { catalog, DEMO_PACK_ID, VALLEY_OF_ELAH_ID } from './index';
import { getPassage, passageText } from './scripture';
import { BSB_VERSES } from './scripture/bsb.generated';
import type { ScriptureReference } from '@/domain/scripture';

const referencesInContent = (): ScriptureReference[] => {
  const refs: ScriptureReference[] = CARDS.map((card) => card.keyVerse);
  for (const campaign of catalog.campaigns) {
    for (const questId of campaign.questIds) {
      for (const step of catalog.quest(questId)?.steps ?? []) {
        if (step.kind === 'scripture') refs.push(step.passage);
        if (step.kind === 'question' || step.kind === 'discovery') refs.push(step.source);
      }
    }
  }
  return refs;
};

describe('content integrity', () => {
  it('builds a valid catalog', () => {
    expect(catalog.cards.length).toBe(12);
  });

  it('quotes only verses present in the public-domain store', () => {
    for (const ref of referencesInContent()) {
      expect({ ref, found: getPassage(ref) !== undefined }).toEqual({ ref, found: true });
    }
  });

  it('uses stable, unique, URL-safe card ids and collector numbers', () => {
    const ids = CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const numbers = CARDS.map((c) => c.collectorNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('marks all prototype content as draft with placeholder art', () => {
    for (const card of CARDS) {
      expect(card.editorial.status).toBe('draft');
      expect(card.editorial.placeholderArt).toBe(true);
    }
  });

  it('defines the demo pack as five free, fixed cards including exactly one Legendary', () => {
    const pack = catalog.pack(DEMO_PACK_ID);
    expect(pack?.isDemo).toBe(true);
    expect(pack?.priceModel).toBe('free');
    const rarities = (pack?.contents.editionIds ?? []).map((id) => catalog.card(catalog.edition(id)?.cardId ?? '')?.rarity);
    expect(rarities).toHaveLength(5);
    expect(rarities.filter((r) => r === 'legendary')).toHaveLength(1);
  });

  it('rewards the David quest with a card that is not in the demo pack', () => {
    const quest = catalog.quest(VALLEY_OF_ELAH_ID);
    const cardReward = quest?.rewards.find((r) => r.kind === 'card');
    expect(cardReward).toBeDefined();
    if (cardReward?.kind === 'card') {
      expect(catalog.pack(DEMO_PACK_ID)?.contents.editionIds).not.toContain(cardReward.editionId);
    }
  });
});

describe('scripture excerpts', () => {
  it('are verbatim and marked when they continue beyond the excerpt', () => {
    const ruth = getPassage({ book: 'RUT', chapter: 1, verseStart: 16 });
    expect(ruth?.verses[0]?.text).toBe(BSB_VERSES['RUT 1:16']);
    expect(ruth?.continuesAfter).toBe(true);
    expect(ruth && passageText(ruth).endsWith(' …')).toBe(true);

    const joshua = getPassage({ book: 'JOS', chapter: 1, verseStart: 9 });
    expect(joshua?.continuesBefore).toBe(true);
    expect(joshua?.continuesAfter).toBe(false);

    const rainbow = getPassage({ book: 'GEN', chapter: 9, verseStart: 13 });
    expect(rainbow?.continuesBefore).toBe(false);
    expect(rainbow?.continuesAfter).toBe(false);

    const sea = getPassage({ book: 'EXO', chapter: 14, verseStart: 21 });
    expect(sea?.continuesAfter).toBe(true);
    const seaFull = getPassage({ book: 'EXO', chapter: 14, verseStart: 21, verseEnd: 22 });
    expect(seaFull?.continuesAfter).toBe(false);
  });

  it('returns undefined for verses outside the store', () => {
    expect(getPassage({ book: 'REV', chapter: 1, verseStart: 1 })).toBeUndefined();
    expect(getPassage({ book: 'GEN', chapter: 9 })).toBeUndefined();
  });
});

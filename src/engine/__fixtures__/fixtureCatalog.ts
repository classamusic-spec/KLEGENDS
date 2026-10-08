import { createCatalog } from '../catalog';
import type { CardDefinition } from '@/domain/cards';
import type { QuestDefinition } from '@/domain/quests';
import type { Rarity } from '@/domain/rarity';

/** Small, stable catalog for engine tests, independent of prototype content. */
const card = (id: string, rarity: Rarity, n: number): CardDefinition => ({
  id,
  subjectId: id,
  collectionId: 'fixture-set',
  collectorNumber: n,
  title: id,
  category: 'heroes',
  rarity,
  passage: { book: 'GEN', chapter: 1 },
  keyVerse: { book: 'GEN', chapter: 1, verseStart: 1 },
  summary: 'fixture',
  themes: [],
  artKey: id,
  editorial: { status: 'draft', revision: 1, placeholderArt: true },
});

export const FIXTURE_CARDS = [
  card('c1', 'common', 1),
  card('c2', 'common', 2),
  card('r1', 'rare', 3),
  card('e1', 'epic', 4),
  card('l1', 'legendary', 5),
  card('reward', 'rare', 6),
];

export const FIXTURE_QUEST: QuestDefinition = {
  id: 'fixture-quest',
  campaignId: 'fixture-campaign',
  chapterLabel: 'Chapter 1',
  title: 'Fixture Quest',
  subtitle: 'test',
  passage: { book: 'GEN', chapter: 1 },
  estimatedMinutes: 1,
  editorial: { status: 'draft', revision: 1, placeholderArt: true },
  steps: [
    { kind: 'narrative', id: 'intro', title: 'Intro', body: 'Once', narrativeKind: 'dramatization', sceneKey: 'x' },
    {
      kind: 'question',
      id: 'q1',
      prompt: '?',
      choices: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      correctChoiceId: 'b',
      explanation: 'B',
      source: { book: 'GEN', chapter: 1, verseStart: 1 },
    },
    {
      kind: 'discovery',
      id: 'stones',
      title: 'Stones',
      prompt: 'Pick',
      itemLabel: 'stone',
      required: 2,
      available: 3,
      source: { book: 'GEN', chapter: 1, verseStart: 1 },
    },
    { kind: 'reflection', id: 'reflect', title: 'Reflect', prompt: 'Think' },
  ],
  rewards: [
    { kind: 'card', editionId: 'reward/standard' },
    { kind: 'xp', amount: 150 },
  ],
};

export const fixtureCatalog = createCatalog({
  cards: FIXTURE_CARDS,
  editions: FIXTURE_CARDS.map((c) => ({ id: `${c.id}/standard`, cardId: c.id, kind: 'standard', name: 'Standard Edition' })),
  collections: [{ id: 'fixture-set', name: 'Fixture', series: 'Test', cardIds: FIXTURE_CARDS.map((c) => c.id) }],
  packThemes: [
    {
      id: 'theme',
      title: 'T',
      subtitle: 'S',
      crest: 'crown',
      foil: { base: '#000', mid: '#111', sheen: '#222' },
      accent: { dark: '#333', mid: '#444', light: '#555' },
    },
  ],
  packs: [
    {
      id: 'demo',
      name: 'Demo',
      description: 'fixed',
      cardsPerPack: 5,
      contents: { kind: 'fixed', editionIds: ['r1/standard', 'l1/standard', 'c1/standard', 'e1/standard', 'c1/standard'] },
      visualThemeId: 'theme',
      isDemo: true,
      priceModel: 'free',
    },
  ],
  quests: [FIXTURE_QUEST],
  campaigns: [
    {
      id: 'fixture-campaign',
      title: 'Fixture',
      subtitle: 'Campaign',
      summary: '',
      questIds: ['fixture-quest'],
      availability: 'available',
      atlasPosition: { x: 0.5, y: 0.5 },
      region: 'Test',
    },
  ],
});

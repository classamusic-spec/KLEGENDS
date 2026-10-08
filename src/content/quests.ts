import { standardEditionId } from '@/domain/cards';
import type { CampaignDefinition, QuestDefinition } from '@/domain/quests';

export const VALLEY_OF_ELAH_ID = 'valley-of-elah';

/**
 * David — Chapter 1: The Valley of Elah (1 Samuel 17).
 * Narrative steps marked `dramatization` contain artistic retelling and are
 * labeled as such in the UI; Scripture steps quote the BSB verbatim.
 * DRAFT: awaiting biblical editorial review.
 */
export const VALLEY_OF_ELAH: QuestDefinition = {
  id: VALLEY_OF_ELAH_ID,
  campaignId: 'david',
  chapterLabel: 'Chapter 1',
  title: 'The Valley of Elah',
  subtitle: 'A shepherd answers the giant’s challenge',
  passage: { book: '1SA', chapter: 17 },
  estimatedMinutes: 6,
  editorial: { status: 'draft', revision: 1, placeholderArt: true },
  steps: [
    {
      kind: 'narrative',
      id: 'two-armies',
      title: 'Two Armies, One Valley',
      body:
        'Morning light spills across the Valley of Elah. On one hill the army of Israel waits; on the other, the Philistines. Between them, a champion steps forward to challenge Israel — and no one answers.',
      narrativeKind: 'dramatization',
      sceneKey: 'valley-elah',
    },
    {
      kind: 'scripture',
      id: 'the-champion',
      title: 'The Champion of Gath',
      passage: { book: '1SA', chapter: 17, verseStart: 3, verseEnd: 4 },
    },
    {
      kind: 'scripture',
      id: 'a-shepherd-volunteers',
      title: 'A Shepherd Volunteers',
      lead: 'David, the youngest son of Jesse, has come to the camp with food for his brothers.',
      passage: { book: '1SA', chapter: 17, verseStart: 32 },
    },
    {
      kind: 'question',
      id: 'q-before-battle',
      prompt: 'What had David been doing before he came to the battle?',
      choices: [
        { id: 'sheep', text: 'Tending his father’s sheep' },
        { id: 'soldier', text: 'Training with Saul’s soldiers' },
        { id: 'priest', text: 'Serving in the tabernacle' },
      ],
      correctChoiceId: 'sheep',
      explanation: 'David told Saul he had been tending his father’s sheep, defending the flock from lions and bears.',
      source: { book: '1SA', chapter: 17, verseStart: 34 },
    },
    {
      kind: 'scripture',
      id: 'the-lord-delivers',
      title: 'The LORD Who Delivered Me',
      passage: { book: '1SA', chapter: 17, verseStart: 37 },
    },
    {
      kind: 'discovery',
      id: 'five-stones',
      title: 'Five Smooth Stones',
      prompt: 'David chose five smooth stones from the brook. Tap five stones to gather them into the shepherd’s bag.',
      itemLabel: 'smooth stone',
      required: 5,
      available: 8,
      source: { book: '1SA', chapter: 17, verseStart: 40 },
    },
    {
      kind: 'scripture',
      id: 'in-the-name',
      title: 'In the Name of the LORD',
      passage: { book: '1SA', chapter: 17, verseStart: 45 },
    },
    {
      kind: 'question',
      id: 'q-whose-battle',
      prompt: 'According to David, to whom does the battle belong?',
      choices: [
        { id: 'saul', text: 'King Saul' },
        { id: 'lord', text: 'The LORD' },
        { id: 'army', text: 'The strongest army' },
      ],
      correctChoiceId: 'lord',
      explanation: 'David declared before both armies that “the battle is the LORD’s.”',
      source: { book: '1SA', chapter: 17, verseStart: 47 },
    },
    {
      kind: 'scripture',
      id: 'one-stone',
      title: 'One Stone',
      passage: { book: '1SA', chapter: 17, verseStart: 49, verseEnd: 50 },
    },
    {
      kind: 'reflection',
      id: 'your-valley',
      title: 'Your Valley',
      prompt:
        'David trusted God when he faced a giant. What is one challenge you could face with courage this week? Your answer stays on this device.',
    },
  ],
  rewards: [
    { kind: 'card', editionId: standardEditionId('sling-and-stones') },
    { kind: 'xp', amount: 150 },
  ],
};

export const QUESTS: readonly QuestDefinition[] = [VALLEY_OF_ELAH];

export const CAMPAIGNS: readonly CampaignDefinition[] = [
  {
    id: 'david',
    title: 'David',
    subtitle: 'The Shepherd and the King',
    summary: 'From the sheepfolds of Bethlehem to the throne in Jerusalem.',
    questIds: [VALLEY_OF_ELAH_ID],
    availability: 'available',
    atlasPosition: { x: 0.46, y: 0.47 },
    region: 'Judah',
  },
  {
    id: 'moses',
    title: 'Moses',
    subtitle: 'The Deliverer',
    summary: 'Out of Egypt, through the sea, to the mountain of God.',
    questIds: [],
    availability: 'in_development',
    atlasPosition: { x: 0.24, y: 0.72 },
    region: 'Egypt & Sinai',
  },
  {
    id: 'esther',
    title: 'Esther',
    subtitle: 'Courage and Providence',
    summary: 'A queen in the Persian court, chosen for such a time as this.',
    questIds: [],
    availability: 'in_development',
    atlasPosition: { x: 0.84, y: 0.4 },
    region: 'Persia',
  },
];

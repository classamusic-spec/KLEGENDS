import type { EditorialMeta } from './content';
import type { Rarity } from './rarity';
import type { ScriptureReference } from './scripture';

export type CardId = string;
export type EditionId = string;
export type SubjectId = string;
export type QuestId = string;
export type CollectionId = string;

export type CardCategory = 'heroes' | 'women_of_faith' | 'miracles' | 'events' | 'artifacts' | 'scripture';

export const CARD_CATEGORY_LABEL: Readonly<Record<CardCategory, string>> = {
  heroes: 'Heroes',
  women_of_faith: 'Women of Faith',
  miracles: 'Miracles',
  events: 'Events',
  artifacts: 'Artifacts',
  scripture: 'Scripture',
};

/** A biblical person, event, place, or object. Story text is attached here once. */
export interface BiblicalSubject {
  readonly id: SubjectId;
  readonly name: string;
  readonly kind: 'person' | 'event' | 'artifact' | 'place';
}

/**
 * A card describes one stage of a biblical story ("David — The Giant Slayer").
 * Multiple cards can share a subject; they represent different moments of the
 * same story, never fictional power-ups.
 */
export interface CardDefinition {
  readonly id: CardId;
  readonly subjectId: SubjectId;
  readonly collectionId: CollectionId;
  readonly collectorNumber: number;
  readonly title: string;
  readonly epithet?: string;
  readonly category: CardCategory;
  readonly rarity: Rarity;
  /** The passage the card is drawn from. */
  readonly passage: ScriptureReference;
  /** The verse(s) quoted on the card's story panel. */
  readonly keyVerse: ScriptureReference;
  /** One-sentence faithful summary shown during inspection. */
  readonly summary: string;
  /** Character qualities highlighted by the story (not power stats). */
  readonly themes: readonly string[];
  /** Key into the procedural art registry. */
  readonly artKey: string;
  readonly relatedQuestId?: QuestId;
  readonly editorial: EditorialMeta;
}

export type EditionKind = 'standard' | 'holo' | 'celestial';

/** A collectible print of a card. Cosmetic variants never change story content. */
export interface CardEdition {
  readonly id: EditionId;
  readonly cardId: CardId;
  readonly kind: EditionKind;
  readonly name: string;
}

export interface CollectionDefinition {
  readonly id: CollectionId;
  readonly name: string;
  readonly series: string;
  readonly cardIds: readonly CardId[];
}

export const standardEditionId = (cardId: CardId): EditionId => `${cardId}/standard`;

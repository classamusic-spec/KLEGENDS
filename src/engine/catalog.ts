import type {
  CardDefinition,
  CardEdition,
  CardId,
  CollectionDefinition,
  EditionId,
  QuestId,
} from '@/domain/cards';
import type { PackDefinition, PackDefinitionId, PackVisualTheme } from '@/domain/packs';
import type { CampaignDefinition, QuestDefinition } from '@/domain/quests';

/** Read-only lookup over published content. Built once from content data. */
export interface Catalog {
  readonly cards: readonly CardDefinition[];
  readonly collections: readonly CollectionDefinition[];
  readonly campaigns: readonly CampaignDefinition[];
  card(id: CardId): CardDefinition | undefined;
  edition(id: EditionId): CardEdition | undefined;
  editionsForCard(id: CardId): readonly CardEdition[];
  pack(id: PackDefinitionId): PackDefinition | undefined;
  packTheme(id: string): PackVisualTheme | undefined;
  quest(id: QuestId): QuestDefinition | undefined;
}

export interface CatalogSource {
  readonly cards: readonly CardDefinition[];
  readonly editions: readonly CardEdition[];
  readonly collections: readonly CollectionDefinition[];
  readonly packs: readonly PackDefinition[];
  readonly packThemes: readonly PackVisualTheme[];
  readonly quests: readonly QuestDefinition[];
  readonly campaigns: readonly CampaignDefinition[];
}

const indexBy = <T extends { id: string }>(items: readonly T[], label: string): Map<string, T> => {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) throw new Error(`Duplicate ${label} id "${item.id}" in content`);
    map.set(item.id, item);
  }
  return map;
};

/**
 * Builds the catalog and validates referential integrity, so broken content
 * fails loudly at startup (and in tests) instead of corrupting inventories.
 */
export const createCatalog = (source: CatalogSource): Catalog => {
  const cards = indexBy(source.cards, 'card');
  const editions = indexBy(source.editions, 'edition');
  const packs = indexBy(source.packs, 'pack');
  const themes = indexBy(source.packThemes, 'pack theme');
  const quests = indexBy(source.quests, 'quest');
  indexBy(source.collections, 'collection');
  indexBy(source.campaigns, 'campaign');

  const editionsByCard = new Map<CardId, CardEdition[]>();
  for (const edition of source.editions) {
    if (!cards.has(edition.cardId)) throw new Error(`Edition ${edition.id} references unknown card ${edition.cardId}`);
    editionsByCard.set(edition.cardId, [...(editionsByCard.get(edition.cardId) ?? []), edition]);
  }
  for (const card of source.cards) {
    if (!editionsByCard.has(card.id)) throw new Error(`Card ${card.id} has no editions`);
    if (card.relatedQuestId && !quests.has(card.relatedQuestId)) {
      throw new Error(`Card ${card.id} references unknown quest ${card.relatedQuestId}`);
    }
  }
  for (const pack of source.packs) {
    if (!themes.has(pack.visualThemeId)) throw new Error(`Pack ${pack.id} references unknown theme`);
    if (pack.contents.editionIds.length !== pack.cardsPerPack) {
      throw new Error(`Pack ${pack.id} fixed contents do not match cardsPerPack`);
    }
    for (const id of pack.contents.editionIds) {
      if (!editions.has(id)) throw new Error(`Pack ${pack.id} references unknown edition ${id}`);
    }
  }
  for (const quest of source.quests) {
    for (const reward of quest.rewards) {
      if (reward.kind === 'card' && !editions.has(reward.editionId)) {
        throw new Error(`Quest ${quest.id} rewards unknown edition ${reward.editionId}`);
      }
    }
    const stepIds = new Set<string>();
    for (const step of quest.steps) {
      if (stepIds.has(step.id)) throw new Error(`Quest ${quest.id} has duplicate step ${step.id}`);
      stepIds.add(step.id);
      if (step.kind === 'question' && !step.choices.some((c) => c.id === step.correctChoiceId)) {
        throw new Error(`Quest ${quest.id} step ${step.id} has no matching correct choice`);
      }
      if (step.kind === 'discovery' && step.required > step.available) {
        throw new Error(`Quest ${quest.id} step ${step.id} requires more items than available`);
      }
    }
  }
  for (const collection of source.collections) {
    for (const id of collection.cardIds) {
      if (!cards.has(id)) throw new Error(`Collection ${collection.id} references unknown card ${id}`);
    }
  }
  for (const campaign of source.campaigns) {
    for (const id of campaign.questIds) {
      if (!quests.has(id)) throw new Error(`Campaign ${campaign.id} references unknown quest ${id}`);
    }
  }

  return {
    cards: source.cards,
    collections: source.collections,
    campaigns: source.campaigns,
    card: (id) => cards.get(id),
    edition: (id) => editions.get(id),
    editionsForCard: (id) => editionsByCard.get(id) ?? [],
    pack: (id) => packs.get(id),
    packTheme: (id) => themes.get(id),
    quest: (id) => quests.get(id),
  };
};

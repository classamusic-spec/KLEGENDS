import type { CatalogSource } from './catalog';
import type { CardId, EditionId } from '@/domain/cards';
import type { Inventory, InventoryEntry } from '@/domain/player';

export interface GrantedItem {
  readonly editionId: EditionId;
  readonly cardId: CardId;
  readonly isNew: boolean;
  readonly copiesAfter: number;
}

/**
 * Adds editions to an inventory in order. Duplicates inside the same grant are
 * handled sequentially: only the first copy of an edition counts as new.
 */
export const grantEditions = (
  inventory: Inventory,
  items: readonly { editionId: EditionId; cardId: CardId }[],
  at: string,
): { inventory: Inventory; granted: GrantedItem[] } => {
  const next: Record<EditionId, InventoryEntry> = { ...inventory };
  const granted: GrantedItem[] = [];
  for (const { editionId, cardId } of items) {
    const existing = next[editionId];
    const entry: InventoryEntry = existing
      ? { ...existing, copies: existing.copies + 1, lastAcquiredAt: at }
      : { editionId, cardId, copies: 1, firstAcquiredAt: at, lastAcquiredAt: at, favorite: false };
    next[editionId] = entry;
    granted.push({ editionId, cardId, isNew: !existing, copiesAfter: entry.copies });
  }
  return { inventory: next, granted };
};

export const setFavorite = (inventory: Inventory, editionId: EditionId, favorite: boolean): Inventory => {
  const entry = inventory[editionId];
  if (!entry || entry.favorite === favorite) return inventory;
  return { ...inventory, [editionId]: { ...entry, favorite } };
};

/** Cards the player owns at least one edition of. */
export const ownedCardIds = (inventory: Inventory): Set<CardId> =>
  new Set(Object.values(inventory).map((entry) => entry.cardId));

export interface CollectionProgress {
  readonly owned: number;
  readonly total: number;
  readonly fraction: number;
}

export const collectionProgress = (
  inventory: Inventory,
  collection: CatalogSource['collections'][number],
): CollectionProgress => {
  const owned = ownedCardIds(inventory);
  const count = collection.cardIds.filter((id) => owned.has(id)).length;
  const total = collection.cardIds.length;
  return { owned: count, total, fraction: total === 0 ? 0 : count / total };
};

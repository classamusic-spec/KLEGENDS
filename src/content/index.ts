import { CARDS, COLLECTIONS, EDITIONS } from './cards';
import { PACKS, PACK_THEMES } from './packs';
import { CAMPAIGNS, QUESTS } from './quests';
import { createCatalog, type Catalog } from '@/engine/catalog';

export { COLLECTION_ID } from './cards';
export { DEMO_PACK_ID, KINGDOM_DISCOVERY_THEME } from './packs';
export { VALLEY_OF_ELAH_ID } from './quests';

/** The validated content catalog. Throws at startup if content is inconsistent. */
export const catalog: Catalog = createCatalog({
  cards: CARDS,
  editions: EDITIONS,
  collections: COLLECTIONS,
  packs: PACKS,
  packThemes: PACK_THEMES,
  quests: QUESTS,
  campaigns: CAMPAIGNS,
});

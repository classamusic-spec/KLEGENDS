import { standardEditionId } from '@/domain/cards';
import type { PackDefinition, PackVisualTheme } from '@/domain/packs';

export const KINGDOM_DISCOVERY_THEME: PackVisualTheme = {
  id: 'kingdom-discovery',
  title: 'KINGDOM LEGENDS',
  subtitle: 'DISCOVERY PACK',
  crest: 'crown',
  foil: { base: '#0C1220', mid: '#1A2A46', sheen: '#41639A' },
  accent: { dark: '#5E4627', mid: '#C6A46A', light: '#F3DFA8' },
};

export const DEMO_PACK_ID = 'kingdom-discovery-demo';

/**
 * The Milestone 1 demonstration pack: five known cards including one
 * Legendary, so the full reveal can be experienced. The UI labels it as a
 * demo with fixed contents — it does not represent live reward odds.
 */
export const PACKS: readonly PackDefinition[] = [
  {
    id: DEMO_PACK_ID,
    name: 'Kingdom Discovery Pack',
    description: 'Five cards. Demo pack with fixed contents — not live reward odds.',
    cardsPerPack: 5,
    contents: {
      kind: 'fixed',
      editionIds: [
        standardEditionId('joshua-courage'),
        standardEditionId('david-giant-slayer'),
        standardEditionId('ruth-loyal'),
        standardEditionId('esther-courage'),
        standardEditionId('david-shepherd'),
      ],
    },
    visualThemeId: KINGDOM_DISCOVERY_THEME.id,
    isDemo: true,
    priceModel: 'free',
  },
];

export const PACK_THEMES: readonly PackVisualTheme[] = [KINGDOM_DISCOVERY_THEME];

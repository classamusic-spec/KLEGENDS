import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { catalog, COLLECTION_ID } from '@/content';
import { colors, spacing } from '@/design/tokens';
import { CARD_CATEGORY_LABEL, type CardCategory, type CardDefinition } from '@/domain/cards';
import { RARITIES, RARITY_LABEL } from '@/domain/rarity';
import { CardThumb } from '@/features/cards/CardThumb';
import { useCollectionProgress, useGame } from '@/state/game';
import { AppText } from '@/ui/AppText';
import { Chip } from '@/ui/controls';
import { Panel } from '@/ui/Panel';
import { ProgressBar } from '@/ui/ProgressBar';
import { RarityEmblem } from '@/ui/RarityBadge';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

type Filter = 'all' | 'discovered' | 'undiscovered' | 'favorites' | CardCategory;

interface OwnedInfo {
  readonly copies: number;
  readonly favorite: boolean;
}

const EMPTY_COPY: Readonly<Record<string, string>> = {
  discovered: 'No cards discovered yet. Open a pack in the Royal Treasury to begin your collection.',
  undiscovered: 'Every card in this collection has been discovered. Well done!',
  favorites: 'No favorites yet. Tap the heart in the Artifact Chamber to keep a card close.',
};

/**
 * The Royal Archive: the binder of every card in the collection. Grid cells
 * are pre-rendered images, never live shaders; undiscovered cards appear as
 * silhouettes so the shape of the set is always visible.
 */
export function CollectionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const progress = useCollectionProgress();
  const ownedMap = useGame(
    (db) => {
      const map: Record<string, OwnedInfo> = {};
      for (const entry of Object.values(db.inventory)) {
        const prev = map[entry.cardId];
        map[entry.cardId] = { copies: (prev?.copies ?? 0) + entry.copies, favorite: (prev?.favorite ?? false) || entry.favorite };
      }
      return map;
    },
    {} as Record<string, OwnedInfo>,
  );

  const collection = catalog.collections.find((c) => c.id === COLLECTION_ID);
  const cards = useMemo(
    () =>
      (collection?.cardIds ?? [])
        .map((id) => catalog.card(id))
        .filter((card): card is CardDefinition => card !== undefined)
        .sort((a, b) => a.collectorNumber - b.collectorNumber),
    [collection],
  );
  const categories = useMemo(() => [...new Set(cards.map((card) => card.category))], [cards]);

  const visible = cards.filter((card) => {
    const owned = ownedMap[card.id];
    switch (filter) {
      case 'all':
        return true;
      case 'discovered':
        return owned !== undefined;
      case 'undiscovered':
        return owned === undefined;
      case 'favorites':
        return owned?.favorite === true;
      default:
        return card.category === filter;
    }
  });

  const rarityCounts = RARITIES.map((rarity) => ({
    rarity,
    total: cards.filter((card) => card.rarity === rarity).length,
    owned: cards.filter((card) => card.rarity === rarity && ownedMap[card.id]).length,
  }));

  const columns = 3;
  const gap = spacing.md;
  const contentWidth = Math.min(width, 640) - spacing.gutter * 2;
  const tileW = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'discovered', label: 'Discovered' },
    { id: 'undiscovered', label: 'Undiscovered' },
    { id: 'favorites', label: 'Favorites' },
    ...categories.map((category) => ({ id: category as Filter, label: CARD_CATEGORY_LABEL[category] })),
  ];

  return (
    <Screen inTabs testID="collection">
      <ScreenHeader eyebrow="The Royal Archive" title={collection?.name ?? 'Collection'} subtitle={collection?.series} />

      <Panel style={styles.progressPanel}>
        <View style={styles.rowBetween}>
          <AppText variant="displayS">{`${progress.owned} of ${progress.total} discovered`}</AppText>
          <AppText variant="label" color={colors.gold}>{`${Math.round(progress.fraction * 100)}%`}</AppText>
        </View>
        <ProgressBar value={progress.fraction} accessibilityLabel={`Collection progress: ${progress.owned} of ${progress.total} cards`} />
        <View style={styles.rarityRow}>
          {rarityCounts.map(({ rarity, owned, total }) => (
            <View key={rarity} style={styles.rarityCount} accessible accessibilityLabel={`${RARITY_LABEL[rarity]}: ${owned} of ${total}`}>
              <RarityEmblem rarity={rarity} size={12} />
              <AppText variant="caption">{`${owned}/${total}`}</AppText>
            </View>
          ))}
        </View>
      </Panel>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterScroll}>
        {filters.map((f) => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} testID={`filter-${f.id}`} />
        ))}
      </ScrollView>

      {visible.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <AppText variant="body" align="center">
            {EMPTY_COPY[filter] ?? 'No cards match this filter yet.'}
          </AppText>
        </Animated.View>
      ) : (
        <View style={[styles.grid, { gap }]} accessibilityLabel={`${visible.length} cards`}>
          {visible.map((card) => {
            const owned = ownedMap[card.id];
            return (
              <CardThumb
                key={card.id}
                cardId={card.id}
                owned={owned !== undefined}
                copies={owned?.copies}
                favorite={owned?.favorite}
                width={tileW}
                onPress={() => router.push({ pathname: '/card/[cardId]', params: { cardId: card.id } })}
                testID={`archive-${card.id}`}
              />
            );
          })}
        </View>
      )}
      <AppText variant="caption" align="center" color={colors.textMuted}>
        {`${cards.length} cards in ${collection?.series ?? 'this series'} · standard editions`}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressPanel: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rarityRow: { flexDirection: 'row', gap: spacing.lg, marginTop: 2 },
  rarityCount: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterScroll: { marginHorizontal: -spacing.gutter, flexGrow: 0 },
  filters: { paddingHorizontal: spacing.gutter, gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg },
});

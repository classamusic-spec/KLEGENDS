import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { catalog } from '@/content';
import { colors, radii, rarityMaterials, spacing } from '@/design/tokens';
import type { CardId } from '@/domain/cards';
import type { PackOpening, PackOpeningItem } from '@/domain/packs';
import { RARITY_LABEL } from '@/domain/rarity';
import { presentationOrder } from '@/engine/packReveal';
import { feedback } from '@/feedback';
import { useCardThumbnail } from '@/graphics/card/textures';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { OrnamentDivider } from '@/ui/controls';
import { RarityEmblem } from '@/ui/RarityBadge';

export interface TreasurySummaryProps {
  readonly opening: PackOpening;
  readonly width: number;
  readonly insets: { readonly top: number; readonly bottom: number };
  readonly reducedMotion: boolean;
  readonly onInspect: (cardId: CardId) => void;
  readonly onCollection: () => void;
  readonly onClose: () => void;
}

function SummaryTile({ item, width, onPress }: { item: PackOpeningItem; width: number; onPress: () => void }) {
  const card = catalog.card(item.cardId);
  const uri = useCardThumbnail(item.cardId, Math.round(width * 3), false);
  const material = rarityMaterials[item.rarity];
  const height = (width * 88) / 63;
  if (!card) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}${card.epithet ? `, ${card.epithet}` : ''}. ${RARITY_LABEL[item.rarity]}. ${item.isNew ? 'New.' : `${item.copiesAfter} copies.`} Inspect.`}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { width }, pressed ? styles.pressed : null]}
      testID={`summary-card-${item.cardId}`}
    >
      <View style={[styles.thumbFrame, { width, height, borderColor: material.metal[1] }]}>
        {uri ? <Image source={{ uri }} style={{ width, height }} resizeMode="cover" aria-hidden /> : <View style={styles.thumbPlaceholder} />}
      </View>
      {item.isNew ? (
        <View style={styles.newBadge}>
          <AppText variant="eyebrow" color={colors.textOnGold} style={styles.newText}>
            New
          </AppText>
        </View>
      ) : null}
      <View style={styles.tileMeta}>
        <RarityEmblem rarity={item.rarity} size={11} />
        <AppText variant="label" numberOfLines={1} style={styles.tileName}>
          {card.title}
        </AppText>
      </View>
      <AppText variant="caption" color={item.isNew ? material.label : colors.textMuted} numberOfLines={1}>
        {item.isNew ? RARITY_LABEL[item.rarity] : `Duplicate · ×${item.copiesAfter}`}
      </AppText>
    </Pressable>
  );
}

/**
 * The end of the opening: everything that was added, in reveal order,
 * with clear next steps. Shown after the last card or when skipping.
 */
export function TreasurySummary({ opening, width, insets, reducedMotion, onInspect, onCollection, onClose }: TreasurySummaryProps) {
  const items = presentationOrder(opening.items)
    .map((index) => opening.items[index])
    .filter((item): item is PackOpeningItem => item !== undefined);
  const newCount = items.filter((item) => item.isNew).length;
  const columns = 3;
  const gap = spacing.md;
  const tileW = Math.floor((Math.min(width, 520) - spacing.gutter * 2 - gap * (columns - 1)) / columns);
  const enter = (i: number) => (reducedMotion ? FadeIn.duration(150) : FadeInDown.delay(120 + i * 90).duration(420));
  const pack = catalog.pack(opening.packDefinitionId);

  return (
    <ScrollView
      style={StyleSheet.absoluteFill}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + spacing.xxl }]}
      testID="treasury-summary"
    >
      <Animated.View entering={reducedMotion ? FadeIn.duration(150) : FadeInDown.duration(420)} style={styles.header}>
        <AppText variant="eyebrow">Pack opened</AppText>
        <AppText variant="displayL" align="center">
          Your Discoveries
        </AppText>
        <OrnamentDivider style={styles.divider} />
        <AppText variant="body" align="center">
          {`${items.length} cards added to your collection${newCount > 0 ? ` · ${newCount} new` : ''}.`}
        </AppText>
        {opening.isDemo ? (
          <AppText variant="caption" align="center" color={colors.textMuted} style={styles.demo}>
            {`${pack?.name ?? 'Demo pack'} · demo pack with fixed contents, not live reward odds.`}
          </AppText>
        ) : null}
      </Animated.View>

      <View style={[styles.grid, { gap, maxWidth: tileW * columns + gap * (columns - 1) }]}>
        {items.map((item, i) => (
          <Animated.View key={item.index} entering={enter(i)}>
            <SummaryTile item={item} width={tileW} onPress={() => onInspect(item.cardId)} />
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={enter(items.length)} style={styles.actions}>
        <Button label="View Collection" icon="collection" onPress={onCollection} testID="summary-collection" />
        <Button label="Return to Royal Hall" variant="secondary" onPress={onClose} testID="summary-close" />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingHorizontal: spacing.gutter },
  header: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl },
  divider: { marginVertical: spacing.sm },
  demo: { marginTop: spacing.xs, maxWidth: 320 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  tile: { gap: 4, marginBottom: spacing.sm },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  thumbFrame: { borderRadius: radii.sm, overflow: 'hidden', borderWidth: 1, backgroundColor: colors.surface },
  thumbPlaceholder: { flex: 1, backgroundColor: colors.surfaceElevated },
  newBadge: {
    position: 'absolute',
    top: -7,
    right: -5,
    backgroundColor: colors.goldBright,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newText: { fontSize: 9, letterSpacing: 1.4 },
  tileMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  tileName: { flexShrink: 1 },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl, maxWidth: 520, width: '100%' },
});

import { Image, PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { catalog } from '@/content';
import { colors, radii, rarityMaterials } from '@/design/tokens';
import type { CardId } from '@/domain/cards';
import { RARITY_LABEL } from '@/domain/rarity';
import { feedback } from '@/feedback';
import { useCardThumbnail } from '@/graphics/card/textures';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';
import { RarityEmblem } from '@/ui/RarityBadge';

export interface CardThumbProps {
  readonly cardId: CardId;
  readonly owned: boolean;
  readonly width: number;
  readonly copies?: number;
  readonly favorite?: boolean;
  readonly showMeta?: boolean;
  readonly onPress?: () => void;
  readonly testID?: string;
}

/**
 * A card in a grid: a flattened, pre-rendered image (no live shader), so a
 * whole binder costs no more than a few pictures. Undiscovered cards show
 * their silhouette and number only.
 */
export function CardThumb({ cardId, owned, width, copies = 0, favorite = false, showMeta = true, onPress, testID }: CardThumbProps) {
  const card = catalog.card(cardId);
  const uri = useCardThumbnail(cardId, Math.round(width * Math.min(3, PixelRatio.get())), !owned);
  const height = (width * 88) / 63;
  if (!card) return null;
  const material = rarityMaterials[card.rarity];
  const number = `No. ${String(card.collectorNumber).padStart(2, '0')}`;
  const label = owned
    ? `${card.title}${card.epithet ? `, ${card.epithet}` : ''}. ${RARITY_LABEL[card.rarity]}.${copies > 1 ? ` ${copies} copies.` : ''}${favorite ? ' Favorite.' : ''}`
    : `${card.title}, not yet discovered. ${number}.`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={owned ? 'Opens the Artifact Chamber' : 'Shows how to discover this card'}
      onPress={() => {
        if (!onPress) return;
        feedback.tap();
        onPress();
      }}
      disabled={!onPress}
      style={({ pressed }) => [{ width }, pressed ? styles.pressed : null]}
      testID={testID}
    >
      <View style={[styles.frame, { width, height, borderColor: owned ? material.metal[1] : colors.borderSubtle }]}>
        {uri ? <Image source={{ uri }} style={{ width, height }} resizeMode="cover" aria-hidden /> : <View style={styles.placeholder} />}
        {!owned ? (
          <View style={styles.lock}>
            <Icon name="lock" size={14} color={colors.textMuted} />
          </View>
        ) : null}
        {owned && copies > 1 ? (
          <View style={styles.copies}>
            <AppText variant="caption" color={colors.parchment} style={styles.copiesText}>
              {`×${copies}`}
            </AppText>
          </View>
        ) : null}
        {favorite ? (
          <View style={styles.favorite}>
            <Icon name="heart" size={13} color={colors.goldBright} filled />
          </View>
        ) : null}
      </View>
      {showMeta ? (
        <View style={styles.meta}>
          <View style={styles.titleRow}>
            {owned ? <RarityEmblem rarity={card.rarity} size={10} /> : null}
            <AppText variant="label" numberOfLines={1} color={owned ? colors.textPrimary : colors.textMuted} style={styles.title}>
              {card.title}
            </AppText>
          </View>
          <AppText variant="caption" numberOfLines={1} color={colors.textMuted}>
            {owned ? (card.epithet ?? number) : `${number} · Undiscovered`}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  frame: { borderRadius: radii.sm, borderWidth: 1, overflow: 'hidden', backgroundColor: colors.surface },
  placeholder: { flex: 1, backgroundColor: colors.surfaceElevated },
  lock: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 10, 14, 0.75)',
  },
  copies: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 10, 14, 0.8)',
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  copiesText: { fontSize: 10, lineHeight: 14 },
  favorite: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 10, 14, 0.75)',
  },
  meta: { marginTop: 6, gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { flexShrink: 1 },
});

import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppText } from './AppText';
import { rarityMaterials } from '@/design/tokens';
import { RARITY_EMBLEM, RARITY_LABEL, type Rarity } from '@/domain/rarity';

/** Distinct shape per rarity — rarity is never conveyed by color alone. */
export function RarityEmblem({ rarity, size = 14 }: { rarity: Rarity; size?: number }) {
  const material = rarityMaterials[rarity];
  const fill = material.metal[2];
  const stroke = material.metal[3];
  const shape = RARITY_EMBLEM[rarity];
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessible={false}>
      {shape === 'circle' ? <Circle cx={8} cy={8} r={5.2} fill={fill} stroke={stroke} strokeWidth={1} /> : null}
      {shape === 'diamond' ? <Path d="M8 1.8 13.6 8 8 14.2 2.4 8Z" fill={fill} stroke={stroke} strokeWidth={1} /> : null}
      {shape === 'star' ? (
        <Path d="M8 1.6l1.9 4.1 4.5.5-3.3 3.1.9 4.4L8 11.5l-4 2.2.9-4.4-3.3-3.1 4.5-.5Z" fill={fill} stroke={stroke} strokeWidth={0.9} />
      ) : null}
      {shape === 'crown' ? <Path d="M2.4 12.4 1.8 5l3.6 2.8L8 3.2l2.6 4.6L14.2 5l-.6 7.4Z" fill={fill} stroke={stroke} strokeWidth={0.9} /> : null}
    </Svg>
  );
}

export interface RarityBadgeProps {
  readonly rarity: Rarity;
  readonly compact?: boolean;
}

export function RarityBadge({ rarity, compact = false }: RarityBadgeProps) {
  const material = rarityMaterials[rarity];
  return (
    <View
      accessible
      accessibilityLabel={`${RARITY_LABEL[rarity]} rarity`}
      style={[styles.badge, { borderColor: `${material.metal[1]}` }, compact ? styles.compact : null]}
    >
      <RarityEmblem rarity={rarity} size={compact ? 11 : 14} />
      <AppText variant="eyebrow" color={material.label} style={compact ? styles.compactText : null}>
        {RARITY_LABEL[rarity]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(11, 13, 18, 0.7)',
    alignSelf: 'flex-start',
  },
  compact: { paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, backgroundColor: 'transparent', gap: 4 },
  compactText: { fontSize: 9, letterSpacing: 1.6 },
});

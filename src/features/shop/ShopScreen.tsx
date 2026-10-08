import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/design/tokens';
import { AppText } from '@/ui/AppText';
import { Icon, type IconName } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

const PROMISES = [
  'Discovery Packs are free and are never sold.',
  'No paid randomized rewards of any kind.',
  'Nothing for sale changes gameplay — cosmetics only.',
  'Scripture and stories are never behind a paywall.',
] as const;

const PLANNED: readonly { title: string; body: string; icon: IconName }[] = [
  { title: 'Celestial Card Backs', body: 'A starlit finish for the backs of your cards.', icon: 'sparkle' },
  { title: 'Sapphire Treasury', body: 'An alternate chamber for opening your packs.', icon: 'crown' },
  { title: 'Gilded Archive Covers', body: 'Leather-and-gold covers for the Royal Archive.', icon: 'collection' },
];

/**
 * The Royal Shop — an honest preview. Nothing can be bought in this
 * prototype and no payment system is connected; the screen says so.
 */
export function ShopScreen() {
  return (
    <Screen inTabs testID="shop">
      <ScreenHeader eyebrow="The Royal Shop" title="Coming Later" subtitle="A preview of the cosmetic shop planned for a future release." />

      <Panel ornate style={styles.panel}>
        <AppText variant="eyebrow">Our promises</AppText>
        {PROMISES.map((promise) => (
          <View key={promise} style={styles.promise}>
            <Icon name="check" size={18} color={colors.success} />
            <AppText variant="bodyStrong" style={styles.flex}>
              {promise}
            </AppText>
          </View>
        ))}
      </Panel>

      <AppText variant="eyebrow">Planned cosmetics</AppText>
      {PLANNED.map((item) => (
        <View key={item.title} style={styles.item} accessible accessibilityLabel={`${item.title}. ${item.body} Planned, not available.`}>
          <View style={styles.itemIcon}>
            <Icon name={item.icon} size={22} color={colors.gold} />
          </View>
          <View style={styles.flex}>
            <AppText variant="title">{item.title}</AppText>
            <AppText variant="body">{item.body}</AppText>
          </View>
          <View style={styles.planned}>
            <AppText variant="caption" color={colors.textSecondary}>
              Planned
            </AppText>
          </View>
        </View>
      ))}

      <View style={styles.notice}>
        <Icon name="lock" size={16} color={colors.textMuted} />
        <AppText variant="caption" style={styles.flex}>
          Nothing can be purchased in this prototype and no payment system is connected.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
  promise: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  itemIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGold },
  planned: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 10, paddingVertical: 3 },
  notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});

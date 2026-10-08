import { useIsFocused, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useTreasuryEntry } from './useTreasuryEntry';
import { catalog, DEMO_PACK_ID, KINGDOM_DISCOVERY_THEME } from '@/content';
import { colors, spacing } from '@/design/tokens';
import { RARITIES, RARITY_LABEL } from '@/domain/rarity';
import { useFrameTime } from '@/graphics/fx/useFrameTime';
import { PackPreview } from '@/graphics/pack/PackPreview';
import { formatCountdown, useNow } from '@/lib/time';
import { useReducedMotion } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { OrnamentDivider } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';
import { RarityEmblem } from '@/ui/RarityBadge';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

/**
 * Pack selection: the pack on display, what it contains, and the way in.
 * Packs are always free; the daily claim is decided by the game service.
 */
export function PackSelectionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const now = useNow(1000, focused);
  const { entry, claim, claiming, error } = useTreasuryEntry(now);
  const time = useFrameTime(focused && !reducedMotion);
  const pack = catalog.pack(DEMO_PACK_ID);
  const contents = (pack?.contents.editionIds ?? []).map((id) => catalog.edition(id)).map((edition) => (edition ? catalog.card(edition.cardId) : undefined));
  const counts = RARITIES.map((rarity) => ({ rarity, count: contents.filter((card) => card?.rarity === rarity).length })).filter((c) => c.count > 0);

  const open = (grantId: string) => router.push({ pathname: '/treasury', params: { grantId } });
  const onClaim = async () => {
    const grantId = await claim();
    if (grantId) open(grantId);
  };

  return (
    <Screen testID="packs">
      <ScreenHeader eyebrow="The Royal Treasury" title="Choose a Pack" onBack={() => router.back()} />

      <Animated.View entering={reducedMotion ? FadeIn : FadeInDown.duration(500)} style={styles.stage}>
        <PackPreview theme={KINGDOM_DISCOVERY_THEME} width={Math.min(width * 0.5, 210)} time={time} sway={reducedMotion ? 0 : 1} />
      </Animated.View>

      <Panel ornate style={styles.details}>
        <AppText variant="displayM" align="center">
          {pack?.name ?? 'Discovery Pack'}
        </AppText>
        <AppText variant="body" align="center">
          {`${pack?.cardsPerPack ?? 5} cards from Kingdom Discovery · Series I`}
        </AppText>
        <OrnamentDivider style={styles.divider} />
        <View style={styles.counts} accessible accessibilityLabel={`Contains ${counts.map((c) => `${c.count} ${RARITY_LABEL[c.rarity]}`).join(', ')}`}>
          {counts.map(({ rarity, count }) => (
            <View key={rarity} style={styles.count}>
              <RarityEmblem rarity={rarity} size={13} />
              <AppText variant="label" color={colors.textSecondary}>{`${count} ${RARITY_LABEL[rarity]}`}</AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" align="center" color={colors.notice} style={styles.demo}>
          Demo pack with fixed contents. It always holds these five cards and does not represent live reward odds.
        </AppText>
      </Panel>

      <View style={styles.actions}>
        {entry.kind === 'resume' ? (
          <>
            <AppText variant="body" align="center">{`Your last opening was interrupted after ${entry.revealed} of ${entry.total} cards. Your cards are already in your collection.`}</AppText>
            <Button label="Resume Opening" icon="replay" onPress={() => open(entry.grantId)} testID="packs-resume" />
          </>
        ) : null}
        {entry.kind === 'open' ? <Button label="Open Pack" icon="sparkle" onPress={() => open(entry.grantId)} testID="packs-open" /> : null}
        {entry.kind === 'claim' ? (
          <>
            <Button label="Claim Today’s Free Pack" icon="sparkle" onPress={onClaim} loading={claiming} sound="confirm" testID="packs-claim" />
            <AppText variant="caption" align="center">
              One free Discovery Pack each day. Packs are never sold.
            </AppText>
          </>
        ) : null}
        {entry.kind === 'wait' ? (
          <>
            <View style={styles.wait} testID="packs-wait" accessible accessibilityRole="timer">
              <Icon name="lock" size={16} color={colors.textSecondary} />
              <AppText variant="label" color={colors.textSecondary}>{`Next free pack in ${formatCountdown(entry.nextAvailableAt, now)}`}</AppText>
            </View>
            <AppText variant="caption" align="center">
              Today’s pack has been opened. A new free pack arrives at midnight, local time — nothing is lost by taking a break.
            </AppText>
          </>
        ) : null}
        {error ? (
          <Animated.View entering={FadeIn}>
            <AppText variant="caption" align="center" color={colors.error} accessibilityLiveRegion="polite">
              {error}
            </AppText>
          </Animated.View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', marginVertical: spacing.sm },
  details: { gap: spacing.xs, alignItems: 'center' },
  divider: { marginVertical: spacing.sm },
  counts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  count: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  demo: { marginTop: spacing.sm },
  actions: { gap: spacing.sm },
  wait: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: 'rgba(17, 21, 28, 0.6)',
  },
});

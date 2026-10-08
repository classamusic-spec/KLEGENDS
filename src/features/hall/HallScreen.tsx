import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { catalog, KINGDOM_DISCOVERY_THEME, VALLEY_OF_ELAH_ID } from '@/content';
import { colors, spacing } from '@/design/tokens';
import type { CardId } from '@/domain/cards';
import { RARITY_LABEL } from '@/domain/rarity';
import { formatReference } from '@/domain/scripture';
import { audio } from '@/feedback';
import { CardThumb } from '@/features/cards/CardThumb';
import { HeroCard } from '@/features/cards/HeroCard';
import { useTreasuryEntry } from '@/features/treasury/useTreasuryEntry';
import { useFrameTime } from '@/graphics/fx/useFrameTime';
import { PackPreview } from '@/graphics/pack/PackPreview';
import { formatCountdown, useNow } from '@/lib/time';
import { useCollectionProgress, useGame, useLevel, useOwnedCardIds, useQuestProgress } from '@/state/game';
import { useReducedMotion } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';
import { ProgressBar } from '@/ui/ProgressBar';
import { RarityBadge } from '@/ui/RarityBadge';
import { Screen } from '@/ui/Screen';

const FEATURED_CARD: CardId = 'david-giant-slayer';

const useRecentCards = (): CardId[] =>
  useGame(
    (db) =>
      Object.values(db.inventory)
        .sort((a, b) => b.lastAcquiredAt.localeCompare(a.lastAcquiredAt))
        .slice(0, 4)
        .map((entry) => entry.cardId),
    [],
  );

function TreasuryPanel() {
  const router = useRouter();
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const now = useNow(1000, focused);
  const { entry } = useTreasuryEntry(now);
  const time = useFrameTime(focused && !reducedMotion);

  const status =
    entry.kind === 'resume'
      ? `Opening in progress · ${entry.revealed} of ${entry.total} revealed`
      : entry.kind === 'open'
        ? 'A pack is waiting to be opened'
        : entry.kind === 'claim'
          ? 'Today’s free pack is ready'
          : entry.kind === 'wait'
            ? `Next free pack in ${formatCountdown(entry.nextAvailableAt, now)}`
            : '…';

  return (
    <Panel ornate style={styles.panelGap} testID="hall-treasury">
      <View style={styles.treasury}>
        <View style={styles.packCol} pointerEvents="none">
          <PackPreview theme={KINGDOM_DISCOVERY_THEME} width={84} time={time} sway={reducedMotion ? 0 : 1} />
        </View>
        <View style={styles.treasuryText}>
          <AppText variant="eyebrow">The Royal Treasury</AppText>
          <AppText variant="displayS">Daily Discovery Pack</AppText>
          <AppText variant="caption" color={entry.kind === 'wait' ? colors.textMuted : colors.parchment}>
            {status}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Demo pack · fixed contents
          </AppText>
        </View>
      </View>
      <Button
        label={entry.kind === 'resume' ? 'Resume Opening' : entry.kind === 'wait' ? 'Visit the Treasury' : 'Enter the Treasury'}
        icon={entry.kind === 'wait' ? undefined : 'sparkle'}
        variant={entry.kind === 'wait' ? 'secondary' : 'primary'}
        size="md"
        onPress={() => router.push('/packs')}
        testID="hall-treasury-button"
      />
    </Panel>
  );
}

function JourneyPanel() {
  const router = useRouter();
  const quest = catalog.quest(VALLEY_OF_ELAH_ID);
  const progress = useQuestProgress(VALLEY_OF_ELAH_ID);
  if (!quest) return null;
  const done = progress?.status === 'completed';
  const steps = quest.steps.length;
  const at = done ? steps : (progress?.stepIndex ?? 0);
  const label = done ? 'Review Chapter' : progress ? 'Continue' : 'Begin Chapter';
  return (
    <Panel style={styles.panelGap} testID="hall-journey">
      <AppText variant="eyebrow">Continue the Journey</AppText>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.textMuted}>
            {`David · ${quest.chapterLabel} · ${formatReference(quest.passage)}`}
          </AppText>
          <AppText variant="displayS">{quest.title}</AppText>
          <AppText variant="body">{quest.subtitle}</AppText>
        </View>
        {done ? <Icon name="check" size={22} color={colors.success} /> : null}
      </View>
      <ProgressBar value={at / steps} accessibilityLabel={`Chapter progress: ${at} of ${steps} steps`} />
      <View style={styles.rowBetween}>
        <AppText variant="caption">{done ? 'Chapter complete' : `${at} of ${steps} steps · about ${quest.estimatedMinutes} min`}</AppText>
        <Button
          label={label}
          variant={done ? 'secondary' : 'primary'}
          size="md"
          trailingIcon="arrowRight"
          onPress={() => router.push({ pathname: '/quest/[questId]', params: { questId: quest.id } })}
          testID="hall-journey-button"
        />
      </View>
    </Panel>
  );
}

function ArchivePanel({ width }: { width: number }) {
  const router = useRouter();
  const progress = useCollectionProgress();
  const recent = useRecentCards();
  const thumbW = Math.floor((width - spacing.gutter * 2 - 36 - spacing.sm * 3) / 4);
  return (
    <Panel style={styles.panelGap} testID="hall-archive">
      <View style={styles.rowBetween}>
        <View>
          <AppText variant="eyebrow">The Royal Archive</AppText>
          <AppText variant="displayS">{`${progress.owned} of ${progress.total} discovered`}</AppText>
        </View>
        <IconButton icon="collection" label="Open the Royal Archive" onPress={() => router.navigate('/collection')} />
      </View>
      <ProgressBar value={progress.fraction} accessibilityLabel={`Collection progress: ${progress.owned} of ${progress.total} cards`} />
      {recent.length > 0 ? (
        <View style={styles.recentRow}>
          {recent.map((cardId) => (
            <CardThumb
              key={cardId}
              cardId={cardId}
              owned
              width={thumbW}
              showMeta={false}
              onPress={() => router.push({ pathname: '/card/[cardId]', params: { cardId } })}
            />
          ))}
        </View>
      ) : (
        <AppText variant="body">Your archive is empty. Open your first pack in the Royal Treasury to begin your collection.</AppText>
      )}
    </Panel>
  );
}

/** The Royal Hall: the player's home — showcase, treasury, journey and archive. */
export function HallScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const level = useLevel();
  const owned = useOwnedCardIds();
  const name = useGame((db) => db.player.displayName, 'Collector');
  const featured = catalog.card(FEATURED_CARD);
  const featuredOwned = owned.has(FEATURED_CARD);
  const heroWidth = Math.min(width * 0.56, 240);
  const enter = useMemo(() => (i: number) => (reducedMotion ? undefined : FadeInDown.delay(80 * i).duration(450)), [reducedMotion]);

  useFocusEffect(
    useCallback(() => {
      audio.startLoop('ambient_hall_loop', { level: 0.7, fadeMs: 1500 });
      return () => audio.stopLoop('ambient_hall_loop', 800);
    }, []),
  );

  return (
    <Screen inTabs testID="hall">
      <Animated.View entering={enter(0)} style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="eyebrow">The Royal Hall</AppText>
          <AppText variant="displayL" accessibilityRole="header">{`Welcome, ${name}`}</AppText>
        </View>
        <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} testID="hall-settings" />
      </Animated.View>

      <Animated.View entering={enter(1)} style={styles.levelRow}>
        <Icon name="crown" size={18} color={colors.gold} />
        <AppText variant="label" color={colors.parchment}>{`Journey Level ${level.level}`}</AppText>
        <ProgressBar value={level.fraction} height={5} style={styles.flex} accessibilityLabel={`Journey level ${level.level}: ${level.xpIntoLevel} of ${level.xpForNextLevel} experience`} />
        <AppText variant="caption">{`${level.xpIntoLevel}/${level.xpForNextLevel} XP`}</AppText>
      </Animated.View>

      {featured ? (
        <Animated.View entering={enter(2)} style={styles.showcase}>
          <AppText variant="eyebrow" align="center">
            Featured Legend
          </AppText>
          <HeroCard
            cardId={FEATURED_CARD}
            undiscovered={!featuredOwned}
            width={heroWidth}
            active={focused}
            onPress={() => router.push({ pathname: '/card/[cardId]', params: { cardId: FEATURED_CARD } })}
            accessibilityLabel={
              featuredOwned
                ? `${featured.title}, ${featured.epithet ?? ''}. ${RARITY_LABEL[featured.rarity]}. Drag to tilt.`
                : 'An undiscovered Legendary card.'
            }
            accessibilityHint="Opens the Artifact Chamber"
            testID="hall-hero"
          />
          <View style={styles.showcaseText}>
            {featuredOwned ? (
              <>
                <AppText variant="displayM" align="center">{`${featured.title} — ${featured.epithet ?? ''}`}</AppText>
                <View style={styles.centerRow}>
                  <RarityBadge rarity={featured.rarity} />
                  <AppText variant="caption">{formatReference(featured.passage)}</AppText>
                </View>
              </>
            ) : (
              <>
                <AppText variant="displayM" align="center">
                  An Undiscovered Legend
                </AppText>
                <AppText variant="body" align="center">
                  A Legendary card waits in today’s Discovery Pack. Drag the card to turn it in the light.
                </AppText>
              </>
            )}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={enter(3)}>
        <TreasuryPanel />
      </Animated.View>
      <Animated.View entering={enter(4)}>
        <JourneyPanel />
      </Animated.View>
      <Animated.View entering={enter(5)}>
        <ArchivePanel width={Math.min(width, 640)} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  showcase: { alignItems: 'center', gap: spacing.xs },
  showcaseText: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  treasury: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  packCol: { marginLeft: -12, marginVertical: -16 },
  treasuryText: { flex: 1, gap: 3 },
  panelGap: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  recentRow: { flexDirection: 'row', gap: spacing.sm },
});

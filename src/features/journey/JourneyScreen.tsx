import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Atlas } from './Atlas';
import { catalog } from '@/content';
import { colors, spacing } from '@/design/tokens';
import type { QuestDefinition } from '@/domain/quests';
import { formatReference } from '@/domain/scripture';
import { useLevel, useQuestProgress } from '@/state/game';
import { useReducedMotion } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';
import { ProgressBar } from '@/ui/ProgressBar';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

function ChapterRow({ quest }: { quest: QuestDefinition }) {
  const router = useRouter();
  const progress = useQuestProgress(quest.id);
  const done = progress?.status === 'completed';
  const steps = quest.steps.length;
  const at = done ? steps : (progress?.stepIndex ?? 0);
  return (
    <View style={styles.chapter} testID={`chapter-${quest.id}`}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.textMuted}>{`${quest.chapterLabel} · ${formatReference(quest.passage)} · about ${quest.estimatedMinutes} min`}</AppText>
          <AppText variant="displayS">{quest.title}</AppText>
          <AppText variant="body">{quest.subtitle}</AppText>
        </View>
        {done ? <Icon name="check" size={22} color={colors.success} /> : null}
      </View>
      <ProgressBar value={at / steps} accessibilityLabel={`${quest.title}: ${at} of ${steps} steps`} />
      <AppText variant="caption">
        {done ? 'Completed · rewards collected' : `Rewards: a new card and ${quest.rewards.reduce((xp, r) => xp + (r.kind === 'xp' ? r.amount : 0), 0)} Journey XP`}
      </AppText>
      <Button
        label={done ? 'Review Chapter' : progress ? 'Continue Chapter' : 'Begin Chapter'}
        variant={done ? 'secondary' : 'primary'}
        trailingIcon="arrowRight"
        onPress={() => router.push({ pathname: '/quest/[questId]', params: { questId: quest.id } })}
        testID={`chapter-${quest.id}-start`}
      />
    </View>
  );
}

/** The Journey: an atlas of campaigns and the chapters inside them. */
export function JourneyScreen() {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const level = useLevel();
  const campaigns = catalog.campaigns;
  const [selectedId, setSelectedId] = useState(campaigns[0]?.id ?? '');
  const campaign = campaigns.find((c) => c.id === selectedId);
  const quests = (campaign?.questIds ?? []).map((id) => catalog.quest(id)).filter((q): q is QuestDefinition => q !== undefined);

  return (
    <Screen inTabs testID="journey">
      <ScreenHeader eyebrow="The Journey" title="Ancient Atlas" subtitle="Walk through the stories of Scripture, one chapter at a time." />
      <View style={styles.levelRow}>
        <Icon name="crown" size={16} color={colors.gold} />
        <AppText variant="label" color={colors.parchment}>{`Journey Level ${level.level}`}</AppText>
        <AppText variant="caption">{`· ${level.xpIntoLevel}/${level.xpForNextLevel} XP to the next level`}</AppText>
      </View>

      <Atlas campaigns={campaigns} selectedId={selectedId} onSelect={setSelectedId} width={Math.min(width, 640) - spacing.gutter * 2} reducedMotion={reducedMotion} />
      <AppText variant="caption" align="center" color={colors.textMuted}>
        Decorative map, not to scale. Tap a medallion to choose a journey.
      </AppText>

      {campaign ? (
        <Animated.View key={campaign.id} entering={FadeIn.duration(reducedMotion ? 0 : 300)}>
          <Panel ornate style={styles.panel} testID={`campaign-${campaign.id}`}>
            <AppText variant="eyebrow">{campaign.region}</AppText>
            <AppText variant="displayM">{`${campaign.title} · ${campaign.subtitle}`}</AppText>
            <AppText variant="body">{campaign.summary}</AppText>
            {campaign.availability === 'available' ? (
              <>
                {quests.map((quest) => (
                  <ChapterRow key={quest.id} quest={quest} />
                ))}
                <AppText variant="caption" color={colors.textMuted}>
                  More chapters of David’s story are being written and reviewed.
                </AppText>
              </>
            ) : (
              <View style={styles.inDevelopment}>
                <Icon name="lock" size={18} color={colors.textMuted} />
                <AppText variant="body" style={styles.flex}>
                  In development. This journey is being written and will go through biblical editorial review before it opens.
                </AppText>
              </View>
            )}
          </Panel>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  panel: { gap: spacing.md },
  chapter: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  flex: { flex: 1 },
  inDevelopment: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
});

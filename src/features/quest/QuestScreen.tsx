import { useRouter } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuestComplete } from './QuestComplete';
import { DiscoveryView, NarrativeView, QuestionView, ReflectionView, ScriptureView } from './steps';
import { catalog } from '@/content';
import { colors, spacing } from '@/design/tokens';
import type { QuestId } from '@/domain/cards';
import type { PlayerQuestProgress, QuestDefinition, QuestStep } from '@/domain/quests';
import { canAdvance, questReducer, startQuest, type QuestCompletion, type QuestEvent } from '@/engine/questEngine';
import { feedback } from '@/feedback';
import { describeServiceError } from '@/services/gameService';
import { gameService, useQuestProgress } from '@/state/game';
import { useReducedMotion } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/controls';
import { ScreenBackdrop } from '@/ui/Screen';

type Outcome = { readonly status: 'pending' } | { readonly status: 'done'; readonly completion: QuestCompletion } | { readonly status: 'error'; readonly message: string };

function StepView({ step, progress, dispatch }: { step: QuestStep; progress: PlayerQuestProgress; dispatch: (event: QuestEvent) => void }) {
  switch (step.kind) {
    case 'narrative':
      return <NarrativeView step={step} />;
    case 'scripture':
      return <ScriptureView step={step} />;
    case 'question':
      return <QuestionView step={step} answer={progress.answers[step.id]} onAnswer={(choiceId) => dispatch({ type: 'ANSWER', stepId: step.id, choiceId })} />;
    case 'discovery':
      return <DiscoveryView step={step} collected={progress.collected[step.id] ?? []} onCollect={(itemId) => dispatch({ type: 'COLLECT', stepId: step.id, itemId })} />;
    case 'reflection':
      return <ReflectionView step={step} />;
  }
}

function QuestPlayer({ quest, saved }: { quest: QuestDefinition; saved: PlayerQuestProgress | undefined }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  // A completed chapter replays from the start in review mode (no new rewards).
  // Decided once: completing the chapter must not flip the screen into review.
  const [review] = useState(() => saved?.status === 'completed');
  const [progress, dispatch] = useReducer(
    (state: PlayerQuestProgress, event: QuestEvent) => questReducer(quest, state, event),
    undefined,
    () => (saved && !review ? saved : startQuest(quest, new Date().toISOString())),
  );
  const [outcome, setOutcome] = useState<Outcome>({ status: 'pending' });
  const [attempt, setAttempt] = useState(0);
  const submitted = useRef(-1);
  const scroll = useRef<ScrollView>(null);
  const total = quest.steps.length;
  const finished = progress.stepIndex >= total;
  const step = quest.steps[progress.stepIndex];

  // Save in-progress state so the chapter can be resumed (the service ignores completed quests).
  useEffect(() => {
    if (review || finished) return;
    gameService.saveQuestProgress(progress).catch(() => undefined);
  }, [progress, review, finished]);

  // Each step starts at the top.
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [progress.stepIndex]);

  // Completion is validated and rewarded by the game service, exactly once.
  useEffect(() => {
    if (!finished || submitted.current === attempt) return;
    submitted.current = attempt;
    gameService
      .completeQuest(quest.id, progress)
      .then((completion) => setOutcome({ status: 'done', completion }))
      .catch((error: unknown) => setOutcome({ status: 'error', message: describeServiceError(error) }));
  }, [finished, attempt, quest.id, progress]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/journey'));
  const advance = () => {
    feedback.tap();
    dispatch({ type: 'NEXT' });
  };
  const ready = canAdvance(quest, progress);
  const last = progress.stepIndex === total - 1;

  return (
    <View style={styles.root} testID="quest">
      <ScreenBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton icon="close" label="Close chapter (progress is saved)" onPress={close} testID="quest-close" />
        <View style={styles.headerText}>
          <AppText variant="eyebrow">{review ? `${quest.chapterLabel} · Review` : quest.chapterLabel}</AppText>
          <AppText variant="label" numberOfLines={1}>
            {quest.title}
          </AppText>
        </View>
        <AppText variant="label" color={colors.textSecondary} style={styles.counter}>
          {finished ? `${total}/${total}` : `${progress.stepIndex + 1}/${total}`}
        </AppText>
      </View>
      <View style={styles.segments} accessible accessibilityLabel={`Step ${Math.min(progress.stepIndex + 1, total)} of ${total}`}>
        {quest.steps.map((s, i) => (
          <View key={s.id} style={[styles.segment, i < progress.stepIndex || finished ? styles.segmentDone : i === progress.stepIndex ? styles.segmentCurrent : null]} />
        ))}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        {!finished && step ? (
          <Animated.View key={step.id} entering={reducedMotion ? FadeIn.duration(120) : FadeInRight.duration(380)}>
            <StepView step={step} progress={progress} dispatch={dispatch} />
          </Animated.View>
        ) : null}
        {finished && outcome.status === 'pending' ? (
          <View style={styles.pending}>
            <ActivityIndicator color={colors.gold} />
            <AppText variant="caption">Recording your journey…</AppText>
          </View>
        ) : null}
        {finished && outcome.status === 'error' ? (
          <View style={styles.pending}>
            <AppText variant="body" align="center">
              {outcome.message}
            </AppText>
            <Button
              label="Try Again"
              icon="replay"
              onPress={() => {
                setOutcome({ status: 'pending' });
                setAttempt((n) => n + 1);
              }}
              testID="quest-retry"
            />
          </View>
        ) : null}
        {finished && outcome.status === 'done' ? (
          <QuestComplete
            quest={quest}
            completion={outcome.completion}
            onInspect={(cardId) => router.push({ pathname: '/card/[cardId]', params: { cardId } })}
            onClose={close}
          />
        ) : null}
      </ScrollView>

      {!finished ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {progress.stepIndex > 0 ? (
            <Button label="Back" icon="back" variant="secondary" onPress={() => dispatch({ type: 'BACK' })} style={styles.back} testID="quest-back" />
          ) : null}
          <Button
            label={last ? 'Complete Chapter' : 'Continue'}
            trailingIcon={last ? 'check' : 'arrowRight'}
            disabled={!ready}
            onPress={advance}
            sound="none"
            style={styles.next}
            testID="quest-next"
          />
        </View>
      ) : null}
    </View>
  );
}

/** Plays one Journey chapter. Progress is saved after every step. */
export function QuestScreen({ questId }: { questId: QuestId }) {
  const router = useRouter();
  const quest = catalog.quest(questId);
  const saved = useQuestProgress(questId);
  if (!quest) {
    return (
      <View style={[styles.root, styles.pending]}>
        <ScreenBackdrop />
        <AppText variant="displayS">This chapter could not be found.</AppText>
        <Button label="Go Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }
  return <QuestPlayer quest={quest} saved={saved} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.gutter },
  headerText: { flex: 1, alignItems: 'center' },
  counter: { minWidth: 44, textAlign: 'right' },
  segments: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing.gutter, marginTop: spacing.md },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#2A2620' },
  segmentDone: { backgroundColor: colors.gold },
  segmentCurrent: { backgroundColor: colors.goldBright },
  content: { padding: spacing.gutter, gap: spacing.lg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  pending: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(11, 13, 18, 0.94)',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  back: { flex: 1 },
  next: { flex: 2 },
});

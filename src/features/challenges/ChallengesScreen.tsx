import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { TRIVIA } from '@/content/trivia';
import { colors, spacing } from '@/design/tokens';
import type { QuestionStep } from '@/domain/quests';
import { formatReference } from '@/domain/scripture';
import { answerQuestion, createRound, currentQuestionId, isRoundComplete, nextQuestion, scoreRound, type TriviaRound } from '@/engine/trivia';
import { audio, feedback } from '@/feedback';
import { QuestionView } from '@/features/quest/steps';
import { useReducedMotion } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';
import { ProgressBar } from '@/ui/ProgressBar';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

const ROUND_SIZE = 5;

/**
 * Challenges: a short Scripture trivia round drawn from the stories in the
 * collection. A practice mode — scores are not saved and nothing is
 * rewarded in this prototype, which the screen says plainly.
 */
export function ChallengesScreen() {
  const reducedMotion = useReducedMotion();
  const [round, setRound] = useState<TriviaRound | null>(null);

  const start = () => {
    feedback.confirm();
    setRound(createRound(TRIVIA, Date.now() % 2147483647, ROUND_SIZE));
  };

  if (!round) {
    return (
      <Screen inTabs testID="challenges">
        <ScreenHeader eyebrow="Challenges" title="Scripture Trivia" subtitle="Questions from the stories in your collection." />
        <Panel ornate style={styles.panel}>
          <AppText variant="eyebrow">Practice round</AppText>
          <AppText variant="displayS">{`${ROUND_SIZE} questions · about 2 minutes`}</AppText>
          <AppText variant="body">Every answer is followed by the verse it comes from, so each round is a short walk through Scripture.</AppText>
          <View style={styles.note}>
            <Icon name="lock" size={16} color={colors.textMuted} />
            <AppText variant="caption" style={styles.flex}>
              Practice only: scores are not saved and no rewards are given in this prototype. Daily challenges with rewards arrive with player accounts.
            </AppText>
          </View>
          <Button label="Start Round" icon="sparkle" onPress={start} sound="none" testID="trivia-start" />
        </Panel>
      </Screen>
    );
  }

  const score = scoreRound(round, TRIVIA);
  if (isRoundComplete(round)) {
    return (
      <Screen inTabs testID="challenges">
        <ScreenHeader eyebrow="Challenges" title="Round Complete" />
        <Animated.View entering={reducedMotion ? FadeIn : FadeInRight.duration(350)}>
          <Panel ornate style={styles.panel} testID="trivia-results">
            <AppText variant="displayL" align="center">{`${score.correct} of ${score.total}`}</AppText>
            <AppText variant="body" align="center">
              correct answers
            </AppText>
            <ProgressBar value={score.correct / Math.max(1, score.total)} accessibilityLabel={`${score.correct} of ${score.total} correct`} />
            {round.questionIds.map((id) => {
              const q = TRIVIA.find((t) => t.id === id);
              if (!q) return null;
              const right = round.answers[id] === q.correctChoiceId;
              return (
                <View key={id} style={styles.recap}>
                  <Icon name={right ? 'check' : 'scripture'} size={18} color={right ? colors.success : colors.notice} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{q.prompt}</AppText>
                    <AppText variant="caption">{`${q.choices.find((c) => c.id === q.correctChoiceId)?.text ?? ''} · ${formatReference(q.source)}`}</AppText>
                  </View>
                </View>
              );
            })}
            <Button label="Play Again" icon="replay" onPress={start} sound="none" testID="trivia-again" />
            <AppText variant="caption" align="center" color={colors.textMuted}>
              Practice round · scores are not saved
            </AppText>
          </Panel>
        </Animated.View>
      </Screen>
    );
  }

  const id = currentQuestionId(round);
  const question = TRIVIA.find((q) => q.id === id);
  if (!question) return null;
  const step: QuestionStep = { kind: 'question', ...question };
  const chosen = round.answers[question.id];
  const last = round.index === round.questionIds.length - 1;

  return (
    <Screen inTabs testID="challenges">
      <View style={styles.progressRow}>
        <AppText variant="eyebrow">{`Question ${round.index + 1} of ${round.questionIds.length}`}</AppText>
        <AppText variant="caption">{`${score.correct} correct`}</AppText>
      </View>
      <ProgressBar value={round.index / round.questionIds.length} accessibilityLabel={`Question ${round.index + 1} of ${round.questionIds.length}`} />
      <Animated.View key={question.id} entering={reducedMotion ? FadeIn.duration(120) : FadeInRight.duration(350)}>
        <QuestionView
          step={step}
          answer={chosen ? { choiceId: chosen, correct: chosen === question.correctChoiceId } : undefined}
          onAnswer={(choiceId) => setRound((r) => (r ? answerQuestion(r, TRIVIA, question.id, choiceId) : r))}
        />
      </Animated.View>
      {chosen ? (
        <Button
          label={last ? 'See Results' : 'Next Question'}
          trailingIcon="arrowRight"
          onPress={() => {
            if (last) audio.play('quest_complete', { volume: 0.6 });
            else feedback.tap();
            setRound((r) => (r ? nextQuestion(r) : r));
          }}
          sound="none"
          testID="trivia-next"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
  note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recap: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: spacing.sm },
});

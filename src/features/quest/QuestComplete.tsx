import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { catalog } from '@/content';
import { colors, spacing } from '@/design/tokens';
import type { CardId } from '@/domain/cards';
import type { QuestDefinition } from '@/domain/quests';
import { RARITY_LABEL } from '@/domain/rarity';
import type { QuestCompletion } from '@/engine/questEngine';
import { audio, haptic } from '@/feedback';
import { HeroCard } from '@/features/cards/HeroCard';
import { useLevel } from '@/state/game';
import { useReducedMotion } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { OrnamentDivider } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';
import { ProgressBar } from '@/ui/ProgressBar';

export interface QuestCompleteProps {
  readonly quest: QuestDefinition;
  readonly completion: QuestCompletion;
  readonly onInspect: (cardId: CardId) => void;
  readonly onClose: () => void;
}

/** End of a chapter: the rewards granted by the game service, revealed once. */
export function QuestComplete({ quest, completion, onInspect, onClose }: QuestCompleteProps) {
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const level = useLevel();
  const reward = completion.cards[0];
  const card = reward ? catalog.card(reward.cardId) : undefined;
  const [faceDown, setFaceDown] = useState(!reducedMotion && reward !== undefined);

  useEffect(() => {
    if (completion.alreadyCompleted) return;
    audio.play('quest_complete');
    haptic('success');
    const xp = setTimeout(() => audio.play('xp_gain'), 700);
    const flip = setTimeout(() => {
      setFaceDown(false);
      audio.play('reveal_rare');
    }, 1300);
    return () => {
      clearTimeout(xp);
      clearTimeout(flip);
    };
  }, [completion.alreadyCompleted]);

  if (completion.alreadyCompleted) {
    return (
      <View style={[styles.root, styles.center]} testID="quest-review-complete">
        <Icon name="check" size={36} color={colors.success} />
        <AppText variant="eyebrow">{quest.chapterLabel}</AppText>
        <AppText variant="displayL" align="center">
          Chapter Reviewed
        </AppText>
        <AppText variant="body" align="center">
          You completed this chapter before. Rewards are earned once — the story is yours to revisit anytime.
        </AppText>
        <Button label="Return to Journey" onPress={onClose} testID="quest-done" style={styles.wide} />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="quest-complete">
      <Animated.View entering={reducedMotion ? FadeIn : FadeInDown.duration(500)} style={styles.center}>
        <AppText variant="eyebrow">{`${quest.chapterLabel} complete`}</AppText>
        <AppText variant="displayL" align="center" accessibilityRole="header">
          {quest.title}
        </AppText>
        <OrnamentDivider style={styles.divider} />
      </Animated.View>

      {reward && card ? (
        <View style={styles.center}>
          <HeroCard
            cardId={reward.cardId}
            width={Math.min(width * 0.52, 230)}
            active={focused}
            flipped={faceDown}
            onPress={() => onInspect(reward.cardId)}
            accessibilityLabel={`New card: ${card.title}, ${card.epithet ?? ''}. ${RARITY_LABEL[card.rarity]}.`}
            accessibilityHint="Opens the Artifact Chamber"
            testID="quest-reward-card"
          />
          {!faceDown ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
              <AppText variant="eyebrow" color={colors.goldBright}>
                {reward.isNew ? 'New card' : `Duplicate · ×${reward.copiesAfter}`}
              </AppText>
              <AppText variant="displayM" align="center">{`${card.title} — ${card.epithet ?? ''}`}</AppText>
            </Animated.View>
          ) : null}
        </View>
      ) : null}

      <Panel style={styles.xp}>
        <View style={styles.row}>
          <Icon name="crown" size={18} color={colors.gold} />
          <AppText variant="title" color={colors.goldBright}>{`+${completion.xpAwarded} Journey XP`}</AppText>
        </View>
        <ProgressBar value={level.fraction} accessibilityLabel={`Journey level ${level.level}: ${level.xpIntoLevel} of ${level.xpForNextLevel}`} />
        <AppText variant="caption">{`Journey Level ${level.level} · ${level.xpIntoLevel}/${level.xpForNextLevel} XP`}</AppText>
      </Panel>

      <View style={styles.actions}>
        {reward ? <Button label="Inspect Card" icon="rotate" variant="secondary" onPress={() => onInspect(reward.cardId)} testID="quest-inspect" /> : null}
        <Button label="Return to Journey" onPress={onClose} testID="quest-done" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg, alignItems: 'stretch', paddingVertical: spacing.lg },
  center: { alignItems: 'center', gap: spacing.xs },
  divider: { marginVertical: spacing.sm },
  xp: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { gap: spacing.sm },
  wide: { alignSelf: 'stretch' },
});

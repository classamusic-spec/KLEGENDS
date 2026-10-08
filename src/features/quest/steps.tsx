import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { getPassage, passageText, TRANSLATION } from '@/content/scripture';
import { fonts } from '@/design/fonts';
import { colors, radii, spacing } from '@/design/tokens';
import type { DiscoveryStep, NarrativeStep, QuestAnswer, QuestionStep, ReflectionStep, ScriptureStep } from '@/domain/quests';
import { formatReference, type ScriptureReference } from '@/domain/scripture';
import { audio, feedback, haptic } from '@/feedback';
import { rect } from '@/graphics/card/layout';
import { useIllustration } from '@/graphics/card/textures';
import { rng } from '@/graphics/skia/draw';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';
import { useSvgId } from '@/ui/svgId';

/** Story scenes reuse card illustrations, cropped to the moment they show. */
const SCENES: Readonly<Record<string, { cardId: string; crop: ReturnType<typeof rect> }>> = {
  'valley-elah': { cardId: 'david-giant-slayer', crop: rect(0, 96, 300, 250) },
};

function Tag({ label, tone = 'gold' }: { label: string; tone?: 'gold' | 'muted' }) {
  return (
    <View style={[styles.tag, tone === 'muted' ? styles.tagMuted : null]}>
      <AppText variant="eyebrow" color={tone === 'muted' ? colors.textSecondary : colors.gold} style={styles.tagText}>
        {label}
      </AppText>
    </View>
  );
}

/** Verbatim BSB text with verse numbers; ellipses mark excerpts that continue. */
export function PassageText({ reference, size = 'scripture' }: { reference: ScriptureReference; size?: 'scripture' | 'scriptureL' }) {
  const passage = getPassage(reference);
  if (!passage) {
    return (
      <AppText variant="body" color={colors.error}>
        {`${formatReference(reference)} is not available in this build.`}
      </AppText>
    );
  }
  return (
    <View style={styles.passage} accessible accessibilityLabel={`${passage.label}. ${passageText(passage)}`}>
      <AppText variant={size} color={colors.parchment}>
        {passage.continuesBefore ? '… ' : ''}
        {passage.verses.map((verse, i) => (
          <AppText key={verse.number} variant={size} color={colors.parchment}>
            <AppText variant="caption" color={colors.gold} style={styles.verseNumber}>
              {`${verse.number} `}
            </AppText>
            {verse.text}
            {i < passage.verses.length - 1 ? ' ' : ''}
          </AppText>
        ))}
        {passage.continuesAfter ? ' …' : ''}
      </AppText>
      <AppText variant="label" color={colors.gold}>{`${passage.label} · ${TRANSLATION.id}`}</AppText>
    </View>
  );
}

export function NarrativeView({ step }: { step: NarrativeStep }) {
  const { width } = useWindowDimensions();
  const scene = SCENES[step.sceneKey];
  const imageW = Math.min(width, 640) - spacing.gutter * 2;
  const imageH = scene ? (imageW * scene.crop.height) / scene.crop.width : 0;
  const uri = useIllustration(scene?.cardId ?? 'david-giant-slayer', Math.round(imageW * 2), scene?.crop);
  const dramatization = step.narrativeKind === 'dramatization';
  return (
    <View style={styles.step}>
      {scene ? (
        <View style={[styles.illustration, { height: imageH }]}>
          {uri ? <Animated.Image entering={FadeIn.duration(400)} source={{ uri }} style={{ width: imageW, height: imageH }} resizeMode="cover" accessibilityLabel="Illustration of the Valley of Elah" /> : null}
        </View>
      ) : null}
      <Tag label={dramatization ? 'Dramatization' : 'Summary of Scripture'} tone={dramatization ? 'muted' : 'gold'} />
      <AppText variant="displayM" accessibilityRole="header">
        {step.title}
      </AppText>
      <AppText variant="bodyL" color={colors.textPrimary}>
        {step.body}
      </AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {dramatization ? 'An artistic retelling to set the scene. The Scripture passages that follow are quoted word for word.' : 'A faithful summary of the passage.'}
      </AppText>
    </View>
  );
}

export function ScriptureView({ step }: { step: ScriptureStep }) {
  return (
    <View style={styles.step}>
      <Tag label="Scripture" />
      <AppText variant="displayM" accessibilityRole="header">
        {step.title}
      </AppText>
      {step.lead ? (
        <AppText variant="body" style={styles.lead}>
          {step.lead}
        </AppText>
      ) : null}
      <Panel ornate style={styles.scripturePanel}>
        <PassageText reference={step.passage} size="scriptureL" />
      </Panel>
      <AppText variant="caption" color={colors.textMuted}>
        {TRANSLATION.attribution}
      </AppText>
    </View>
  );
}

export interface QuestionViewProps {
  readonly step: QuestionStep;
  readonly answer: QuestAnswer | undefined;
  readonly onAnswer: (choiceId: string) => void;
}

export function QuestionView({ step, answer, onAnswer }: QuestionViewProps) {
  const choose = (choiceId: string) => {
    if (answer) return;
    const correct = choiceId === step.correctChoiceId;
    audio.play(correct ? 'answer_correct' : 'answer_gentle');
    haptic(correct ? 'success' : 'gentle');
    onAnswer(choiceId);
  };
  return (
    <View style={styles.step}>
      <Tag label="Question" />
      <AppText variant="displayS" accessibilityRole="header">
        {step.prompt}
      </AppText>
      <View style={styles.choices} accessibilityRole="radiogroup">
        {step.choices.map((choice) => {
          const chosen = answer?.choiceId === choice.id;
          const isCorrect = choice.id === step.correctChoiceId;
          const state = !answer ? 'idle' : isCorrect ? 'correct' : chosen ? 'wrong' : 'dim';
          return (
            <Pressable
              key={choice.id}
              accessibilityRole="radio"
              aria-checked={chosen}
              aria-disabled={answer !== undefined}
              accessibilityLabel={`${choice.text}${state === 'correct' ? ', correct answer' : state === 'wrong' ? ', your answer' : ''}`}
              disabled={answer !== undefined}
              onPress={() => choose(choice.id)}
              style={({ pressed }) => [
                styles.choice,
                state === 'correct' ? styles.choiceCorrect : null,
                state === 'wrong' ? styles.choiceWrong : null,
                state === 'dim' ? styles.choiceDim : null,
                pressed ? styles.pressed : null,
              ]}
              testID={`choice-${choice.id}`}
            >
              <AppText variant="bodyStrong" style={styles.choiceText}>
                {choice.text}
              </AppText>
              {state === 'correct' ? <Icon name="check" size={20} color={colors.success} /> : null}
            </Pressable>
          );
        })}
      </View>
      {answer ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <Panel style={styles.feedback} testID="question-feedback">
            <AppText variant="title" color={answer.correct ? colors.success : colors.notice} accessibilityLiveRegion="polite">
              {answer.correct ? 'That’s right.' : 'Not quite — here is what the passage says.'}
            </AppText>
            <AppText variant="body" color={colors.textPrimary}>
              {step.explanation}
            </AppText>
            <PassageText reference={step.source} />
          </Panel>
        </Animated.View>
      ) : (
        <AppText variant="caption" color={colors.textMuted}>
          Choose an answer to continue. Every answer leads to the passage — learning is never locked behind being right.
        </AppText>
      )}
    </View>
  );
}

const BROOK_H = 210;

function Stone({ x, y, w, h, collected, index, onPress }: { x: number; y: number; w: number; h: number; collected: boolean; index: number; onPress: () => void }) {
  const gradientId = useSvgId('kl-stone');
  const gone = useSharedValue(collected ? 1 : 0);
  useEffect(() => {
    gone.set(withTiming(collected ? 1 : 0, { duration: 380 }));
  }, [collected, gone]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - gone.get(), transform: [{ translateY: -gone.get() * 24 }, { scale: 1 - gone.get() * 0.3 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Smooth stone ${index + 1}${collected ? ', gathered' : ''}`}
      aria-disabled={collected}
      disabled={collected}
      onPress={onPress}
      hitSlop={6}
      style={[styles.stoneHit, { left: x - 22, top: y - 22 }]}
      testID={`stone-${index}`}
    >
      <Animated.View style={style}>
        <Svg width={w} height={h} viewBox="0 0 40 26">
          <Defs>
            <RadialGradient id={gradientId} cx="40%" cy="35%" rx="60%" ry="70%">
              <Stop offset="0" stopColor="#C9C3B6" />
              <Stop offset="0.6" stopColor="#8C877E" />
              <Stop offset="1" stopColor="#4E4B47" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={20} cy={15} rx={18} ry={10} fill="#000000" fillOpacity={0.35} />
          <Ellipse cx={20} cy={12.5} rx={17.5} ry={10.5} fill={`url(#${gradientId})`} />
          <Ellipse cx={15} cy={8.5} rx={6} ry={2.4} fill="#FFFFFF" fillOpacity={0.35} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

export interface DiscoveryViewProps {
  readonly step: DiscoveryStep;
  readonly collected: readonly string[];
  readonly onCollect: (itemId: string) => void;
}

export function DiscoveryView({ step, collected, onCollect }: DiscoveryViewProps) {
  const { width } = useWindowDimensions();
  const brookW = Math.min(width, 640) - spacing.gutter * 2;
  const done = collected.length >= step.required;
  const brookId = useSvgId('kl-brook');
  const stones = useMemo(() => {
    const r = rng(17);
    return Array.from({ length: step.available }, (_, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      return {
        id: `stone-${i}`,
        x: brookW * (0.14 + col * 0.24) + r.range(-14, 14),
        y: BROOK_H * (0.32 + row * 0.38) + r.range(-12, 12),
        w: 40 + r.range(-6, 8),
        h: 26 + r.range(-4, 5),
      };
    });
  }, [step.available, brookW]);

  return (
    <View style={styles.step}>
      <Tag label="Discovery" />
      <AppText variant="displayM" accessibilityRole="header">
        {step.title}
      </AppText>
      <AppText variant="bodyL" color={colors.textPrimary}>
        {step.prompt}
      </AppText>
      <View style={[styles.brook, { width: brookW, height: BROOK_H }]} testID="brook">
        <Svg width={brookW} height={BROOK_H} style={StyleSheet.absoluteFill} aria-hidden>
          <Defs>
            <LinearGradient id={brookId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#1F3A4E" />
              <Stop offset="1" stopColor="#10202E" />
            </LinearGradient>
          </Defs>
          <Rect width={brookW} height={BROOK_H} fill={`url(#${brookId})`} />
          {[0.18, 0.42, 0.66, 0.88].map((t, i) => (
            <Path
              key={i}
              d={`M0 ${BROOK_H * t} C ${brookW * 0.25} ${BROOK_H * t - 8}, ${brookW * 0.5} ${BROOK_H * t + 8}, ${brookW} ${BROOK_H * t - 4}`}
              stroke="#9CC3DA"
              strokeOpacity={0.16}
              strokeWidth={1.2}
              fill="none"
            />
          ))}
        </Svg>
        {stones.map((stone, i) => (
          <Stone
            key={stone.id}
            {...stone}
            index={i}
            collected={collected.includes(stone.id)}
            onPress={() => {
              if (done) return;
              feedback.select();
              audio.play('card_place', { volume: 0.6 });
              onCollect(stone.id);
            }}
          />
        ))}
      </View>
      <View style={styles.bag} accessible accessibilityLabel={`${collected.length} of ${step.required} stones gathered`} accessibilityLiveRegion="polite">
        <AppText variant="label" color={colors.parchment}>{`Shepherd’s bag · ${collected.length} of ${step.required}`}</AppText>
        <View style={styles.bagDots}>
          {Array.from({ length: step.required }, (_, i) => (
            <View key={i} style={[styles.bagDot, i < collected.length ? styles.bagDotOn : null]} />
          ))}
        </View>
      </View>
      {done ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <Panel style={styles.feedback}>
            <AppText variant="title" color={colors.success}>
              Five smooth stones, gathered.
            </AppText>
            <PassageText reference={step.source} />
          </Panel>
        </Animated.View>
      ) : null}
    </View>
  );
}

export function ReflectionView({ step }: { step: ReflectionStep }) {
  const [text, setText] = useState('');
  return (
    <View style={styles.step}>
      <Tag label="Reflection" />
      <AppText variant="displayM" accessibilityRole="header">
        {step.title}
      </AppText>
      <AppText variant="bodyL" color={colors.textPrimary}>
        {step.prompt}
      </AppText>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        maxLength={280}
        placeholder="Write a thought (optional)"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        accessibilityLabel="Your reflection (optional)"
        testID="reflection-input"
      />
      <AppText variant="caption" color={colors.textMuted}>
        Optional. What you write is not saved or shared — it disappears when you leave this page.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: spacing.md },
  tag: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.borderGold, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  tagMuted: { borderColor: colors.borderSubtle },
  tagText: { fontSize: 10 },
  illustration: { borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderGold },
  passage: { gap: spacing.sm },
  verseNumber: { fontFamily: fonts.uiSemiBold, fontSize: 11 },
  lead: { fontStyle: 'italic' },
  scripturePanel: { paddingVertical: spacing.xl },
  choices: { gap: spacing.sm },
  choice: {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  choiceText: { flex: 1 },
  choiceCorrect: { borderColor: colors.success, backgroundColor: 'rgba(169, 192, 138, 0.08)' },
  choiceWrong: { borderColor: colors.notice, backgroundColor: 'rgba(215, 182, 119, 0.06)' },
  choiceDim: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
  feedback: { gap: spacing.sm },
  brook: { borderRadius: radii.md, overflow: 'hidden', alignSelf: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  stoneHit: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bagDots: { flexDirection: 'row', gap: 6 },
  bagDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.textMuted },
  bagDotOn: { backgroundColor: colors.parchment, borderColor: colors.parchment },
  input: {
    minHeight: 110,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontFamily: fonts.ui,
    fontSize: 16,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
});

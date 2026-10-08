import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import {
  anticipate,
  dismissCard,
  finishCelebration,
  playCelebration,
  presentFaceDown,
  Timeline,
  type CardMotion,
} from './choreography';
import type { TreasuryLayout } from './layout';
import { RevealEffects, type RevealFx } from './RevealEffects';
import { catalog } from '@/content';
import { springs } from '@/design/motion';
import { colors, rarityMaterials, spacing } from '@/design/tokens';
import type { CardId } from '@/domain/cards';
import type { RevealSpeed } from '@/domain/packs';
import { RARITY_LABEL } from '@/domain/rarity';
import { formatReference } from '@/domain/scripture';
import { focusedItem, isLastCard, type RevealEvent, type RevealState } from '@/engine/packReveal';
import { audio } from '@/feedback';
import { CardView, textureScaleFor } from '@/graphics/card/CardView';
import { loadCardTextures } from '@/graphics/card/textures';
import type { VisualQuality } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { RarityEmblem } from '@/ui/RarityBadge';

/** Transparent margin around the reveal card (room for tilt, lift and shadow). */
const CARD_PAD = 34;

const useCardMotion = (): CardMotion => {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const rotation = useSharedValue(Math.PI);
  const lift = useSharedValue(1);
  const glow = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const spin = useSharedValue(0);
  const opacity = useSharedValue(1);
  const camera = useSharedValue(1);
  return useMemo(
    () => ({ tiltX, tiltY, rotation, lift, glow, offsetX, offsetY, spin, opacity, camera }),
    [tiltX, tiltY, rotation, lift, glow, offsetX, offsetY, spin, opacity, camera],
  );
};

const useRevealFx = (): RevealFx => {
  const aura = useSharedValue(0);
  const rays = useSharedValue(0);
  const burst = useSharedValue(0);
  const ribbon = useSharedValue(0);
  const ribbonFade = useSharedValue(0);
  return useMemo(() => ({ aura, rays, burst, ribbon, ribbonFade }), [aura, rays, burst, ribbon, ribbonFade]);
};

export interface RevealStageProps {
  readonly state: RevealState;
  readonly dispatch: (event: RevealEvent) => void;
  readonly layout: TreasuryLayout;
  readonly quality: VisualQuality;
  readonly reducedMotion: boolean;
  readonly speed: RevealSpeed;
  /** Room dimming, shared with the backdrop. */
  readonly dim: SharedValue<number>;
  readonly time: SharedValue<number>;
  /** Clock for ambient motion (rays); frozen in Performance quality. */
  readonly ambientTime: SharedValue<number>;
  /** 0 until the extracted stack has arrived at the reveal position. */
  readonly cardVisible: SharedValue<number>;
  readonly onInspect: (cardId: CardId) => void;
  readonly onStory: (cardId: CardId) => void;
}

/**
 * One card at a time: face down on the stack, flipped with a reveal scaled
 * to its rarity, then presented with its name. Every step can be advanced
 * by tapping the card or by a button, and every celebration can be skipped.
 * The cards themselves were granted before this screen opened.
 */
export function RevealStage({
  state,
  dispatch,
  layout,
  quality,
  reducedMotion,
  speed,
  dim,
  time,
  ambientTime,
  cardVisible,
  onInspect,
  onStory,
}: RevealStageProps) {
  const card = useCardMotion();
  const fx = useRevealFx();
  const item = focusedItem(state);
  const definition = item ? catalog.card(item.cardId) : undefined;
  const { phase, revealed } = state;
  const total = state.opening?.items.length ?? 0;
  const rarity = item?.rarity;
  const last = isLastCard(state);
  const { reveal } = layout;

  const naturalEnd = useRef(false);
  const stageTimeline = useMemo(() => new Timeline(), []);
  const dismissing = useSharedValue(false);
  const revealRequested = useSharedValue(false);
  const [titleFor, setTitleFor] = useState(-1);

  // Face-down presentation of each card (honest anticipation for Epic and Legendary).
  useEffect(() => {
    if (phase !== 'REVEALING_CARD' || !rarity) return;
    presentFaceDown(card, fx);
    anticipate(rarity, card, reducedMotion);
    dim.set(withTiming(0, { duration: 400 }));
  }, [phase, revealed, rarity, card, fx, dim, reducedMotion]);

  // The reveal itself.
  useEffect(() => {
    if (phase !== 'RARITY_CELEBRATION' || !rarity || !definition || !item) return;
    naturalEnd.current = false;
    const at = revealed;
    const timeline = playCelebration({
      rarity,
      speed,
      reducedMotion,
      card,
      fx,
      dim,
      onTitle: () => setTitleFor(at),
      onDone: () => {
        naturalEnd.current = true;
        dispatch({ type: 'CELEBRATION_DONE' });
      },
    });
    AccessibilityInfo.announceForAccessibility(
      `${RARITY_LABEL[rarity]}. ${definition.title}${definition.epithet ? `, ${definition.epithet}` : ''}. ${item.isNew ? 'New discovery.' : `You now have ${item.copiesAfter} copies.`}`,
    );
    return () => timeline.clear();
  }, [phase, revealed, rarity, definition, item, speed, reducedMotion, card, fx, dim, dispatch]);

  // A skipped or interrupted celebration jumps to its end state.
  useEffect(() => {
    if (phase === 'REVEAL_COMPLETE' && rarity && !naturalEnd.current) finishCelebration(rarity, card, fx, dim);
  }, [phase, revealed, rarity, card, fx, dim]);

  useEffect(() => () => stageTimeline.clear(), [stageTimeline]);

  const revealCard = useCallback(() => {
    if (phase !== 'REVEALING_CARD' || !item || revealRequested.get() || cardVisible.get() < 1) return;
    revealRequested.set(true);
    // Wait for the face to finish baking (usually prefetched long before).
    loadCardTextures(item.cardId, textureScaleFor(reveal.width))
      .catch(() => undefined)
      .finally(() => {
        revealRequested.set(false);
        dispatch({ type: 'REVEAL' });
      });
  }, [phase, item, cardVisible, revealRequested, reveal.width, dispatch]);

  const next = useCallback(() => {
    if (phase !== 'REVEAL_COMPLETE' || dismissing.get()) return;
    if (last) {
      audio.play('card_place');
      dispatch({ type: 'NEXT' });
      return;
    }
    dismissing.set(true);
    dismissCard(card, fx, dim, reducedMotion, stageTimeline, () => {
      dismissing.set(false);
      dispatch({ type: 'NEXT' });
    });
  }, [phase, last, card, fx, dim, reducedMotion, dismissing, stageTimeline, dispatch]);

  const onCardTap = useCallback(() => {
    if (phase === 'REVEALING_CARD') revealCard();
    else if (phase === 'RARITY_CELEBRATION') dispatch({ type: 'CELEBRATION_DONE' });
    else if (phase === 'REVEAL_COMPLETE' && rarity !== 'legendary') next();
  }, [phase, rarity, revealCard, next, dispatch]);

  // Drag to turn the card in the light (face down or once revealed).
  const interactive = useSharedValue(0);
  useEffect(() => {
    interactive.set(phase === 'REVEALING_CARD' || phase === 'REVEAL_COMPLETE' ? 1 : 0);
  }, [phase, interactive]);
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(6)
      .onUpdate((e) => {
        if (!interactive.get()) return;
        card.tiltX.set(Math.max(-1, Math.min(1, e.translationX / 140)));
        card.tiltY.set(Math.max(-1, Math.min(1, e.translationY / 180)));
      })
      .onFinalize(() => {
        if (!interactive.get()) return;
        card.tiltX.set(withSpring(0, springs.settle));
        card.tiltY.set(withSpring(0, springs.settle));
      });
    const tap = Gesture.Tap()
      .maxDistance(10)
      .runOnJS(true)
      .onEnd(() => onCardTap());
    return Gesture.Exclusive(pan, tap);
  }, [card, interactive, onCardTap]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.opacity.get() * cardVisible.get(),
    transform: [
      { translateX: card.offsetX.get() },
      { translateY: card.offsetY.get() },
      { rotate: `${card.spin.get()}rad` },
      { scale: card.camera.get() },
    ],
  }));

  // Controls appear once the stack has arrived.
  const actionsStyle = useAnimatedStyle(() => ({ opacity: cardVisible.get() }));

  const titleVisible = phase === 'REVEAL_COMPLETE' || (phase === 'RARITY_CELEBRATION' && titleFor === revealed);
  const titleIn = useSharedValue(0);
  useEffect(() => {
    titleIn.set(titleVisible ? withTiming(1, { duration: reducedMotion ? 150 : 420 }) : 0);
  }, [titleVisible, titleIn, reducedMotion]);
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleIn.get(),
    transform: [{ translateY: (1 - titleIn.get()) * 10 }],
  }));

  const material = rarity ? rarityMaterials[rarity] : rarityMaterials.common;
  const legendary = rarity === 'legendary';
  const cardBottom = reveal.y + reveal.height;
  const position = phase === 'REVEALING_CARD' ? revealed + 1 : revealed;

  const accessibilityLabel =
    phase === 'REVEALING_CARD'
      ? `Face-down card ${position} of ${total}. Double tap to reveal.`
      : definition && rarity
        ? `${definition.title}${definition.epithet ? `, ${definition.epithet}` : ''}. ${RARITY_LABEL[rarity]}.`
        : 'Card';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <RevealEffects
        width={layout.width}
        height={layout.height}
        card={reveal}
        color={material.glow}
        fx={fx}
        time={ambientTime}
        showRays={rarity === 'epic' || rarity === 'legendary'}
        showRibbon={rarity === 'legendary'}
        celebrating={phase === 'RARITY_CELEBRATION'}
      />

      {/* Progress: one mark per card, shaped by rarity once revealed. */}
      <View style={[styles.progress, { top: layout.insets.top + 60 }]} pointerEvents="none" accessible accessibilityLabel={`Card ${position} of ${total}`}>
        {state.order.map((index, i) => {
          const entry = state.opening?.items[index];
          const shown = i < revealed;
          return (
            <View key={index} style={[styles.mark, i === revealed - (phase === 'REVEALING_CARD' ? 0 : 1) ? styles.markCurrent : null]}>
              {shown && entry ? <RarityEmblem rarity={entry.rarity} size={12} /> : <View style={styles.markHollow} />}
            </View>
          );
        })}
      </View>

      {/* Rarity title above the card. */}
      {rarity ? (
        <Animated.View style={[styles.rarityTitle, { top: reveal.y - 38 }, titleStyle]} pointerEvents="none">
          <RarityEmblem rarity={rarity} size={legendary ? 18 : 14} />
          <AppText variant={legendary ? 'displayS' : 'eyebrow'} color={material.label} style={legendary ? styles.legendaryTitle : null}>
            {legendary ? 'LEGENDARY DISCOVERED' : RARITY_LABEL[rarity]}
          </AppText>
        </Animated.View>
      ) : null}

      <GestureDetector gesture={gesture}>
        <Animated.View
          testID="reveal-card"
          accessible
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={onCardTap}
          style={[styles.card, { left: reveal.x - CARD_PAD, top: reveal.y - CARD_PAD }, cardStyle]}
        >
          <CardView
            cardId={item?.cardId}
            width={reveal.width}
            tiltX={card.tiltX}
            tiltY={card.tiltY}
            rotation={card.rotation}
            scale={card.lift}
            glow={card.glow}
            time={time}
            quality={quality}
            padding={CARD_PAD}
          />
        </Animated.View>
      </GestureDetector>

      {/* Name, story reference and ownership. */}
      {definition && item ? (
        <Animated.View style={[styles.nameBlock, { top: cardBottom + spacing.lg }, titleStyle]} pointerEvents="none">
          <AppText variant={legendary ? 'displayL' : 'displayM'} align="center" numberOfLines={1}>
            {definition.title}
          </AppText>
          {definition.epithet ? (
            <AppText variant="scriptureItalic" color={colors.parchment} align="center" numberOfLines={1}>
              {definition.epithet}
            </AppText>
          ) : null}
          <View style={styles.metaRow}>
            <AppText variant="caption" color={colors.textMuted}>
              {formatReference(definition.passage)}
            </AppText>
            <View style={styles.metaDot} />
            {item.isNew ? (
              <AppText variant="eyebrow" color={colors.goldBright}>
                New discovery
              </AppText>
            ) : (
              <AppText variant="caption" color={colors.textSecondary}>
                {`In your collection ×${item.copiesAfter}`}
              </AppText>
            )}
          </View>
        </Animated.View>
      ) : null}

      {/* Actions (each gesture has a button equivalent). */}
      <Animated.View style={[styles.actions, { bottom: layout.insets.bottom + spacing.xl }, actionsStyle]} pointerEvents="box-none">
        {phase === 'REVEALING_CARD' ? (
          <>
            <AppText variant="caption" align="center" color={colors.textSecondary}>
              Tap the card to reveal it
            </AppText>
            <Button label="Reveal Card" icon="sparkle" onPress={revealCard} sound="none" testID="reveal-button" style={styles.wide} />
          </>
        ) : null}
        {phase === 'RARITY_CELEBRATION' ? (
          <AppText variant="caption" align="center" color={colors.textMuted}>
            Tap to skip
          </AppText>
        ) : null}
        {phase === 'REVEAL_COMPLETE' && item && legendary ? (
          <>
            <Button label={last ? 'Continue' : 'Next Card'} trailingIcon="arrowRight" onPress={next} testID="reveal-next" style={styles.wide} />
            <View style={styles.row}>
              <Button label="Inspect" icon="rotate" variant="secondary" size="md" onPress={() => onInspect(item.cardId)} testID="reveal-inspect" style={styles.flex} />
              <Button label="Biblical Story" icon="scripture" variant="secondary" size="md" onPress={() => onStory(item.cardId)} testID="reveal-story" style={styles.flex} />
            </View>
          </>
        ) : null}
        {phase === 'REVEAL_COMPLETE' && item && !legendary ? (
          <View style={styles.row}>
            <Button label="Inspect" icon="rotate" variant="secondary" onPress={() => onInspect(item.cardId)} testID="reveal-inspect" style={styles.flex} />
            <Button
              label={last ? 'See All' : 'Next Card'}
              trailingIcon="arrowRight"
              onPress={next}
              testID="reveal-next"
              style={styles.flex}
            />
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  mark: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  markCurrent: { borderWidth: 1, borderColor: colors.borderGoldBright },
  markHollow: { width: 7, height: 7, borderRadius: 3.5, borderWidth: 1, borderColor: colors.textMuted },
  rarityTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legendaryTitle: { letterSpacing: 3 },
  card: { position: 'absolute' },
  nameBlock: { position: 'absolute', left: spacing.gutter, right: spacing.gutter, alignItems: 'center', gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted },
  actions: { position: 'absolute', left: spacing.gutter, right: spacing.gutter, gap: spacing.sm, alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  flex: { flex: 1 },
  wide: { alignSelf: 'stretch' },
});

import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PixelRatio, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Timeline } from './choreography';
import { computeTreasuryLayout, type TreasuryLayout } from './layout';
import { usePackMotion } from './packMotion';
import { RevealStage } from './RevealStage';
import { TreasuryBackdrop } from './TreasuryBackdrop';
import { TreasurySummary } from './TreasurySummary';
import { usePackGestures } from './usePackGestures';
import { useTreasuryMachine } from './useTreasuryMachine';
import { catalog, KINGDOM_DISCOVERY_THEME } from '@/content';
import { easings } from '@/design/motion';
import { colors, spacing } from '@/design/tokens';
import type { CardId } from '@/domain/cards';
import { presentationOrder, type RevealPhase } from '@/engine/packReveal';
import { audio } from '@/feedback';
import { useFrameTime } from '@/graphics/fx/useFrameTime';
import { textureScaleFor } from '@/graphics/card/CardView';
import { prefetchCardTextures, useCardBack } from '@/graphics/card/textures';
import { PACK_W, SEAL_Y } from '@/graphics/pack/packGeometry';
import { PackStage } from '@/graphics/pack/PackStage';
import { usePackTexture } from '@/graphics/pack/usePackTexture';
import { Opaque } from '@/graphics/skia/opaque';
import { useReducedMotion, useSettings } from '@/state/settings';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { Panel } from '@/ui/Panel';

const PACK_PHASES: ReadonlySet<RevealPhase> = new Set(['PRESENTING', 'READY_TO_GRAB', 'GRABBING', 'TENSION', 'TEARING', 'OPENED', 'CARDS_EXTRACTING']);
const REVEAL_PHASES: ReadonlySet<RevealPhase> = new Set(['REVEALING_CARD', 'RARITY_CELEBRATION', 'REVEAL_COMPLETE']);
const SKIPPABLE: ReadonlySet<RevealPhase> = new Set([...PACK_PHASES, ...REVEAL_PHASES]);
const TEAR_PHASES: ReadonlySet<RevealPhase> = new Set(['READY_TO_GRAB', 'GRABBING', 'TENSION', 'TEARING']);

export interface TreasuryScreenProps {
  readonly grantId: string | undefined;
  readonly onClose: () => void;
  readonly onInspect: (cardId: CardId) => void;
  readonly onStory: (cardId: CardId) => void;
  readonly onCollection: () => void;
}

/** A Timeline that lives as long as the component. */
const useTimeline = () => {
  const timeline = useMemo(() => new Timeline(), []);
  useEffect(() => () => timeline.clear(), [timeline]);
  return timeline;
};

/** A finger gliding along the seal: shows how to tear before the first touch. */
function SealHint({ layout, reducedMotion }: { layout: TreasuryLayout; reducedMotion: boolean }) {
  const { x, y, scale } = layout.pack;
  const travel = (PACK_W - 70) * scale;
  const t = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      t.set(0.5);
      return;
    }
    t.set(withRepeat(withSequence(withDelay(500, withTiming(1, { duration: 1500, easing: easings.standard })), withTiming(0, { duration: 0 })), -1, false));
  }, [t, reducedMotion]);
  const style = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.85 : Math.min(1, t.get() * 6) * (1 - Math.max(0, t.get() - 0.8) / 0.2) * 0.9,
    transform: [{ translateX: t.get() * travel }],
  }));
  return (
    <Animated.View
      entering={FadeIn.delay(400)}
      exiting={FadeOut.duration(150)}
      pointerEvents="none"
      style={[styles.sealHint, { left: x + 22 * scale, top: y + SEAL_Y * scale - 6 }]}
    >
      <Animated.View style={style}>
        <Icon name="hand" size={30} color={colors.goldBright} strokeWidth={1.5} />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The Royal Treasury: the full pack-opening experience. The opening's
 * rewards are already committed by the time anything is shown; this screen
 * only presents them (see engine/packReveal.ts and docs/PACK_REVEAL_SPEC.md).
 */
export function TreasuryScreen({ grantId, onClose, onInspect, onStory, onCollection }: TreasuryScreenProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = useMemo(() => computeTreasuryLayout(width, height, { top: insets.top, bottom: insets.bottom }), [width, height, insets.top, insets.bottom]);
  const reducedMotion = useReducedMotion();
  const quality = useSettings((s) => s.visualQuality);
  const speed = useSettings((s) => s.revealSpeed);
  const focused = useIsFocused();
  const { state, dispatch, retry } = useTreasuryMachine(grantId);
  const { phase, opening } = state;
  const timeline = useTimeline();

  const time = useFrameTime(focused && !state.paused && !reducedMotion);
  const m = usePackMotion(time);
  const dim = useSharedValue(0);
  const light = useSharedValue(0);
  const cardVisible = useSharedValue(0);
  const phaseValue = useSharedValue<RevealPhase>('LOADING');
  useEffect(() => {
    phaseValue.set(phase);
  }, [phase, phaseValue]);

  // Assets: wrapper texture, card back, and every card face of this pack.
  const theme = useMemo(() => {
    const pack = opening ? catalog.pack(opening.packDefinitionId) : undefined;
    return (pack && catalog.packTheme(pack.visualThemeId)) ?? KINGDOM_DISCOVERY_THEME;
  }, [opening]);
  const packTexture = usePackTexture(theme, Math.min(3, layout.pack.scale * PixelRatio.get()));
  const back = useCardBack(textureScaleFor(layout.reveal.width));
  const backHandle = useMemo(() => (back ? new Opaque(back) : null), [back]);
  const assetsReady = packTexture !== null && backHandle !== null;
  useEffect(() => {
    if (!opening) return;
    const ids = presentationOrder(opening.items)
      .slice(opening.status === 'committed' ? opening.revealedCount : 0)
      .map((index) => opening.items[index]?.cardId)
      .filter((id): id is CardId => id !== undefined);
    void prefetchCardTextures(ids, textureScaleFor(layout.reveal.width));
  }, [opening, layout.reveal.width]);

  // Idle life: the pack slowly turns in the light (paused under reduced motion).
  useFrameCallback(() => {
    const t = time.get();
    m.tiltX.set(Math.sin(t * 0.55) * 0.32);
    m.tiltY.set(Math.cos(t * 0.42) * 0.16);
  }, focused && !reducedMotion);

  // Entrance: the light comes up and the pack descends onto the pedestal.
  const entered = useRef(false);
  useEffect(() => {
    if (phase !== 'PRESENTING' || !assetsReady || entered.current) return;
    entered.current = true;
    if (reducedMotion) {
      m.entrance.set(1);
      light.set(1);
      timeline.at(200, () => dispatch({ type: 'PRESENTATION_FINISHED' }));
      return;
    }
    light.set(withTiming(1, { duration: 1400, easing: easings.cinematic }));
    m.entrance.set(withDelay(250, withTiming(1, { duration: 1300, easing: easings.cinematic })));
    timeline.at(250, () => audio.play('shimmer_tail', { volume: 0.45 }));
    timeline.at(1550, () => dispatch({ type: 'PRESENTATION_FINISHED' }));
  }, [phase, assetsReady, reducedMotion, m, light, timeline, dispatch]);

  // Handoff: the emptied wrapper falls away and the stack moves to the reveal position.
  // A resumed opening starts here directly, with the pack already gone.
  const handedOff = useRef(false);
  useEffect(() => {
    if (!REVEAL_PHASES.has(phase) || handedOff.current) return;
    handedOff.current = true;
    if (state.resumed || reducedMotion) {
      m.entrance.set(1);
      m.progress.set(1);
      m.fly.set(1);
      m.fall.set(1);
      m.handoff.set(1);
      light.set(withTiming(1, { duration: 300 }));
      cardVisible.set(1);
      return;
    }
    timeline.at(80, () => audio.play('wrapper_fall'));
    m.fall.set(withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) }));
    m.handoff.set(withDelay(120, withTiming(1, { duration: 720, easing: easings.standard }, () => cardVisible.set(1))));
  }, [phase, state.resumed, reducedMotion, m, light, cardVisible, timeline]);

  // The tear animation of "Open Pack" plays before the next hint appears.
  const [hintsReady, setHintsReady] = useState(true);
  const controls = usePackGestures(m, phaseValue, layout, dispatch, reducedMotion);
  const openPack = useCallback(() => {
    setHintsReady(false);
    controls.autoOpen();
    timeline.at(reducedMotion ? 250 : 1400, () => setHintsReady(true));
  }, [controls, reducedMotion, timeline]);

  // Leaving the reveal (skip or finish): restore the room and the mix.
  useEffect(() => {
    if (phase !== 'SUMMARY') return;
    audio.stopLoop('foil_stretch_loop', 100);
    audio.duck(1);
    // The room recedes behind the summary.
    dim.set(withTiming(0.45, { duration: 500 }));
    light.set(withTiming(0.6, { duration: 600 }));
  }, [phase, dim, light]);
  useEffect(() => () => audio.duck(1), []);

  const skip = useCallback(() => {
    audio.play('card_shuffle');
    dispatch({ type: 'SKIP_TO_SUMMARY' });
  }, [dispatch]);

  const showPack = opening !== undefined && assetsReady && phase !== 'SUMMARY' && phase !== 'ERROR';
  const total = opening?.items.length ?? 0;
  const stackCount = REVEAL_PHASES.has(phase) ? Math.max(0, total - state.revealed) : total;

  return (
    <View style={styles.root} testID="treasury">
      <TreasuryBackdrop width={width} height={height} pedestal={layout.pedestal} time={time} dim={dim} light={light} />

      <GestureDetector gesture={controls.gesture}>
        <View style={StyleSheet.absoluteFill} testID="treasury-pack">
          {showPack && packTexture && backHandle ? (
            <PackStage
              width={width}
              height={height}
              placement={layout.pack}
              motion={m}
              packTexture={packTexture}
              cardBack={backHandle}
              stackCount={stackCount}
              revealRect={layout.reveal}
            />
          ) : null}
        </View>
      </GestureDetector>

      {phase === 'READY_TO_GRAB' && state.tearProgress === 0 && hintsReady ? <SealHint layout={layout} reducedMotion={reducedMotion} /> : null}

      {REVEAL_PHASES.has(phase) && opening ? (
        <RevealStage
          state={state}
          dispatch={dispatch}
          layout={layout}
          quality={quality}
          reducedMotion={reducedMotion}
          speed={speed}
          dim={dim}
          time={time}
          cardVisible={cardVisible}
          onInspect={onInspect}
          onStory={onStory}
        />
      ) : null}

      {phase === 'SUMMARY' && opening ? (
        <TreasurySummary
          opening={opening}
          width={width}
          insets={layout.insets}
          reducedMotion={reducedMotion}
          onInspect={onInspect}
          onCollection={onCollection}
          onClose={onClose}
        />
      ) : null}

      {/* Pack hints and their button equivalents. */}
      {PACK_PHASES.has(phase) && showPack ? (
        <View style={[styles.footer, { bottom: insets.bottom + spacing.xl }]} pointerEvents="box-none">
          {phase === 'PRESENTING' ? (
            <Animated.View entering={FadeIn.duration(600)} style={styles.footerInner}>
              <AppText variant="eyebrow" align="center">
                A discovery awaits
              </AppText>
            </Animated.View>
          ) : null}
          {TEAR_PHASES.has(phase) && hintsReady ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.footerInner}>
              <AppText variant="bodyStrong" align="center" color={colors.parchment}>
                Swipe across the seal to tear it open
              </AppText>
              <Button label="Open Pack" icon="sparkle" variant="secondary" size="md" onPress={openPack} sound="none" testID="open-pack" />
            </Animated.View>
          ) : null}
          {phase === 'OPENED' && hintsReady ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.footerInner}>
              <AppText variant="bodyStrong" align="center" color={colors.parchment}>
                Slide the cards up to draw them out
              </AppText>
              <Button label="Draw Cards" icon="arrowRight" variant="secondary" size="md" onPress={controls.autoExtract} sound="none" testID="draw-cards" />
            </Animated.View>
          ) : null}
        </View>
      ) : null}

      {phase === 'LOADING' || (opening && !assetsReady && phase !== 'ERROR' && phase !== 'SUMMARY') ? (
        <Animated.View entering={FadeIn.delay(300)} style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.gold} />
          <AppText variant="caption" align="center">
            Preparing the treasury…
          </AppText>
        </Animated.View>
      ) : null}

      {phase === 'ERROR' ? (
        <View style={styles.center}>
          <Panel ornate style={styles.errorPanel}>
            <AppText variant="displayS" align="center">
              The treasury is closed
            </AppText>
            <AppText variant="body" align="center">
              {state.error ?? 'Something went wrong.'}
            </AppText>
            <View style={styles.errorActions}>
              {grantId ? <Button label="Try Again" icon="replay" onPress={retry} testID="treasury-retry" /> : null}
              <Button label="Return to Royal Hall" variant="secondary" onPress={onClose} testID="treasury-error-close" />
            </View>
          </Panel>
        </View>
      ) : null}

      {state.resumed && REVEAL_PHASES.has(phase) && state.revealed <= (opening?.revealedCount ?? 0) ? (
        <Animated.View entering={FadeIn.delay(200)} exiting={FadeOut} style={[styles.toast, { top: insets.top + 96 }]} pointerEvents="none">
          <AppText variant="caption" align="center" color={colors.parchment}>
            Resuming your opening. Your cards were already saved to your collection.
          </AppText>
        </Animated.View>
      ) : null}

      {/* Header. */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <IconButton icon="close" label="Close the treasury" onPress={onClose} testID="treasury-close" />
        <View style={styles.headerTitle} pointerEvents="none">
          <AppText variant="eyebrow">The Royal Treasury</AppText>
          {opening?.isDemo && phase !== 'SUMMARY' ? (
            <AppText variant="caption" color={colors.textMuted} style={styles.demoLabel}>
              Demo pack · fixed contents
            </AppText>
          ) : null}
        </View>
        {SKIPPABLE.has(phase) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip to summary"
            accessibilityHint="Shows every card in this pack at once"
            onPress={skip}
            hitSlop={8}
            style={({ pressed }) => [styles.skip, pressed ? styles.pressed : null]}
            testID="treasury-skip"
          >
            <AppText variant="label" color={colors.textSecondary}>
              Skip
            </AppText>
            <Icon name="skip" size={14} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundDeep, overflow: 'hidden' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  headerTitle: { alignItems: 'center', flex: 1 },
  demoLabel: { marginTop: 2 },
  headerSpacer: { width: 64 },
  skip: {
    minWidth: 64,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  pressed: { opacity: 0.7 },
  footer: { position: 'absolute', left: spacing.gutter, right: spacing.gutter, alignItems: 'center' },
  footerInner: { alignItems: 'center', gap: spacing.md },
  sealHint: { position: 'absolute' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.gutter },
  errorPanel: { padding: spacing.xl, gap: spacing.md, maxWidth: 360, width: '100%' },
  errorActions: { gap: spacing.sm, marginTop: spacing.sm },
  toast: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.borderGold,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
});

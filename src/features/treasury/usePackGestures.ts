import { useEffect, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { Easing, useSharedValue, withDelay, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Timeline } from './choreography';
import { RISE_MAX, WRAPPER_SINK, type TreasuryLayout } from './layout';
import { DEFAULT_REVEAL_CONFIGURATION } from '@/domain/packs';
import type { RevealEvent, RevealPhase } from '@/engine/packReveal';
import { audio, haptic } from '@/feedback';
import { PACK_W, SEAL_Y } from '@/graphics/pack/packGeometry';
import type { PackMotion } from '@/graphics/pack/PackStage';

const RESISTANCE_PX = DEFAULT_REVEAL_CONFIGURATION.tearResistancePx;
const COMPLETE_AT = DEFAULT_REVEAL_CONFIGURATION.tearCompleteThreshold;
const EXTRACT_AT = DEFAULT_REVEAL_CONFIGURATION.extractCompleteThreshold;
/** Fraction of the pack width the finger must travel to tear the whole seal. */
const TEAR_TRAVEL = 0.85;
/** Tear progress between rip sounds. */
const RIP_STEP = 0.06;

const RIPS = ['foil_rip_1', 'foil_rip_2', 'foil_rip_3', 'foil_rip_4'] as const;

const ripSound = (step: number) => {
  audio.play(RIPS[step % RIPS.length] ?? 'foil_rip_1', { volume: 0.75 + (step % 3) * 0.08 });
  if (step % 4 === 0) haptic('tearTick');
};

/** JS-side reactions to discrete gesture moments: state machine, sound and touch. */
const useFeedbackBridge = (dispatch: (event: RevealEvent) => void) =>
  useMemo(
    () => ({
      grab: () => {
        dispatch({ type: 'GRAB' });
        haptic('packGrab');
        audio.play('pack_grab');
        audio.startLoop('foil_stretch_loop', { level: 0.55, fadeMs: 150 });
      },
      tension: () => {
        dispatch({ type: 'TENSION' });
        haptic('seamSeparate');
      },
      rip: (step: number, progress: number) => {
        ripSound(step);
        // The seal only counts as open once the finger lets go (or the tear completes).
        dispatch({ type: 'TEAR_PROGRESS', progress: Math.min(0.99, progress) });
      },
      release: (progress: number) => {
        audio.stopLoop('foil_stretch_loop', 200);
        dispatch({ type: 'TEAR_PROGRESS', progress: Math.min(0.99, progress) });
        dispatch({ type: 'RELEASE' });
      },
      torn: () => {
        audio.stopLoop('foil_stretch_loop', 120);
        audio.play('foil_release');
        haptic('tearComplete');
        dispatch({ type: 'TEAR_PROGRESS', progress: 1 });
      },
      extractStart: () => {
        dispatch({ type: 'EXTRACT_START' });
        audio.play('cards_slide');
        haptic('packGrab');
      },
      extractCancel: () => dispatch({ type: 'EXTRACT_CANCEL' }),
      extracted: () => {
        audio.play('card_shuffle');
        haptic('cardReveal');
        dispatch({ type: 'EXTRACT_COMPLETE' });
      },
    }),
    [dispatch],
  );

export interface PackControls {
  /** Pan (tear, draw out) and tap (draw out) on the pack. */
  readonly gesture: ReturnType<typeof Gesture.Exclusive>;
  /** Accessible alternative to tearing: the seal opens by itself. */
  readonly autoOpen: () => void;
  /** Accessible alternative to sliding: the cards are drawn out by themselves. */
  readonly autoExtract: () => void;
}

/**
 * Pan + tap gestures for the pack. All finger tracking runs on the UI
 * thread; JS is only called for discrete moments (dispatches, sounds,
 * haptic ticks), so tearing stays responsive even while JS is busy.
 * Every gesture has a button equivalent (autoOpen / autoExtract).
 */
export const usePackGestures = (
  motion: PackMotion,
  phase: SharedValue<RevealPhase>,
  layout: TreasuryLayout,
  dispatch: (event: RevealEvent) => void,
  reducedMotion: boolean,
): PackControls => {
  const bridge = useFeedbackBridge(dispatch);
  const mode = useSharedValue<'none' | 'tear' | 'extractPending' | 'extract'>('none');
  const tearing = useSharedValue(false);
  const startProgress = useSharedValue(0);
  const lastStep = useSharedValue(0);
  const timeline = useMemo(() => new Timeline(), []);
  useEffect(() => () => timeline.clear(), [timeline]);
  const { x: px, y: py, scale } = layout.pack;

  const autoOpen = useMemo(
    () => () => {
      const m = motion;
      dispatch({ type: 'AUTO_OPEN' });
      audio.stopLoop('foil_stretch_loop', 120);
      m.grip.set(withTiming(0, { duration: 200 }));
      m.tension.set(withTiming(0, { duration: 200 }));
      m.nudgeX.set(withTiming(0, { duration: 200 }));
      m.nudgeY.set(withTiming(0, { duration: 200 }));
      const finish = () => {
        audio.play('foil_release');
        haptic('tearComplete');
      };
      if (reducedMotion) {
        m.progress.set(1);
        m.curl.set(1);
        m.fly.set(withTiming(1, { duration: 200 }));
        m.glow.set(withTiming(1, { duration: 200 }));
        finish();
        return;
      }
      const from = m.progress.get();
      if (from <= 0) m.side.set(1);
      const ms = 260 + 760 * (1 - from);
      audio.play('pack_grab');
      m.curl.set(withTiming(1, { duration: 180 }));
      m.progress.set(withDelay(120, withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad) })));
      const rips = Math.max(2, Math.round((1 - from) / RIP_STEP / 2));
      for (let i = 0; i < rips; i++) timeline.at(120 + (ms / rips) * i, () => ripSound(i));
      m.fly.set(withDelay(ms + 60, withTiming(1, { duration: 760, easing: Easing.in(Easing.quad) })));
      m.glow.set(withDelay(ms + 80, withTiming(1, { duration: 700 })));
      timeline.at(ms + 120, finish);
    },
    [motion, dispatch, reducedMotion, timeline],
  );

  const autoExtract = useMemo(
    () => () => {
      const m = motion;
      bridge.extractStart();
      const ms = reducedMotion ? 240 : 760;
      const easing = Easing.inOut(Easing.cubic);
      m.rise.set(withTiming(RISE_MAX, { duration: ms, easing }));
      m.nudgeY.set(withTiming(RISE_MAX * WRAPPER_SINK, { duration: ms, easing }));
      timeline.at(ms + 20, bridge.extracted);
    },
    [motion, bridge, reducedMotion, timeline],
  );

  const gesture = useMemo(() => {
    const m = motion;
    const pan = Gesture.Pan()
      .minDistance(2)
      .onBegin((e) => {
        const current = phase.get();
        const lx = (e.x - px) / scale;
        const ly = (e.y - py) / scale;
        if (current === 'READY_TO_GRAB' && lx > -30 && lx < PACK_W + 30 && ly > -40 && ly < SEAL_Y + 80) {
          mode.set('tear');
          tearing.set(m.progress.get() > 0);
          startProgress.set(m.progress.get());
          m.grabX.set(Math.min(PACK_W, Math.max(0, lx)));
          m.grabY.set(SEAL_Y);
          m.grip.set(withTiming(1, { duration: 120 }));
          scheduleOnRN(bridge.grab);
        } else if (current === 'OPENED' && ly > -120 && ly < 420) {
          // Becomes an extraction only if the finger actually drags (see onStart);
          // a plain tap is handled by the tap gesture.
          mode.set('extractPending');
        } else {
          mode.set('none');
        }
      })
      .onStart(() => {
        if (mode.get() === 'extractPending') {
          mode.set('extract');
          scheduleOnRN(bridge.extractStart);
        }
      })
      .onUpdate((e) => {
        if (mode.get() === 'tear') {
          const dx = e.translationX;
          m.nudgeX.set(Math.max(-6, Math.min(6, (dx * 0.05) / scale)));
          m.nudgeY.set(Math.max(-3, Math.min(3, (e.translationY * 0.03) / scale)));
          if (!tearing.get()) {
            m.tension.set(Math.min(1, Math.abs(dx) / RESISTANCE_PX));
            if (Math.abs(dx) >= RESISTANCE_PX) {
              tearing.set(true);
              if (startProgress.get() <= 0) m.side.set(dx >= 0 ? 1 : -1);
              m.curl.set(withTiming(1, { duration: 160 }));
              scheduleOnRN(bridge.tension);
            }
            return;
          }
          const along = (m.side.get() * dx - RESISTANCE_PX) / (PACK_W * scale * TEAR_TRAVEL);
          const next = Math.min(1, Math.max(m.progress.get(), startProgress.get() + along));
          m.progress.set(next);
          const tip = m.side.get() > 0 ? next * PACK_W : PACK_W - next * PACK_W;
          m.grabX.set(tip);
          const step = Math.floor(next / RIP_STEP);
          if (step > lastStep.get()) {
            lastStep.set(step);
            scheduleOnRN(bridge.rip, step, next);
          }
        } else if (mode.get() === 'extract') {
          const rise = Math.min(RISE_MAX, Math.max(0, -e.translationY / scale));
          m.rise.set(rise);
          m.nudgeY.set(rise * WRAPPER_SINK);
        }
      })
      .onFinalize(() => {
        const current = mode.get();
        mode.set('none');
        if (current === 'tear') {
          m.grip.set(withTiming(0, { duration: 260 }));
          m.nudgeX.set(withSpring(0, { damping: 14, stiffness: 140 }));
          m.nudgeY.set(withSpring(0, { damping: 14, stiffness: 140 }));
          m.tension.set(withSpring(0, { damping: 16, stiffness: 160 }));
          const progress = m.progress.get();
          if (tearing.get() && progress >= COMPLETE_AT) {
            m.progress.set(withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }));
            m.fly.set(withDelay(140, withTiming(1, { duration: 760, easing: Easing.in(Easing.quad) })));
            m.glow.set(withDelay(160, withTiming(1, { duration: 700 })));
            scheduleOnRN(bridge.torn);
          } else {
            if (tearing.get()) m.curl.set(withSpring(0.55, { damping: 12, stiffness: 120 }));
            scheduleOnRN(bridge.release, progress);
          }
          tearing.set(false);
        } else if (current === 'extract') {
          const rise = m.rise.get();
          if (rise >= RISE_MAX * EXTRACT_AT) {
            m.rise.set(withTiming(RISE_MAX, { duration: 320, easing: Easing.out(Easing.cubic) }, () => scheduleOnRN(bridge.extracted)));
            m.nudgeY.set(withTiming(RISE_MAX * WRAPPER_SINK, { duration: 320 }));
          } else {
            m.rise.set(withSpring(0, { damping: 15, stiffness: 140 }));
            m.nudgeY.set(withSpring(0, { damping: 15, stiffness: 140 }));
            scheduleOnRN(bridge.extractCancel);
          }
        }
      });

    // Tap the opened pack to draw the cards without a drag.
    const tap = Gesture.Tap()
      .maxDistance(8)
      .onEnd(() => {
        if (phase.get() === 'OPENED') scheduleOnRN(autoExtract);
      });

    return Gesture.Exclusive(pan, tap);
  }, [motion, phase, bridge, mode, tearing, startProgress, lastStep, px, py, scale, autoExtract]);

  return { gesture, autoOpen, autoExtract };
};

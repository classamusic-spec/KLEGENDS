import { cancelAnimation, Easing, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

import type { RevealFx } from './RevealEffects';
import { easings } from '@/design/motion';
import { DEFAULT_REVEAL_CONFIGURATION, type RevealSpeed } from '@/domain/packs';
import type { Rarity } from '@/domain/rarity';
import { audio, haptic } from '@/feedback';

/** Shared values that move the focused card. */
export interface CardMotion {
  readonly tiltX: SharedValue<number>;
  readonly tiltY: SharedValue<number>;
  /** π = face down, 0 = face up. */
  readonly rotation: SharedValue<number>;
  readonly lift: SharedValue<number>;
  readonly glow: SharedValue<number>;
  readonly offsetX: SharedValue<number>;
  readonly offsetY: SharedValue<number>;
  readonly spin: SharedValue<number>;
  readonly opacity: SharedValue<number>;
  /** Stage zoom for the legendary "camera push". */
  readonly camera: SharedValue<number>;
}

/** Cancelable list of timeouts for one choreography. */
export class Timeline {
  private timers: ReturnType<typeof setTimeout>[] = [];

  at(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, Math.max(0, ms)));
  }

  clear(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}

const REVEAL_SOUND = { common: 'reveal_common', rare: 'reveal_rare', epic: 'reveal_epic', legendary: 'legendary_reveal' } as const;
const REVEAL_HAPTIC = { common: 'cardReveal', rare: 'rareReveal', epic: 'epicReveal', legendary: 'legendaryReveal' } as const;

/** Resets a card to rest, face down, ready to be revealed. */
export const presentFaceDown = (card: CardMotion, fx: RevealFx) => {
  [card.rotation, card.lift, card.glow, card.offsetX, card.offsetY, card.spin, card.opacity, card.tiltX, card.tiltY].forEach((v) => cancelAnimation(v));
  card.rotation.set(Math.PI);
  card.lift.set(1);
  card.glow.set(0);
  card.offsetX.set(0);
  card.offsetY.set(0);
  card.spin.set(0);
  card.opacity.set(1);
  card.tiltX.set(0);
  card.tiltY.set(0);
  fx.aura.set(0);
  fx.rays.set(0);
  fx.burst.set(0);
  fx.ribbon.set(0);
  fx.ribbonFade.set(0);
};

/**
 * Honest anticipation: only cards that really are Epic or Legendary shimmer
 * before they are flipped (the reward was decided by the server already).
 */
export const anticipate = (rarity: Rarity, card: CardMotion, reducedMotion: boolean) => {
  if (rarity !== 'epic' && rarity !== 'legendary') return;
  const peak = rarity === 'legendary' ? 0.7 : 0.4;
  if (reducedMotion) {
    card.glow.set(peak * 0.6);
    return;
  }
  card.glow.set(withRepeat(withSequence(withTiming(peak, { duration: 900 }), withTiming(peak * 0.35, { duration: 900 })), -1, true));
};

export interface CelebrationOptions {
  readonly rarity: Rarity;
  readonly speed: RevealSpeed;
  readonly reducedMotion: boolean;
  readonly card: CardMotion;
  readonly fx: RevealFx;
  readonly dim: SharedValue<number>;
  /** Show the rarity title / name text. */
  readonly onTitle: () => void;
  readonly onDone: () => void;
}

/** Plays the reveal of the focused card. Returns a timeline that can be cleared on skip. */
export const playCelebration = ({ rarity, speed, reducedMotion, card, fx, dim, onTitle, onDone }: CelebrationOptions): Timeline => {
  const timeline = new Timeline();
  const { flipMs, celebrationMs } = DEFAULT_REVEAL_CONFIGURATION.timings[speed][rarity];
  cancelAnimation(card.glow);

  if (reducedMotion) {
    // No 3D flip, camera moves or light sweeps: a calm crossfade-like settle.
    card.rotation.set(0);
    card.glow.set(withSequence(withTiming(0.35, { duration: 160 }), withTiming(rarity === 'legendary' ? 0.2 : 0, { duration: 400 })));
    fx.aura.set(withTiming(rarity === 'common' ? 0.2 : 0.45, { duration: 200 }));
    audio.play(REVEAL_SOUND[rarity]);
    haptic(REVEAL_HAPTIC[rarity]);
    timeline.at(120, onTitle);
    timeline.at(Math.min(600, celebrationMs), onDone);
    return timeline;
  }

  if (rarity !== 'legendary') {
    audio.play('card_flip');
    card.lift.set(withSequence(withTiming(1.07, { duration: flipMs * 0.5, easing: easings.standard }), withTiming(1.02, { duration: flipMs * 0.6, easing: easings.standard })));
    card.rotation.set(withTiming(0, { duration: flipMs, easing: easings.cinematic }));
    const mid = flipMs * 0.5;
    timeline.at(mid, () => {
      audio.play(REVEAL_SOUND[rarity]);
      haptic(REVEAL_HAPTIC[rarity]);
    });
    const auraPeak = rarity === 'common' ? 0.22 : rarity === 'rare' ? 0.42 : 0.6;
    fx.aura.set(withDelay(mid, withTiming(auraPeak, { duration: 260 })));
    card.glow.set(withDelay(mid, withSequence(withTiming(rarity === 'common' ? 0.12 : 0.35, { duration: 200 }), withTiming(0, { duration: 600 }))));
    if (rarity === 'epic') {
      fx.burst.set(withDelay(mid, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
      fx.rays.set(withDelay(mid, withSequence(withTiming(0.8, { duration: 300 }), withTiming(0.35, { duration: 900 }))));
    }
    if (rarity === 'rare') {
      fx.burst.set(withDelay(mid, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })));
    }
    timeline.at(mid + 80, onTitle);
    timeline.at(flipMs + celebrationMs, onDone);
    return timeline;
  }

  // ── Legendary: anticipation → suspense → revelation → presentation ──
  const total = flipMs + celebrationMs; // e.g. 600 + 2800 standard
  const tSuspense = total * 0.16;
  const tFlip = total * 0.44;
  const tBurst = tFlip + flipMs * 0.45;
  const tSettle = total * 0.72;

  audio.duck(0.25);
  audio.play('legendary_anticipation');
  haptic('tearResistance');
  dim.set(withTiming(0.55, { duration: tSuspense * 1.4, easing: easings.cinematic }));
  card.lift.set(withTiming(1.06, { duration: tSuspense * 1.6, easing: easings.cinematic }));
  card.glow.set(withTiming(0.75, { duration: tSuspense * 1.4 }));
  card.offsetY.set(withTiming(-10, { duration: tSuspense * 1.6, easing: easings.cinematic }));

  // Suspense: a ribbon of gold light traces the card; the camera moves in; a slow turn.
  fx.ribbon.set(withDelay(tSuspense, withTiming(1, { duration: tFlip - tSuspense, easing: easings.cinematic })));
  card.camera.set(withDelay(tSuspense, withTiming(1.08, { duration: tFlip - tSuspense + 300, easing: easings.cinematic })));
  card.tiltX.set(withDelay(tSuspense, withSequence(withTiming(0.28, { duration: (tFlip - tSuspense) * 0.6 }), withTiming(-0.12, { duration: (tFlip - tSuspense) * 0.4 }))));

  // Revelation.
  timeline.at(tFlip, () => audio.play('card_flip'));
  card.rotation.set(withDelay(tFlip, withTiming(0, { duration: flipMs, easing: easings.cinematic })));
  card.tiltX.set(withDelay(tFlip, withTiming(0, { duration: flipMs })));
  timeline.at(tBurst, () => {
    audio.play(REVEAL_SOUND.legendary);
    haptic(REVEAL_HAPTIC.legendary);
  });
  fx.burst.set(withDelay(tBurst, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
  fx.aura.set(withDelay(tBurst, withTiming(0.7, { duration: 300 })));
  fx.rays.set(withDelay(tBurst, withSequence(withTiming(1, { duration: 300 }), withTiming(0.55, { duration: 1400 }))));
  fx.ribbonFade.set(withDelay(tBurst, withTiming(1, { duration: 900 })));
  timeline.at(tBurst + 150, onTitle);
  timeline.at(tBurst + 400, () => audio.play('shimmer_tail', { volume: 0.7 }));

  // Presentation: settle into an inspection pose, the room stays dim.
  card.glow.set(withDelay(tSettle, withTiming(0.2, { duration: 700 })));
  card.lift.set(withDelay(tSettle, withTiming(1.03, { duration: 700, easing: easings.standard })));
  card.offsetY.set(withDelay(tSettle, withTiming(0, { duration: 700, easing: easings.standard })));
  card.camera.set(withDelay(tSettle, withTiming(1.03, { duration: 900, easing: easings.standard })));
  dim.set(withDelay(tSettle, withTiming(0.42, { duration: 900 })));
  timeline.at(total, onDone);
  return timeline;
};

/** Jumps a celebration to its end state (tap to skip). */
export const finishCelebration = (rarity: Rarity, card: CardMotion, fx: RevealFx, dim: SharedValue<number>) => {
  [card.rotation, card.lift, card.glow, card.offsetY, card.camera, card.tiltX].forEach((v) => cancelAnimation(v));
  card.rotation.set(0);
  card.lift.set(rarity === 'legendary' ? 1.03 : 1.02);
  card.glow.set(rarity === 'legendary' ? 0.2 : 0);
  card.offsetY.set(0);
  card.camera.set(rarity === 'legendary' ? 1.03 : 1);
  card.tiltX.set(0);
  cancelAnimation(fx.burst);
  fx.burst.set(0);
  cancelAnimation(fx.ribbon);
  fx.ribbon.set(rarity === 'legendary' ? 1 : 0);
  fx.ribbonFade.set(1);
  fx.aura.set(rarity === 'common' ? 0.2 : rarity === 'rare' ? 0.35 : 0.55);
  fx.rays.set(rarity === 'epic' || rarity === 'legendary' ? 0.5 : 0);
  if (rarity === 'legendary') dim.set(0.42);
};

/** Sends the revealed card away before the next one; calls back (via `timeline`) when done. */
export const dismissCard = (
  card: CardMotion,
  fx: RevealFx,
  dim: SharedValue<number>,
  reducedMotion: boolean,
  timeline: Timeline,
  onDone: () => void,
): void => {
  audio.play('card_whoosh');
  const ms = reducedMotion ? 160 : 360;
  card.opacity.set(withTiming(0, { duration: ms }));
  if (!reducedMotion) {
    card.offsetX.set(withTiming(-260, { duration: ms, easing: Easing.in(Easing.cubic) }));
    card.offsetY.set(withTiming(40, { duration: ms, easing: Easing.in(Easing.cubic) }));
    card.spin.set(withTiming(-0.35, { duration: ms }));
  }
  fx.aura.set(withTiming(0, { duration: ms }));
  fx.rays.set(withTiming(0, { duration: ms }));
  dim.set(withTiming(0, { duration: 500 }));
  card.camera.set(withTiming(1, { duration: ms }));
  audio.duck(1);
  timeline.at(ms + 20, onDone);
};

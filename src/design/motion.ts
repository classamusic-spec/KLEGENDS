import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/**
 * Motion tokens. Starting values from the design spec, to be tuned on
 * devices. Physical objects use springs; cinematic transitions use curves.
 */
export const durations = {
  press: 110,
  small: 240,
  cardLift: 300,
  cardFlip: 560,
  screen: 400,
  reveal: 500,
  reducedMotionFade: 180,
} as const;

export const easings = {
  /** Default UI curve: quick out, gentle settle. */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Entrances of heavy objects. */
  emphasized: Easing.bezier(0.2, 0, 0, 1.0),
  /** Exits and dismissals. */
  exit: Easing.bezier(0.3, 0, 0.8, 0.15),
  /** Cinematic, slow-in slow-out moves (camera pushes, light sweeps). */
  cinematic: Easing.bezier(0.65, 0, 0.35, 1),
} as const;

export const springs = {
  /** Button and chip press feedback. */
  press: { damping: 20, stiffness: 420, mass: 0.6 } satisfies WithSpringConfig,
  /** A card or pack responding to touch: weighty but responsive. */
  object: { damping: 16, stiffness: 150, mass: 1 } satisfies WithSpringConfig,
  /** Returning to rest after a tilt or drag, with believable inertia. */
  settle: { damping: 14, stiffness: 90, mass: 1 } satisfies WithSpringConfig,
  /** Soft, slow float for presentation moments. */
  float: { damping: 22, stiffness: 60, mass: 1.2 } satisfies WithSpringConfig,
} as const;

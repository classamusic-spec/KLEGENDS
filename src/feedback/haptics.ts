import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { settingsStore } from '@/state/settings';

export type HapticEvent =
  | 'tap'
  | 'select'
  | 'packGrab'
  | 'tearResistance'
  | 'tearTick'
  | 'seamSeparate'
  | 'tearComplete'
  | 'cardReveal'
  | 'rareReveal'
  | 'epicReveal'
  | 'legendaryReveal'
  | 'success'
  | 'gentle';

type Pattern = { ios: () => Promise<void>; android: () => Promise<void> };

const impact = (style: Haptics.ImpactFeedbackStyle) => () => Haptics.impactAsync(style);
const android = (type: Haptics.AndroidHaptics) => () => Haptics.performAndroidHapticsAsync(type);

/**
 * Semantic haptic patterns. Android uses the system's semantic constants
 * (which adapt to each device's actuator and respect system settings)
 * instead of assuming raw vibration strengths behave the same everywhere.
 */
const PATTERNS: Readonly<Record<HapticEvent, Pattern>> = {
  tap: { ios: impact(Haptics.ImpactFeedbackStyle.Light), android: android(Haptics.AndroidHaptics.Virtual_Key) },
  select: { ios: () => Haptics.selectionAsync(), android: android(Haptics.AndroidHaptics.Clock_Tick) },
  packGrab: { ios: impact(Haptics.ImpactFeedbackStyle.Light), android: android(Haptics.AndroidHaptics.Drag_Start) },
  tearResistance: { ios: impact(Haptics.ImpactFeedbackStyle.Soft), android: android(Haptics.AndroidHaptics.Segment_Frequent_Tick) },
  tearTick: { ios: () => Haptics.selectionAsync(), android: android(Haptics.AndroidHaptics.Segment_Tick) },
  seamSeparate: { ios: impact(Haptics.ImpactFeedbackStyle.Medium), android: android(Haptics.AndroidHaptics.Context_Click) },
  tearComplete: { ios: impact(Haptics.ImpactFeedbackStyle.Rigid), android: android(Haptics.AndroidHaptics.Confirm) },
  cardReveal: { ios: impact(Haptics.ImpactFeedbackStyle.Light), android: android(Haptics.AndroidHaptics.Clock_Tick) },
  rareReveal: { ios: impact(Haptics.ImpactFeedbackStyle.Medium), android: android(Haptics.AndroidHaptics.Context_Click) },
  epicReveal: { ios: impact(Haptics.ImpactFeedbackStyle.Heavy), android: android(Haptics.AndroidHaptics.Confirm) },
  legendaryReveal: {
    ios: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    android: android(Haptics.AndroidHaptics.Confirm),
  },
  success: {
    ios: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    android: android(Haptics.AndroidHaptics.Confirm),
  },
  gentle: { ios: impact(Haptics.ImpactFeedbackStyle.Soft), android: android(Haptics.AndroidHaptics.Clock_Tick) },
};

/** Rapid repeats (e.g. tear ticks) are coalesced so the actuator never buzzes. */
const MIN_INTERVAL_MS = 40;
let lastFired = 0;

export const haptic = (event: HapticEvent): void => {
  if (!settingsStore.get().haptics) return;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  const now = Date.now();
  if (now - lastFired < MIN_INTERVAL_MS) return;
  lastFired = now;
  const pattern = PATTERNS[event];
  (Platform.OS === 'ios' ? pattern.ios() : pattern.android()).catch(() => undefined);
};

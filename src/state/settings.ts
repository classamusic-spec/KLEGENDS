import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { createStore, useStore } from './store';
import type { RevealSpeed } from '@/domain/packs';

export type VisualQuality = 'performance' | 'balanced' | 'cinematic';
export type ReducedMotionPreference = 'system' | 'on' | 'off';

export interface Settings {
  readonly musicVolume: number;
  readonly effectsVolume: number;
  readonly narrationVolume: number;
  readonly haptics: boolean;
  readonly reducedMotion: ReducedMotionPreference;
  readonly revealSpeed: RevealSpeed;
  readonly visualQuality: VisualQuality;
  /** Use the device's motion sensors to tilt cards during inspection. */
  readonly motionTilt: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.5,
  effectsVolume: 0.8,
  narrationVolume: 0.8,
  haptics: true,
  reducedMotion: 'system',
  revealSpeed: 'standard',
  visualQuality: 'balanced',
  motionTilt: false,
};

const STORAGE_KEY = 'kl.settings.v1';

export const settingsStore = createStore<Settings>(DEFAULT_SETTINGS);

const clampVolume = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** Validates persisted settings field by field, falling back to defaults. */
export const sanitizeSettings = (raw: unknown): Settings => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
    options.includes(value as T) ? (value as T) : fallback;
  return {
    musicVolume: clampVolume(r.musicVolume, DEFAULT_SETTINGS.musicVolume),
    effectsVolume: clampVolume(r.effectsVolume, DEFAULT_SETTINGS.effectsVolume),
    narrationVolume: clampVolume(r.narrationVolume, DEFAULT_SETTINGS.narrationVolume),
    haptics: typeof r.haptics === 'boolean' ? r.haptics : DEFAULT_SETTINGS.haptics,
    reducedMotion: oneOf(r.reducedMotion, ['system', 'on', 'off'], DEFAULT_SETTINGS.reducedMotion),
    revealSpeed: oneOf(r.revealSpeed, ['cinematic', 'standard', 'quick'], DEFAULT_SETTINGS.revealSpeed),
    visualQuality: oneOf(r.visualQuality, ['performance', 'balanced', 'cinematic'], DEFAULT_SETTINGS.visualQuality),
    motionTilt: typeof r.motionTilt === 'boolean' ? r.motionTilt : DEFAULT_SETTINGS.motionTilt,
  };
};

export const loadSettings = async (): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) settingsStore.set(sanitizeSettings(JSON.parse(stored)));
  } catch (error) {
    console.warn('[settings] Using defaults; stored settings could not be read', error);
  }
};

export const updateSettings = (patch: Partial<Settings>): void => {
  settingsStore.set((prev) => ({ ...prev, ...patch }));
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsStore.get())).catch((error: unknown) =>
    console.warn('[settings] Failed to persist settings', error),
  );
};

export const useSettings = <S,>(selector: (s: Settings) => S): S => useStore(settingsStore, selector);

/** System "reduce motion" flag, tracked live. */
const useSystemReducedMotion = (): boolean => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted && setEnabled(value))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return enabled;
};

/** Effective reduced-motion state: the in-app preference wins over the system flag. */
export const useReducedMotion = (): boolean => {
  const preference = useSettings((s) => s.reducedMotion);
  const system = useSystemReducedMotion();
  return preference === 'on' || (preference === 'system' && system);
};

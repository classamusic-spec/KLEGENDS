import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * Seconds since mount, advanced every frame on the UI thread. Drives idle
 * shimmer, particles and shader time. Pass `active = false` to freeze it
 * (reduced motion, performance mode, or an inactive screen).
 */
export const useFrameTime = (active: boolean): SharedValue<number> => {
  const time = useSharedValue(0);
  useFrameCallback((info) => {
    'worklet';
    time.set(time.get() + Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000));
  }, active);
  return time;
};

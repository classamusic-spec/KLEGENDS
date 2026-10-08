import { useMemo } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { PackMotion } from '@/graphics/pack/PackStage';

/**
 * Creates the shared values that drive the pack stage. Pass `clock` to
 * share one frame clock with the rest of the scene.
 */
export const usePackMotion = (clock?: SharedValue<number>): PackMotion => {
  const entrance = useSharedValue(0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const progress = useSharedValue(0);
  const side = useSharedValue(1);
  const curl = useSharedValue(0);
  const tension = useSharedValue(0);
  const fly = useSharedValue(0);
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);
  const grip = useSharedValue(0);
  const nudgeX = useSharedValue(0);
  const nudgeY = useSharedValue(0);
  const glow = useSharedValue(0);
  const rise = useSharedValue(0);
  const fall = useSharedValue(0);
  const handoff = useSharedValue(0);
  const ownTime = useSharedValue(0);
  const time = clock ?? ownTime;
  return useMemo(
    () => ({ entrance, tiltX, tiltY, progress, side, curl, tension, fly, grabX, grabY, grip, nudgeX, nudgeY, glow, rise, fall, handoff, time }),
    [entrance, tiltX, tiltY, progress, side, curl, tension, fly, grabX, grabY, grip, nudgeX, nudgeY, glow, rise, fall, handoff, time],
  );
};

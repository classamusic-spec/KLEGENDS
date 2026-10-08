import { useMemo } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import type { PackMotion } from '@/graphics/pack/PackStage';

/** Creates the shared values that drive the pack stage. */
export const usePackMotion = (): PackMotion => {
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
  const time = useSharedValue(0);
  return useMemo(
    () => ({ entrance, tiltX, tiltY, progress, side, curl, tension, fly, grabX, grabY, grip, nudgeX, nudgeY, glow, rise, fall, time }),
    [entrance, tiltX, tiltY, progress, side, curl, tension, fly, grabX, grabY, grip, nudgeX, nudgeY, glow, rise, fall, time],
  );
};

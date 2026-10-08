import { DeviceMotion } from 'expo-sensors';
import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { easings, springs } from '@/design/motion';
import type { CardId } from '@/domain/cards';
import { CardView } from '@/graphics/card/CardView';
import { useFrameTime } from '@/graphics/fx/useFrameTime';
import { useReducedMotion, useSettings } from '@/state/settings';

export interface HeroCardProps {
  readonly cardId: CardId;
  readonly undiscovered?: boolean;
  /** Card width in points. */
  readonly width: number;
  /** False while the screen is not visible: the clock and sensors stop. */
  readonly active: boolean;
  /** Show the back of the card. */
  readonly flipped?: boolean;
  /** A slow, gentle sway while untouched. */
  readonly idle?: boolean;
  /** Follow the device's motion sensors (when enabled in Settings). */
  readonly sensorTilt?: boolean;
  readonly onPress?: () => void;
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
  readonly testID?: string;
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/** Device tilt as two shared values, relative to a slowly re-centring baseline. */
const useSensorTilt = (enabled: boolean) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      x.set(withTiming(0, { duration: 300 }));
      y.set(withTiming(0, { duration: 300 }));
      return;
    }
    let baseline: { beta: number; gamma: number } | null = null;
    DeviceMotion.setUpdateInterval(33);
    const sub = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation) return;
      baseline = baseline ?? { beta: rotation.beta, gamma: rotation.gamma };
      // Holding the phone at a new angle slowly becomes the new neutral.
      baseline = { beta: baseline.beta + (rotation.beta - baseline.beta) * 0.02, gamma: baseline.gamma + (rotation.gamma - baseline.gamma) * 0.02 };
      x.set(clamp((rotation.gamma - baseline.gamma) / 0.4));
      y.set(clamp((rotation.beta - baseline.beta) / 0.4));
    });
    return () => sub.remove();
  }, [enabled, x, y]);
  return { x, y };
};

/**
 * A large, touchable collectible: drag to turn it in the light, tap to act.
 * Used by the Royal Hall showcase and the Artifact Chamber.
 */
export function HeroCard({
  cardId,
  undiscovered = false,
  width,
  active,
  flipped = false,
  idle = true,
  sensorTilt = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: HeroCardProps) {
  const reducedMotion = useReducedMotion();
  const quality = useSettings((s) => s.visualQuality);
  const motionSetting = useSettings((s) => s.motionTilt);
  const time = useFrameTime(active && !reducedMotion);
  const sensor = useSensorTilt(active && sensorTilt && motionSetting && !reducedMotion);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const lift = useSharedValue(1);
  const rotation = useSharedValue(flipped ? Math.PI : 0);
  const sway = idle && !reducedMotion ? 1 : 0;

  useEffect(() => {
    const target = flipped ? Math.PI : 0;
    rotation.set(reducedMotion ? target : withTiming(target, { duration: 650, easing: easings.cinematic }));
  }, [flipped, reducedMotion, rotation]);

  const tiltX = useDerivedValue(() => clamp(Math.sin(time.get() * 0.45) * 0.24 * sway + dragX.get() + sensor.x.get()));
  const tiltY = useDerivedValue(() => clamp(Math.cos(time.get() * 0.37) * 0.12 * sway + dragY.get() + sensor.y.get()));

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(4)
      .onBegin(() => {
        lift.set(withSpring(1.03, springs.object));
      })
      .onUpdate((e) => {
        dragX.set(clamp(e.translationX / (width * 0.55)));
        dragY.set(clamp(e.translationY / (width * 0.75)));
      })
      .onFinalize(() => {
        lift.set(withSpring(1, springs.settle));
        dragX.set(withSpring(0, springs.settle));
        dragY.set(withSpring(0, springs.settle));
      });
    const tap = Gesture.Tap()
      .maxDistance(10)
      .runOnJS(true)
      .onEnd(() => onPress?.());
    return Gesture.Exclusive(pan, tap);
  }, [dragX, dragY, lift, width, onPress]);

  const float = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin(time.get() * 0.8) * 3 * sway }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.wrap, float]}
        accessible
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onAccessibilityTap={onPress}
        testID={testID}
      >
        <View>
          <CardView
            cardId={cardId}
            undiscovered={undiscovered}
            width={width}
            tiltX={tiltX}
            tiltY={tiltY}
            rotation={rotation}
            scale={lift}
            time={time}
            quality={quality}
            padding={30}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
});

import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { durations, easings } from '@/design/motion';
import { colors } from '@/design/tokens';
import { useSvgId } from './svgId';

export interface ProgressBarProps {
  /** 0–1. */
  readonly value: number;
  readonly height?: number;
  readonly accessibilityLabel: string;
  readonly style?: StyleProp<ViewStyle>;
}

/** Gold progress rule with a polished fill; animates when the value changes. */
export function ProgressBar({ value, height = 6, accessibilityLabel, style }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  const gradientId = useSvgId('kl-progress');
  const progress = useSharedValue(clamped);
  useEffect(() => {
    progress.set(withTiming(clamped, { duration: durations.screen, easing: easings.standard }));
  }, [clamped, progress]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
    >
      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fillStyle]}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none" aria-hidden>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#8F6C36" />
              <Stop offset="0.7" stopColor="#D8B675" />
              <Stop offset="1" stopColor="#F6E3AE" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: '#211C16',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderGold,
    overflow: 'hidden',
  },
  fill: { height: '100%', overflow: 'hidden' },
});

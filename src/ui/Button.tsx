import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { springs } from '@/design/motion';
import { colors, layout, radii } from '@/design/tokens';
import { feedback } from '@/feedback';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly icon?: IconName;
  readonly trailingIcon?: IconName;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly size?: 'md' | 'lg';
  readonly accessibilityHint?: string;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
  /** Which feedback to play on press; screens that play their own cue pass 'none'. */
  readonly sound?: 'tap' | 'confirm' | 'none';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type StopSpec = readonly [offset: string, color: string, opacity: number];
const PRIMARY_STOPS: readonly StopSpec[] = [
  ['0', '#F6E3AE', 1],
  ['0.48', '#D9B777', 1],
  ['1', '#A47D3D', 1],
];
const SECONDARY_STOPS: readonly StopSpec[] = [
  ['0', '#1C222D', 0.92],
  ['1', '#11151C', 0.92],
];

/** Engraved metal face drawn with SVG so it renders identically on every platform. */
function ButtonFace({ variant }: { variant: ButtonVariant }) {
  if (variant === 'ghost') return null;
  const primary = variant === 'primary';
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" accessible={false}>
      <Defs>
        <LinearGradient id="face" x1="0" y1="0" x2="0" y2="1">
          {(primary ? PRIMARY_STOPS : SECONDARY_STOPS).map(([offset, color, opacity]) => (
            <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0.5" y="0.5" width="99.5%" height="98%" rx={radii.md} fill="url(#face)" stroke={primary ? '#7A5B2C' : colors.borderGold} strokeWidth={1} />
      <Rect
        x="2"
        y="1.6"
        width="97%"
        height="1"
        fill={primary ? 'rgba(255, 249, 228, 0.75)' : 'rgba(232, 203, 142, 0.16)'}
      />
    </Svg>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  trailingIcon,
  disabled = false,
  loading = false,
  size = 'lg',
  accessibilityHint,
  testID,
  style,
  sound = 'tap',
}: ButtonProps) {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.035 }],
    opacity: 1 - pressed.get() * 0.08,
  }));

  const inactive = disabled || loading;
  const handlePress = useCallback(() => {
    if (inactive) return;
    if (sound === 'tap') feedback.tap();
    if (sound === 'confirm') feedback.confirm();
    onPress();
  }, [inactive, onPress, sound]);

  const textColor = variant === 'primary' ? colors.textOnGold : colors.goldBright;

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={handlePress}
      onPressIn={() => pressed.set(withSpring(1, springs.press))}
      onPressOut={() => pressed.set(withSpring(0, springs.press))}
      style={[
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        variant === 'primary' && !inactive ? styles.primaryShadow : null,
        inactive ? styles.inactive : null,
        animatedStyle,
        style,
      ]}
    >
      <ButtonFace variant={variant} />
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={textColor} size="small" /> : null}
        {!loading && icon ? <Icon name={icon} size={18} color={textColor} strokeWidth={1.9} /> : null}
        <AppText variant="button" color={textColor} numberOfLines={1}>
          {label}
        </AppText>
        {!loading && trailingIcon ? <Icon name={trailingIcon} size={18} color={textColor} strokeWidth={1.9} /> : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouch,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  lg: { height: 54 },
  md: { height: 44 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryShadow: { boxShadow: '0px 8px 22px rgba(198, 164, 106, 0.22)' },
  inactive: { opacity: 0.45 },
});

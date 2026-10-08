import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { colors, layout } from '@/design/tokens';
import { feedback } from '@/feedback';

export interface IconButtonProps {
  readonly icon: IconName;
  readonly label: string;
  readonly onPress: () => void;
  readonly active?: boolean;
  readonly size?: number;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

/** Circular, restrained control for headers and action rails. */
export function IconButton({ icon, label, onPress, active = false, size = 44, testID, style }: IconButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-selected={active}
      hitSlop={6}
      onPress={() => {
        feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        active ? styles.iconButtonActive : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <Icon name={icon} size={size * 0.48} color={active ? colors.goldBright : colors.textPrimary} filled={active && icon === 'heart'} />
    </Pressable>
  );
}

export interface ChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}

export function Chip({ label, selected, onPress, testID }: ChipProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      aria-selected={selected}
      accessibilityLabel={`${label} filter`}
      onPress={() => {
        feedback.select();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, selected ? styles.chipSelected : null, pressed ? styles.pressed : null]}
    >
      <AppText variant="label" color={selected ? colors.textOnGold : colors.textSecondary} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Fine gold rule with a central lozenge, used to separate editorial sections. */
export function OrnamentDivider({ width = 180, style }: { width?: number; style?: StyleProp<ViewStyle> }) {
  const mid = width / 2;
  return (
    <View style={[styles.divider, style]} aria-hidden>
      <Svg width={width} height={10}>
        <Rect x={0} y={4.5} width={mid - 10} height={1} fill={colors.borderGold} />
        <Rect x={mid + 10} y={4.5} width={mid - 10} height={1} fill={colors.borderGold} />
        <Path d={`M${mid} 0.5 L${mid + 4.5} 5 L${mid} 9.5 L${mid - 4.5} 5 Z`} fill="none" stroke={colors.gold} strokeWidth={1} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 21, 28, 0.72)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minWidth: layout.minTouch,
    minHeight: layout.minTouch,
  },
  iconButtonActive: { borderColor: colors.borderGoldBright },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  chip: {
    minHeight: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: 'rgba(17, 21, 28, 0.8)',
  },
  chipSelected: { backgroundColor: colors.goldBright, borderColor: colors.goldBright },
  divider: { alignItems: 'center' },
});

import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { colors, radii } from '@/design/tokens';
import { feedback } from '@/feedback';

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

export interface SegmentedProps<T extends string> {
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly accessibilityLabel: string;
  readonly testID?: string;
}

/** A row of mutually exclusive choices (accessible as a radio group). */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel, testID }: SegmentedProps<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            aria-checked={selected}
            accessibilityLabel={option.label}
            onPress={() => {
              if (selected) return;
              feedback.select();
              onChange(option.value);
            }}
            style={({ pressed }) => [styles.option, selected ? styles.selected : null, pressed ? styles.pressed : null]}
            testID={testID ? `${testID}-${option.value}` : undefined}
          >
            <AppText variant="label" color={selected ? colors.textOnGold : colors.textSecondary} numberOfLines={1}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: 'rgba(17, 21, 28, 0.8)',
    padding: 3,
    gap: 3,
  },
  option: { flex: 1, minHeight: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  selected: { backgroundColor: colors.goldBright },
  pressed: { opacity: 0.75 },
});

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { IconButton } from './controls';
import { colors, spacing } from '@/design/tokens';

export interface ScreenHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly onBack?: () => void;
  readonly backLabel?: string;
  /** Controls on the right (icon buttons). */
  readonly right?: ReactNode;
}

/** Engraved screen title: eyebrow, display title and an optional line of context. */
export function ScreenHeader({ eyebrow, title, subtitle, onBack, backLabel = 'Back', right }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      {onBack ? <IconButton icon="back" label={backLabel} onPress={onBack} testID="header-back" /> : null}
      <View style={styles.text}>
        {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
        <AppText variant="displayL" accessibilityRole="header" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  right: { flexDirection: 'row', gap: spacing.sm },
});

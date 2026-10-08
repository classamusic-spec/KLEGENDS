import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors, spacing } from '@/design/tokens';
import { useSvgId } from './svgId';

/** Obsidian ground with a faint warm light from above. */
export function ScreenBackdrop() {
  const id = useSvgId('kl-screen-light');
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} aria-hidden>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="0%" rx="85%" ry="55%">
          <Stop offset="0" stopColor="#2A2416" stopOpacity={0.9} />
          <Stop offset="0.55" stopColor="#141820" stopOpacity={0.6} />
          <Stop offset="1" stopColor={colors.background} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={colors.background} />
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export interface ScreenProps {
  readonly children?: ReactNode;
  /** Scrollable content (default) or a fixed full-height layout. */
  readonly scroll?: boolean;
  /** Screens inside the tab navigator leave the bottom inset to the tab bar. */
  readonly inTabs?: boolean;
  readonly contentStyle?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

/** Standard screen scaffold: backdrop, safe areas and gutters. */
export function Screen({ children, scroll = true, inTabs = false, contentStyle, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing.sm,
    paddingBottom: (inTabs ? 0 : insets.bottom) + spacing.xxl,
    paddingHorizontal: spacing.gutter,
  };
  return (
    <View style={styles.root} testID={testID}>
      <ScreenBackdrop />
      {scroll ? (
        <ScrollView contentContainerStyle={[padding, styles.content, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fixed, padding, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  fixed: { flex: 1 },
});

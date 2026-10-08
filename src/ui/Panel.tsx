import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii } from '@/design/tokens';

/** Small engraved bracket for one corner of an ornate panel. */
function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const flipX = position === 'tr' || position === 'br';
  const flipY = position === 'bl' || position === 'br';
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      style={[
        styles.corner,
        flipX ? { right: 3 } : { left: 3 },
        flipY ? { bottom: 3 } : { top: 3 },
        { transform: [{ scaleX: flipX ? -1 : 1 }, { scaleY: flipY ? -1 : 1 }] },
      ]}
      accessible={false}
    >
      <Path d="M1.5 12V4.5a3 3 0 0 1 3-3H12" stroke={colors.borderGoldBright} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <Path d="M4.6 7.4 7.4 4.6" stroke={colors.borderGoldBright} strokeWidth={1} strokeLinecap="round" />
    </Svg>
  );
}

export interface PanelProps {
  readonly children?: ReactNode;
  readonly ornate?: boolean;
  readonly tone?: 'obsidian' | 'glass';
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

/** Obsidian surface with a fine engraved edge — the default container. */
export function Panel({ children, ornate = false, tone = 'obsidian', style, testID }: PanelProps) {
  return (
    <View testID={testID} style={[styles.panel, tone === 'glass' ? styles.glass : null, style]}>
      <View pointerEvents="none" style={styles.innerHighlight} />
      {ornate ? (
        <>
          <Corner position="tl" />
          <Corner position="tr" />
          <Corner position="bl" />
          <Corner position="br" />
        </>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(21, 25, 32, 0.94)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 18,
    boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.45)',
  },
  glass: { backgroundColor: colors.surfaceGlass },
  innerHighlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(232, 203, 142, 0.14)',
  },
  corner: { position: 'absolute' },
});

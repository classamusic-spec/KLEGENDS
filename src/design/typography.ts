import { useMemo } from 'react';
import { useWindowDimensions, type TextStyle } from 'react-native';

import { fonts } from './fonts';
import { colors } from './tokens';

export type TextVariant =
  | 'displayXL'
  | 'displayL'
  | 'displayM'
  | 'displayS'
  | 'eyebrow'
  | 'title'
  | 'bodyL'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'button'
  | 'scriptureL'
  | 'scripture'
  | 'scriptureItalic';

interface VariantSpec {
  readonly fontFamily: string;
  readonly size: number;
  readonly lineHeight: number;
  readonly letterSpacing?: number;
  readonly uppercase?: boolean;
  readonly color?: string;
  /** Cap on OS text scaling for layout-critical styles; body text scales freely. */
  readonly maxScale: number;
}

const SPECS: Readonly<Record<TextVariant, VariantSpec>> = {
  displayXL: { fontFamily: fonts.display, size: 40, lineHeight: 46, letterSpacing: 1.2, maxScale: 1.15 },
  displayL: { fontFamily: fonts.display, size: 30, lineHeight: 36, letterSpacing: 0.8, maxScale: 1.2 },
  displayM: { fontFamily: fonts.display, size: 22, lineHeight: 28, letterSpacing: 0.6, maxScale: 1.25 },
  displayS: { fontFamily: fonts.display, size: 16, lineHeight: 22, letterSpacing: 1, maxScale: 1.3 },
  eyebrow: { fontFamily: fonts.uiSemiBold, size: 11, lineHeight: 14, letterSpacing: 2.4, uppercase: true, color: colors.gold, maxScale: 1.3 },
  title: { fontFamily: fonts.uiBold, size: 17, lineHeight: 22, maxScale: 1.4 },
  bodyL: { fontFamily: fonts.ui, size: 16, lineHeight: 24, maxScale: 1.8 },
  body: { fontFamily: fonts.ui, size: 14, lineHeight: 21, color: colors.textSecondary, maxScale: 1.8 },
  bodyStrong: { fontFamily: fonts.uiSemiBold, size: 14, lineHeight: 21, maxScale: 1.8 },
  caption: { fontFamily: fonts.uiMedium, size: 12, lineHeight: 16, color: colors.textSecondary, maxScale: 1.5 },
  label: { fontFamily: fonts.uiSemiBold, size: 13, lineHeight: 16, letterSpacing: 0.4, maxScale: 1.4 },
  button: { fontFamily: fonts.uiBold, size: 14, lineHeight: 18, letterSpacing: 1.8, uppercase: true, maxScale: 1.3 },
  scriptureL: { fontFamily: fonts.scripture, size: 23, lineHeight: 31, maxScale: 1.6 },
  scripture: { fontFamily: fonts.scripture, size: 19, lineHeight: 27, maxScale: 1.7 },
  scriptureItalic: { fontFamily: fonts.scriptureItalic, size: 19, lineHeight: 27, maxScale: 1.7 },
};

/** Compact phones (e.g. 320–359 pt wide) get a slightly tighter scale. */
export const scaleForWidth = (width: number): number => (width < 360 ? 0.9 : width < 390 ? 0.96 : 1);

export interface ResolvedVariant {
  readonly style: TextStyle;
  readonly maxFontSizeMultiplier: number;
  readonly uppercase: boolean;
}

export const resolveVariant = (variant: TextVariant, scale: number): ResolvedVariant => {
  const spec = SPECS[variant];
  return {
    style: {
      fontFamily: spec.fontFamily,
      fontSize: Math.round(spec.size * scale * 10) / 10,
      lineHeight: Math.round(spec.lineHeight * scale),
      letterSpacing: spec.letterSpacing,
      color: spec.color ?? colors.textPrimary,
    },
    maxFontSizeMultiplier: spec.maxScale,
    uppercase: spec.uppercase ?? false,
  };
};

export const useTypeScale = (): number => {
  const { width } = useWindowDimensions();
  return scaleForWidth(width);
};

export const useVariant = (variant: TextVariant): ResolvedVariant => {
  const scale = useTypeScale();
  return useMemo(() => resolveVariant(variant, scale), [variant, scale]);
};

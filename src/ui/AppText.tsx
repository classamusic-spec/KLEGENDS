import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useVariant, type TextVariant } from '@/design/typography';

export interface AppTextProps extends Omit<TextProps, 'style'> {
  readonly variant?: TextVariant;
  readonly color?: string;
  readonly align?: TextStyle['textAlign'];
  readonly style?: StyleProp<TextStyle>;
  readonly children?: ReactNode;
}

/** Typography primitive. Respects OS text scaling with per-variant caps. */
export function AppText({ variant = 'body', color, align, style, children, ...rest }: AppTextProps) {
  const resolved = useVariant(variant);
  const content =
    resolved.uppercase && typeof children === 'string' ? children.toUpperCase() : children;
  return (
    <Text
      maxFontSizeMultiplier={resolved.maxFontSizeMultiplier}
      {...rest}
      style={[resolved.style, color ? { color } : null, align ? { textAlign: align } : null, style]}
    >
      {content}
    </Text>
  );
}

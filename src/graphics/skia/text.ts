import { Skia, TextAlign, type SkCanvas, type SkPaint } from '@shopify/react-native-skia';

import type { SkiaFonts } from './fonts';

export interface TextSpec {
  readonly text: string;
  readonly family: string;
  readonly size: number;
  /** Solid color, or provide `paint` for gradient-filled text. */
  readonly color?: string;
  readonly paint?: SkPaint;
  readonly letterSpacing?: number;
  readonly align?: 'left' | 'center' | 'right';
  /** Box the paragraph is laid out in (card units). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly shadow?: { readonly color: string; readonly blur: number; readonly dy?: number };
  readonly maxLines?: number;
}

const ALIGN = { left: TextAlign.Left, center: TextAlign.Center, right: TextAlign.Right } as const;

/** Draws a laid-out paragraph and returns its height. */
export const drawText = (canvas: SkCanvas, fonts: SkiaFonts, spec: TextSpec): number => {
  const builder = Skia.ParagraphBuilder.Make({ textAlign: ALIGN[spec.align ?? 'center'], maxLines: spec.maxLines ?? 2, ellipsis: '…' }, fonts.provider);
  builder.pushStyle(
    {
      fontFamilies: [spec.family],
      fontSize: spec.size,
      color: Skia.Color(spec.color ?? '#FFFFFF'),
      letterSpacing: spec.letterSpacing ?? 0,
      shadows: spec.shadow
        ? [{ color: Skia.Color(spec.shadow.color), blurRadius: spec.shadow.blur, offset: { x: 0, y: spec.shadow.dy ?? 0 } }]
        : undefined,
    },
    spec.paint,
  );
  builder.addText(spec.text);
  builder.pop();
  const paragraph = builder.build();
  paragraph.layout(spec.width);
  paragraph.paint(canvas, spec.x, spec.y);
  return paragraph.getHeight();
};

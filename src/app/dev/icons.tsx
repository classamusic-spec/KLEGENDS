import { ImageFormat, type SkCanvas } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

import { drawCrown, GOLD, metalShader } from '@/graphics/art/emblems';
import { bakeImage } from '@/graphics/skia/bake';
import { linear, makePaint, radial, withAlpha } from '@/graphics/skia/draw';

/**
 * Development tool: bakes the app icon, adaptive icon layers, splash mark and
 * favicon from the same crest used in the game. `scripts/export-icons.mjs`
 * reads the PNGs from this page and writes them to assets/.
 */
const OBSIDIAN = ['#1A1F2B', '#0E1118', '#07080C'] as const;

const crest = (canvas: SkCanvas, size: number, { ring = true, background = true }: { ring?: boolean; background?: boolean }) => {
  const c = size / 2;
  if (background) {
    canvas.drawRect({ x: 0, y: 0, width: size, height: size }, makePaint({ shader: radial([c, c * 0.9], size * 0.75, [...OBSIDIAN]) }));
    canvas.drawCircle(c, c * 0.95, size * 0.42, makePaint({ shader: radial([c, c * 0.95], size * 0.42, [withAlpha('#E8CB8E', 0.22), withAlpha('#E8CB8E', 0)]) }));
  }
  if (ring) {
    canvas.drawCircle(c, c, size * 0.33, makePaint({ shader: metalShader(GOLD, c - size * 0.33, c - size * 0.33, size * 0.66, size * 0.66), stroke: size * 0.022 }));
    canvas.drawCircle(c, c, size * 0.3, makePaint({ color: GOLD[2], stroke: size * 0.004, alpha: 0.7 }));
  }
  drawCrown(canvas, [c, c + size * 0.01], size * 0.4, GOLD, true);
};

const ICONS: Record<string, { size: number; draw: (canvas: SkCanvas, size: number) => void }> = {
  'icon.png': { size: 1024, draw: (canvas, size) => crest(canvas, size, {}) },
  'android-icon-background.png': {
    size: 512,
    draw: (canvas, size) => canvas.drawRect({ x: 0, y: 0, width: size, height: size }, makePaint({ shader: linear([0, 0], [0, size], ['#141822', '#0B0D12']) })),
  },
  'android-icon-foreground.png': {
    // Adaptive icons crop to the inner ~66%: keep the crest small.
    size: 512,
    draw: (canvas, size) => {
      canvas.save();
      canvas.translate(size * 0.18, size * 0.18);
      crest(canvas, size * 0.64, { background: false });
      canvas.restore();
    },
  },
  'android-icon-monochrome.png': {
    size: 432,
    draw: (canvas, size) => {
      canvas.save();
      canvas.translate(size * 0.18, size * 0.18);
      drawCrown(canvas, [size * 0.32, size * 0.32], size * 0.26, ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'], false);
      canvas.restore();
    },
  },
  'splash-icon.png': { size: 1024, draw: (canvas, size) => crest(canvas, size, { background: false }) },
  'favicon.png': { size: 48, draw: (canvas, size) => crest(canvas, size, { ring: false }) },
};

export default function IconLab() {
  const [uris, setUris] = useState<Record<string, string>>({});
  useEffect(() => {
    const out: Record<string, string> = {};
    for (const [name, { size, draw }] of Object.entries(ICONS)) {
      const image = bakeImage(size, size, (canvas) => draw(canvas, size));
      out[name] = `data:image/png;base64,${image.encodeToBase64(ImageFormat.PNG, 100)}`;
    }
    const id = setTimeout(() => setUris(out), 0);
    return () => clearTimeout(id);
  }, []);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, backgroundColor: '#333' }}>
      {Object.entries(uris).map(([name, uri]) => (
        <View key={name} testID={`icon-${name}`}>
          <Text style={{ color: '#fff' }}>{name}</Text>
          <Image source={{ uri }} style={{ width: 160, height: 160 }} />
        </View>
      ))}
    </ScrollView>
  );
}

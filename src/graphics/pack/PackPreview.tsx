import { BlurMask, Canvas, Group, ImageShader, Oval, Rect, Shader, type SkImage } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio, View } from 'react-native';
import { useDerivedValue, type DerivedValue } from 'react-native-reanimated';

import { PACK_H, PACK_W } from './packGeometry';
import { getPackEffect } from './packShader';
import { usePackTexture } from './usePackTexture';
import type { Opaque } from '../skia/opaque';
import type { PackVisualTheme } from '@/domain/packs';

export interface PackPreviewProps {
  readonly theme: PackVisualTheme;
  /** Pack width in points. */
  readonly width: number;
  /** Shared clock (seconds); a constant clock shows the pack at rest. */
  readonly time: DerivedValue<number>;
  /** 0–1 how much the pack sways and catches the light. */
  readonly sway: number;
}

const MARGIN = 18;

/** A sealed pack resting in the light: the wrapper material without the tear rig. */
export function PackPreview({ theme, width, time, sway }: PackPreviewProps) {
  const scale = width / PACK_W;
  const texture = usePackTexture(theme, Math.min(3, scale * PixelRatio.get()));
  const height = PACK_H * scale;
  if (!texture) return <View style={{ width: width + MARGIN * 2, height: height + MARGIN * 2 }} />;
  return <PackPreviewCanvas texture={texture} width={width} time={time} sway={sway} />;
}

function PackPreviewCanvas({ texture, width, time, sway }: { texture: Opaque<SkImage>; width: number; time: DerivedValue<number>; sway: number }) {
  const image = texture.value;
  const effect = useMemo(() => getPackEffect(), []);
  const scale = width / PACK_W;
  const height = PACK_H * scale;
  const texScale = image.width() / PACK_W;
  const uniforms = useDerivedValue(() => {
    const t = time.get();
    return {
      texScale,
      packSize: [PACK_W, PACK_H],
      tilt: [Math.sin(t * 0.5) * 0.7 * sway, Math.cos(t * 0.35) * 0.3 * sway],
      grab: [0, 0, 0],
      time: t,
      sheen: 1,
      curl: [0, 1, 0],
    };
  });
  const transform = useDerivedValue(() => {
    const t = time.get();
    return [
      { translateX: MARGIN + width / 2 },
      { translateY: MARGIN + height / 2 + Math.sin(t * 0.8) * 2.5 * sway },
      { rotate: Math.sin(t * 0.45) * 0.02 * sway },
      { scale },
      { translateX: -PACK_W / 2 },
      { translateY: -PACK_H / 2 },
    ];
  });
  return (
    <Canvas style={{ width: width + MARGIN * 2, height: height + MARGIN * 2 }} pointerEvents="none">
      <Oval x={MARGIN + width * 0.1} y={MARGIN + height - 8} width={width * 0.8} height={18} color="rgba(0,0,0,0.55)">
        <BlurMask blur={8} style="normal" />
      </Oval>
      <Group transform={transform}>
        <Rect x={0} y={0} width={PACK_W} height={PACK_H}>
          <Shader source={effect} uniforms={uniforms}>
            <ImageShader image={image} tx="decal" ty="decal" />
          </Shader>
        </Rect>
      </Group>
    </Canvas>
  );
}

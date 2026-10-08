import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { PixelRatio, useWindowDimensions, View } from 'react-native';

import { KINGDOM_DISCOVERY_THEME } from '@/content';
import { usePackMotion } from '@/features/treasury/packMotion';
import { useCardBack } from '@/graphics/card/textures';
import { PACK_H, PACK_W } from '@/graphics/pack/packGeometry';
import { PackStage } from '@/graphics/pack/PackStage';
import { usePackTexture } from '@/graphics/pack/usePackTexture';
import { Opaque } from '@/graphics/skia/opaque';

/** Development pack lab: renders the pack at a fixed pose from URL params. */
export default function PackLab() {
  const q = useLocalSearchParams<Record<string, string>>();
  const { width, height } = useWindowDimensions();
  const packW = Math.min(width * 0.68, 290);
  const scale = packW / PACK_W;
  const placement = { x: (width - packW) / 2, y: height * 0.47 - (PACK_H * scale) / 2, scale };
  const texScale = Math.min(3, scale * PixelRatio.get());
  const pack = usePackTexture(KINGDOM_DISCOVERY_THEME, texScale);
  const back = useCardBack(texScale);
  const backHandle = useMemo(() => (back ? new Opaque(back) : null), [back]);
  const m = usePackMotion();
  useEffect(() => {
    m.entrance.set(1);
    m.progress.set(Number(q.p ?? 0));
    m.side.set(Number(q.side ?? 1));
    m.curl.set(Number(q.curl ?? 1));
    m.tension.set(Number(q.tension ?? 0));
    m.fly.set(Number(q.fly ?? 0));
    m.glow.set(Number(q.glow ?? 0));
    m.rise.set(Number(q.rise ?? 0));
    m.fall.set(Number(q.fall ?? 0));
    m.grip.set(Number(q.grip ?? 0));
    m.grabX.set(Number(q.gx ?? 30));
    m.grabY.set(Number(q.gy ?? 50));
    m.tiltX.set(Number(q.tx ?? 0));
  }, [m, q]);
  if (!pack || !backHandle) return <View style={{ flex: 1 }} />;
  return <PackStage width={width} height={height} placement={placement} motion={m} packTexture={pack} cardBack={backHandle} />;
}

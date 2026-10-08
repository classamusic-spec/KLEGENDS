import { BlurMask, Canvas, Circle, Group, Path, Points, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { rng } from '@/graphics/skia/draw';

/** Animated inputs of the reveal effects (all 0–1 unless noted). */
export interface RevealFx {
  /** Soft colored aura behind the card. */
  readonly aura: SharedValue<number>;
  /** Rotating light rays (epic, legendary). */
  readonly rays: SharedValue<number>;
  /** Ray rotation in radians. */
  readonly rayAngle: SharedValue<number>;
  /** Expanding burst ring at the moment of revelation. */
  readonly burst: SharedValue<number>;
  /** Ribbon of light tracing the card edge (legendary). */
  readonly ribbon: SharedValue<number>;
  /** Ribbon fade-out. */
  readonly ribbonFade: SharedValue<number>;
}

export interface RevealEffectsProps {
  readonly width: number;
  readonly height: number;
  readonly card: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  /** Glow color of the revealed rarity (hex). */
  readonly color: string;
  readonly fx: RevealFx;
  readonly showRays: boolean;
}

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Light behind the revealed card. Majestic rather than chaotic: no flashes
 * to white, no shake — contrast, timing and a few controlled light sources.
 */
export function RevealEffects({ width, height, card, color, fx, showRays }: RevealEffectsProps) {
  const cx = card.x + card.width / 2;
  const cy = card.y + card.height / 2;
  const reach = Math.max(card.width, card.height);

  const rays = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const w = 0.07;
      b.moveTo(0, 0);
      b.lineTo(Math.cos(a - w) * reach * 1.3, Math.sin(a - w) * reach * 1.3);
      b.lineTo(Math.cos(a + w) * reach * 1.3, Math.sin(a + w) * reach * 1.3);
      b.close();
    }
    return b.build();
  }, [reach]);

  const ribbonPath = useMemo(() => {
    const pad = 6;
    return Skia.Path.RRect({ rect: { x: card.x - pad, y: card.y - pad, width: card.width + pad * 2, height: card.height + pad * 2 }, rx: 16, ry: 16 });
  }, [card.x, card.y, card.width, card.height]);

  const particles = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 28 }, () => ({ a: r.next() * Math.PI * 2, d: 0.5 + r.next() * 0.8, s: r.next() }));
  }, []);

  const auraOpacity = useDerivedValue(() => fx.aura.get());
  const rayTransform = useDerivedValue(() => [{ translateX: cx }, { translateY: cy }, { rotate: fx.rayAngle.get() }]);
  const rayOpacity = useDerivedValue(() => fx.rays.get() * 0.55);
  const burstRadius = useDerivedValue(() => reach * (0.35 + fx.burst.get() * 0.9));
  const burstOpacity = useDerivedValue(() => {
    const b = fx.burst.get();
    return b <= 0 || b >= 1 ? 0 : Math.sin(b * Math.PI) * 0.9;
  });
  const sparks = useDerivedValue(() => {
    const b = fx.burst.get();
    return particles.map((p) => vec(cx + Math.cos(p.a) * reach * p.d * (0.3 + b * 0.9), cy + Math.sin(p.a) * reach * p.d * (0.3 + b * 0.9) - b * 30 * p.s));
  });
  const sparkOpacity = useDerivedValue(() => {
    const b = fx.burst.get();
    return b <= 0 ? 0 : (1 - b) * 0.95;
  });
  const ribbonEnd = useDerivedValue(() => fx.ribbon.get());
  const ribbonOpacity = useDerivedValue(() => (fx.ribbon.get() > 0 ? 1 - fx.ribbonFade.get() : 0));

  return (
    <Canvas style={{ width, height, position: 'absolute' }} pointerEvents="none">
      <Group opacity={auraOpacity} blendMode="plus">
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient c={vec(cx, cy)} r={reach * 0.95} colors={[hexToRgba(color, 0.5), hexToRgba(color, 0.16), hexToRgba(color, 0)]} positions={[0, 0.45, 1]} />
        </Rect>
      </Group>
      {showRays ? (
        <Group transform={rayTransform} opacity={rayOpacity} blendMode="plus">
          <Path path={rays}>
            <RadialGradient c={vec(0, 0)} r={reach * 1.3} colors={[hexToRgba(color, 0.55), hexToRgba(color, 0.12), hexToRgba(color, 0)]} positions={[0, 0.4, 1]} />
          </Path>
        </Group>
      ) : null}
      <Group opacity={burstOpacity} blendMode="plus">
        <Circle cx={cx} cy={cy} r={burstRadius} style="stroke" strokeWidth={10} color={hexToRgba(color, 0.7)}>
          <BlurMask blur={14} style="normal" />
        </Circle>
      </Group>
      <Group opacity={sparkOpacity} blendMode="plus">
        <Points points={sparks} mode="points" color={hexToRgba(color, 0.95)} style="stroke" strokeWidth={3} strokeCap="round" />
      </Group>
      <Group opacity={ribbonOpacity} blendMode="plus">
        <Path path={ribbonPath} style="stroke" strokeWidth={7} color={hexToRgba(color, 0.55)} start={0} end={ribbonEnd}>
          <BlurMask blur={8} style="normal" />
        </Path>
        <Path path={ribbonPath} style="stroke" strokeWidth={1.6} color="rgba(255,244,214,0.95)" start={0} end={ribbonEnd} />
      </Group>
    </Canvas>
  );
}

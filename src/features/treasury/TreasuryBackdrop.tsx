import { Canvas, Group, LinearGradient, Oval, Path, Points, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { rng } from '@/graphics/skia/draw';

interface Mote {
  readonly x: number;
  readonly y: number;
  readonly speed: number;
  readonly sway: number;
  readonly phase: number;
}

export interface TreasuryBackdropProps {
  readonly width: number;
  readonly height: number;
  /** Center x and top y of the pedestal. */
  readonly pedestal: { readonly x: number; readonly y: number; readonly width: number };
  readonly time: SharedValue<number>;
  /** 0–1 darkening for cinematic moments. */
  readonly dim: SharedValue<number>;
  /** 0–1 spotlight intensity. */
  readonly light: SharedValue<number>;
}

/**
 * The Royal Treasury: a quiet stone chamber, a single shaft of warm light,
 * a gilded pedestal and dust drifting in the beam. Restrained by design —
 * the pack and cards provide the spectacle.
 */
export function TreasuryBackdrop({ width, height, pedestal, time, dim, light }: TreasuryBackdropProps) {
  const motes = useMemo<Mote[]>(() => {
    const r = rng(11);
    return Array.from({ length: 34 }, () => ({
      x: width * (0.3 + r.next() * 0.4),
      y: r.next() * height * 0.8,
      speed: 6 + r.next() * 14,
      sway: 4 + r.next() * 10,
      phase: r.next() * Math.PI * 2,
    }));
  }, [width, height]);

  const moteA = useDerivedValue(() => {
    const t = time.get();
    return motes.filter((_, i) => i % 2 === 0).map((m) => vec(m.x + Math.sin(t * 0.4 + m.phase) * m.sway, ((m.y - t * m.speed) % (height * 0.8) + height * 0.8) % (height * 0.8)));
  });
  const moteB = useDerivedValue(() => {
    const t = time.get();
    return motes.filter((_, i) => i % 2 === 1).map((m) => vec(m.x + Math.cos(t * 0.3 + m.phase) * m.sway, ((m.y - t * m.speed * 0.7) % (height * 0.8) + height * 0.8) % (height * 0.8)));
  });

  const cone = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    b.moveTo(width * 0.42, -10);
    b.lineTo(width * 0.58, -10);
    b.lineTo(pedestal.x + pedestal.width * 0.75, pedestal.y + 8);
    b.lineTo(pedestal.x - pedestal.width * 0.75, pedestal.y + 8);
    b.close();
    return b.build();
  }, [width, pedestal]);

  const arch = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const w = width * 0.72;
    const x0 = (width - w) / 2;
    const top = height * 0.08;
    b.moveTo(x0, height * 0.9);
    b.lineTo(x0, top + w / 2);
    b.arcToOval({ x: x0, y: top, width: w, height: w }, 180, 180, false);
    b.lineTo(x0 + w, height * 0.9);
    return b.build();
  }, [width, height]);

  const pedestalTop = { x: pedestal.x - pedestal.width / 2, y: pedestal.y - 10, width: pedestal.width, height: 20 };
  const beamOpacity = useDerivedValue(() => 0.75 * light.get());
  const moteOpacity = useDerivedValue(() => 0.9 * light.get());

  return (
    <Canvas style={{ width, height, position: 'absolute' }} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#0B0D13', '#121722', '#0D1017', '#060709']} positions={[0, 0.45, 0.75, 1]} />
      </Rect>
      {/* Carved arch and stone courses, barely visible. */}
      <Path path={arch} style="stroke" strokeWidth={1.2} color="rgba(198,164,106,0.10)" />
      {Array.from({ length: 9 }, (_, i) => (
        <Rect key={i} x={0} y={height * (0.12 + i * 0.085)} width={width} height={0.8} color="rgba(255,255,255,0.025)" />
      ))}
      {/* Shaft of light. */}
      <Group opacity={beamOpacity} blendMode="plus">
        <Path path={cone}>
          <LinearGradient start={vec(0, 0)} end={vec(0, pedestal.y)} colors={['rgba(255,226,170,0.20)', 'rgba(255,214,150,0.07)', 'rgba(255,214,150,0.02)']} />
        </Path>
        <Oval x={pedestal.x - pedestal.width} y={pedestal.y - 60} width={pedestal.width * 2} height={120}>
          <RadialGradient c={vec(pedestal.x, pedestal.y)} r={pedestal.width} colors={['rgba(255,214,150,0.22)', 'rgba(255,214,150,0)']} />
        </Oval>
      </Group>
      {/* Pedestal: a stone plinth with a gilded edge. */}
      <Rect x={pedestal.x - pedestal.width * 0.42} y={pedestal.y} width={pedestal.width * 0.84} height={height - pedestal.y}>
        <LinearGradient start={vec(0, pedestal.y)} end={vec(0, height)} colors={['#2A2723', '#16151A', '#0B0B0E']} />
      </Rect>
      <Rect x={pedestal.x - pedestal.width * 0.42} y={pedestal.y + 4} width={pedestal.width * 0.84} height={1.2} color="rgba(198,164,106,0.55)" />
      <Oval rect={pedestalTop}>
        <LinearGradient start={vec(0, pedestalTop.y)} end={vec(0, pedestalTop.y + 20)} colors={['#5B5245', '#2C2822']} />
      </Oval>
      <Oval rect={pedestalTop} style="stroke" strokeWidth={1} color="rgba(232,203,142,0.45)" />
      {/* Dust in the beam. */}
      <Group opacity={moteOpacity} blendMode="plus">
        <Points points={moteA} mode="points" color="rgba(255,226,170,0.55)" style="stroke" strokeWidth={2.2} strokeCap="round" />
        <Points points={moteB} mode="points" color="rgba(255,226,170,0.35)" style="stroke" strokeWidth={1.3} strokeCap="round" />
      </Group>
      {/* Vignette and cinematic dimming. */}
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient c={vec(width / 2, height * 0.45)} r={Math.max(width, height) * 0.75} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']} positions={[0, 0.5, 1]} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height} color="#000000" opacity={dim} />
    </Canvas>
  );
}

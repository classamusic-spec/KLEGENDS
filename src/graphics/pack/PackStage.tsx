import {
  Canvas,
  Group,
  Image as SkiaImage,
  ImageShader,
  Oval,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Shader,
  Skia,
  vec,
  Vertices,
  type SkImage,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import {
  bodyOutline,
  bodyTornEdge,
  makeTearProfile,
  PACK_H,
  PACK_W,
  SEAL_Y,
  stripIndices,
  stripMesh,
  stripTextureCoords,
  TEAR_COLUMNS,
  type TearPose,
} from './packGeometry';
import { getPackEffect } from './packShader';
import type { Opaque } from '../skia/opaque';

/** Card size inside the pack, in pack units. */
export const PACK_CARD_W = 206;
export const PACK_CARD_H = (PACK_CARD_W * 88) / 63;
/** Resting top of the card stack inside the pack (just under the seal). */
export const STACK_REST_Y = SEAL_Y - 7;

/** All animated inputs of the pack stage (UI-thread shared values). */
export interface PackMotion {
  /** 0 → 1 cinematic entrance. */
  readonly entrance: SharedValue<number>;
  readonly tiltX: SharedValue<number>;
  readonly tiltY: SharedValue<number>;
  readonly progress: SharedValue<number>;
  readonly side: SharedValue<number>;
  readonly curl: SharedValue<number>;
  readonly tension: SharedValue<number>;
  readonly fly: SharedValue<number>;
  /** Finger position in pack units and grip strength (0–1). */
  readonly grabX: SharedValue<number>;
  readonly grabY: SharedValue<number>;
  readonly grip: SharedValue<number>;
  /** Small displacement of the whole pack toward the finger (pack units). */
  readonly nudgeX: SharedValue<number>;
  readonly nudgeY: SharedValue<number>;
  /** 0 → 1 light escaping the opened seal. */
  readonly glow: SharedValue<number>;
  /** Card stack rise out of the pack, in pack units (0 = resting inside). */
  readonly rise: SharedValue<number>;
  /** 0 → 1 the emptied wrapper falling away. */
  readonly fall: SharedValue<number>;
  /** 0 → 1 the extracted stack travelling to the reveal position. */
  readonly handoff: SharedValue<number>;
  readonly time: SharedValue<number>;
}

export interface PackPlacement {
  /** Screen position of the pack's top-left corner and its scale (points per pack unit). */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface PackStageProps {
  readonly width: number;
  readonly height: number;
  readonly placement: PackPlacement;
  readonly motion: PackMotion;
  readonly packTexture: Opaque<SkImage>;
  readonly cardBack: Opaque<SkImage>;
  readonly profileSeed?: number;
  /** Cards currently in the stack (decreases as cards are revealed). */
  readonly stackCount: number;
  /** Where the stack's top card lands for the reveal (screen points). */
  readonly revealRect: { readonly x: number; readonly y: number; readonly width: number };
  /** False once the emptied wrapper has fallen away (it is then not drawn at all). */
  readonly showWrapper?: boolean;
}

/**
 * The Royal Treasury foil pack: a tactile wrapper that grips, stretches,
 * tears along its seal following the finger, casts the torn strip away and
 * releases the card stack. Purely presentational: gestures and the reveal
 * state machine live in the treasury feature.
 */
export function PackStage({ width, height, placement, motion, packTexture, cardBack, profileSeed = 7, stackCount, revealRect, showWrapper = true }: PackStageProps) {
  const effect = useMemo(() => getPackEffect(), []);
  const profile = useMemo(() => makeTearProfile(profileSeed), [profileSeed]);
  const textures = useMemo(() => stripTextureCoords(profile).map((p) => vec(p.x, p.y)), [profile]);
  const indices = useMemo(() => stripIndices(), []);
  const pack = packTexture.value;
  const back = cardBack.value;
  const texScale = pack.width() / PACK_W;
  const { x: px, y: py, scale } = placement;
  const m = motion;

  const pose = useDerivedValue<TearPose>(() => ({
    progress: m.progress.get(),
    side: m.side.get(),
    curl: m.curl.get(),
    tension: m.tension.get(),
    fly: m.fly.get(),
  }));

  // Whole-pack transform: entrance float, nudge toward the finger, wrapper fall.
  const packTransform = useDerivedValue(() => {
    const e = m.entrance.get();
    const f = m.fall.get();
    const rise = (1 - e) * 60;
    return [
      { translateX: px + m.nudgeX.get() * scale + f * 30 * scale },
      { translateY: py + rise + m.nudgeY.get() * scale + f * f * 520 * scale },
      { translateX: (PACK_W / 2) * scale },
      { translateY: (PACK_H / 2) * scale },
      { rotate: (1 - e) * -0.06 + m.tiltX.get() * 0.035 + m.nudgeX.get() * 0.0025 + f * 0.5 },
      { scale: scale * (0.94 + 0.06 * e) },
      { translateX: -PACK_W / 2 },
      { translateY: -PACK_H / 2 },
    ];
  });
  const packOpacity = useDerivedValue(() => Math.min(1, m.entrance.get() * 1.6) * (1 - Math.max(0, m.fall.get() - 0.55) / 0.45));

  const uniforms = useDerivedValue(() => ({
    texScale,
    packSize: [PACK_W, PACK_H],
    tilt: [m.tiltX.get(), m.tiltY.get()],
    grab: [m.grabX.get(), m.grabY.get(), m.grip.get()],
    time: m.time.get(),
    sheen: 1,
    curl: [0, 1, 0],
  }));
  // The strip shades itself darker where it bends away from the light.
  const stripUniforms = useDerivedValue(() => {
    const p = pose.get();
    const tip = Math.max(p.progress * PACK_W, p.tension * 10);
    return {
      texScale,
      packSize: [PACK_W, PACK_H],
      tilt: [m.tiltX.get(), m.tiltY.get()],
      grab: [m.grabX.get(), m.grabY.get(), m.grip.get()],
      time: m.time.get(),
      sheen: 1,
      curl: [p.side >= 0 ? tip : PACK_W - tip, p.side >= 0 ? 1 : -1, Math.max(p.curl, p.tension * 0.35)],
    };
  });

  const bodyClip = useDerivedValue(() => {
    const pts = bodyOutline(profile, pose.get());
    const b = Skia.PathBuilder.Make();
    b.moveTo(pts[0] ?? 0, pts[1] ?? 0);
    for (let i = 2; i < pts.length; i += 2) b.lineTo(pts[i] ?? 0, pts[i + 1] ?? 0);
    b.close();
    return b.build();
  });

  const bodyEdge = useDerivedValue(() => {
    const pts = bodyTornEdge(profile, pose.get());
    const b = Skia.PathBuilder.Make();
    if (pts.length >= 4) {
      b.moveTo(pts[0] ?? 0, pts[1] ?? 0);
      for (let i = 2; i < pts.length; i += 2) b.lineTo(pts[i] ?? 0, pts[i + 1] ?? 0);
    }
    return b.build();
  });

  const strip = useDerivedValue(() => stripMesh(profile, pose.get()));
  const stripVertices = useDerivedValue(() => strip.get().vertices.map((v) => vec(v.x, v.y)));
  const stripOpacity = useDerivedValue(() => 1 - Math.max(0, m.fly.get() - 0.35) / 0.65);

  // The strip's torn lower edge, only where it has separated from the body.
  const stripEdge = useDerivedValue(() => {
    const p = pose.get();
    const verts = strip.get().vertices;
    const tip = p.progress * PACK_W;
    const b = Skia.PathBuilder.Make();
    let started = false;
    for (let i = 0; i <= TEAR_COLUMNS; i++) {
      const x = (i / TEAR_COLUMNS) * PACK_W;
      const along = p.side >= 0 ? x : PACK_W - x;
      if (along > tip || tip <= 0) continue;
      const v = verts[i * 3 + 2];
      if (!v) continue;
      if (!started) {
        b.moveTo(v.x, v.y);
        started = true;
      } else b.lineTo(v.x, v.y);
    }
    return b.build();
  });

  const glowOpacity = useDerivedValue(() => m.glow.get());
  const cardX = (PACK_W - PACK_CARD_W) / 2;

  // The stack lives in screen space: it follows the pack while inside, rises
  // as it is drawn out, then travels to the reveal position (handoff).
  const targetScale = revealRect.width / PACK_CARD_W;
  const stackTransform = useDerivedValue(() => {
    const e = m.entrance.get();
    const h = m.handoff.get();
    const fromX = px + (m.nudgeX.get() + cardX) * scale;
    const fromY = py + (1 - e) * 60 + (m.nudgeY.get() + STACK_REST_Y - m.rise.get()) * scale;
    const fromS = scale * (0.94 + 0.06 * e);
    return [
      { translateX: fromX + (revealRect.x - fromX) * h },
      { translateY: fromY + (revealRect.y - fromY) * h },
      { scale: fromS + (targetScale - fromS) * h },
    ];
  });

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      {/* Card stack (drawn first so the wrapper hides it until it opens). */}
      <Group transform={stackTransform}>
        {Array.from({ length: stackCount }, (_, i) => {
          const depth = stackCount - 1 - i;
          return (
            <Group key={i} transform={[{ translateY: depth * 1.7 }, { translateX: depth * 0.5 }]}>
              <RoundedRect x={-0.8} y={-0.8} width={PACK_CARD_W + 1.6} height={PACK_CARD_H + 1.6} r={9.5} color="#3A2D18" />
              <SkiaImage image={back} x={0} y={0} width={PACK_CARD_W} height={PACK_CARD_H} fit="fill" />
            </Group>
          );
        })}
      </Group>
      {showWrapper ? (
        <Group transform={packTransform} opacity={packOpacity}>
          {/* Warm light escaping from inside the opened seal. */}
          <Group opacity={glowOpacity}>
            <Oval x={PACK_W * 0.12} y={SEAL_Y - 30} width={PACK_W * 0.76} height={60}>
              <RadialGradient c={vec(PACK_W / 2, SEAL_Y)} r={PACK_W * 0.42} colors={['rgba(255,226,160,0.75)', 'rgba(255,200,110,0.18)', 'rgba(255,200,110,0)']} />
            </Oval>
          </Group>

          {/* Wrapper body, open along the torn part of the seal. */}
          <Group clip={bodyClip}>
            <Rect x={0} y={0} width={PACK_W} height={PACK_H}>
              <Shader source={effect} uniforms={uniforms}>
                <ImageShader image={pack} tx="decal" ty="decal" />
              </Shader>
            </Rect>
          </Group>
          <Path path={bodyEdge} style="stroke" strokeWidth={2.2} color="rgba(0,0,0,0.45)" transform={[{ translateY: 1.2 }]} />
          <Path path={bodyEdge} style="stroke" strokeWidth={1.1} color="#EEE7D9" strokeJoin="round" />

          {/* The seal strip: a bending mesh that curls away and is cast off. */}
          <Group opacity={stripOpacity}>
            <Vertices vertices={stripVertices} textures={textures} indices={indices} mode="triangles">
              <Shader source={effect} uniforms={stripUniforms}>
                <ImageShader image={pack} tx="decal" ty="decal" />
              </Shader>
            </Vertices>
            <Path path={stripEdge} style="stroke" strokeWidth={1.1} color="#E6DFD2" strokeJoin="round" />
          </Group>

          {/* Light spilling over the torn edge. */}
          <Group opacity={glowOpacity} blendMode="plus">
            <Oval x={PACK_W * 0.2} y={SEAL_Y - 22} width={PACK_W * 0.6} height={30}>
              <RadialGradient c={vec(PACK_W / 2, SEAL_Y - 6)} r={PACK_W * 0.3} colors={['rgba(255,220,150,0.35)', 'rgba(255,220,150,0)']} />
            </Oval>
          </Group>
        </Group>
      ) : null}
    </Canvas>
  );
}

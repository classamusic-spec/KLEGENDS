import {
  BlurMask,
  Canvas,
  Group,
  ImageShader,
  processTransform3d,
  RoundedRect,
  Shader,
  type SkImage,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio, View } from 'react-native';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { BACK_FOIL, foilFor, getBackEffect, getCardEffect, type FoilParams } from './cardShader';
import { CARD_H, CARD_RADIUS, CARD_W } from './layout';
import { useCardBack, useCardTextures, type CardTextures } from './textures';
import { Opaque } from '../skia/opaque';
import { rarityMaterials } from '@/design/tokens';
import type { CardId } from '@/domain/cards';
import type { VisualQuality } from '@/state/settings';

/** Maximum tilt in radians at |tilt| = 1 (~21°). */
export const MAX_TILT = 0.37;
const THICKNESS = 2.6; // card units

interface Projection {
  readonly tiltX: SharedValue<number>;
  readonly tiltY: SharedValue<number>;
  readonly rotation: SharedValue<number>;
  readonly lift: SharedValue<number>;
  readonly centerX: number;
  readonly centerY: number;
  readonly perspective: number;
  readonly k: number;
}

/** 4×4 projection for one plane of the card at depth `z` (card units). */
const useCardMatrix = (p: Projection, z: number, mirrored: boolean) => {
  const { tiltX, tiltY, rotation, lift, centerX, centerY, perspective, k } = p;
  return useDerivedValue(() => {
    const s = k * lift.get();
    return processTransform3d([
      { translate: [centerX, centerY] },
      { perspective },
      { rotateX: -tiltY.get() * MAX_TILT },
      { rotateY: tiltX.get() * MAX_TILT + rotation.get() },
      { translateZ: z * s },
      { rotateY: mirrored ? Math.PI : 0 },
      { scale: s },
      { translate: [-CARD_W / 2, -CARD_H / 2] },
    ]);
  });
};

/** Plain-number foil uniforms (safe to capture in UI-thread worklets). */
const foilUniforms = (foil: FoilParams) => ({
  foilStrength: foil.foilStrength,
  artFoil: foil.artFoil,
  frameFoil: foil.frameFoil,
  glitter: foil.glitter,
  sheen: foil.sheen,
  pattern: foil.pattern,
  tint: [foil.tint[0], foil.tint[1], foil.tint[2]],
});

/** Uniforms for a face that is never drawn (no textures); shape-complete so no consumer sees an empty object. */
const EMPTY_UNIFORMS = {
  cardSize: [CARD_W, CARD_H],
  artArea: [0, 0, 1, 1],
  artWindow: [0, 0, 1, 1],
  artScale: 1,
  frameScale: 1,
  parallaxBack: [0, 0],
  parallaxFront: [0, 0],
  tilt: [0, 0],
  time: 0,
  foilStrength: 0,
  artFoil: 0,
  frameFoil: 0,
  glitter: 0,
  sheen: 0,
  pattern: 0,
  tint: [1, 1, 1],
  burst: [0, 0],
  glow: 0,
};

/** Texture resolution for a card shown `width` points wide on this device. */
export const textureScaleFor = (width: number): number =>
  Math.min(3, Math.max(1, (width * Math.min(PixelRatio.get(), 3)) / CARD_W));

export interface CardViewProps {
  /** Card to show; undefined shows the card back. */
  readonly cardId: CardId | undefined;
  /** Render as an undiscovered silhouette. */
  readonly undiscovered?: boolean;
  /** On-screen card width in points. */
  readonly width: number;
  /** −1…1 tilt around the vertical axis (left/right). */
  readonly tiltX: SharedValue<number>;
  /** −1…1 tilt around the horizontal axis (up/down). */
  readonly tiltY: SharedValue<number>;
  /** Extra rotation around the vertical axis in radians (π shows the back). */
  readonly rotation?: SharedValue<number>;
  readonly scale?: SharedValue<number>;
  /** 0…1 rarity glow during reveals. */
  readonly glow?: SharedValue<number>;
  readonly time?: SharedValue<number>;
  readonly quality: VisualQuality;
  /** Transparent margin around the card for rotation and shadow. */
  readonly padding?: number;
  readonly shadow?: boolean;
  readonly testID?: string;
}

/**
 * A physical collectible card rendered in one Skia canvas: perspective
 * tilt, flip, edge thickness, contact shadow and the holographic material
 * shader. Per-frame math runs on the UI thread.
 *
 * Textures are loaded inside the component (never passed as props) and the
 * canvas is keyed by texture identity, so image-bearing nodes remount
 * rather than update — see graphics/skia/opaque.ts for why.
 */
export function CardView(props: CardViewProps) {
  const { cardId, undiscovered = false, width, padding = 28, testID } = props;
  const textureScale = textureScaleFor(width);
  const textures = useCardTextures(cardId, textureScale, undiscovered);
  const back = useCardBack(textureScale);
  const canvasW = width + padding * 2;
  const canvasH = (CARD_H * width) / CARD_W + padding * 2;

  if (!back) return <View testID={testID} style={{ width: canvasW, height: canvasH }} />;
  const sceneKey = textures ? `${textures.cardId}|${textures.undiscovered ? 'u' : 'o'}|${textures.frameScale}` : 'back';
  return <CardScene key={sceneKey} {...props} padding={padding} textures={textures} back={new Opaque(back)} />;
}

interface CardSceneProps extends CardViewProps {
  readonly textures: CardTextures | null;
  readonly back: Opaque<SkImage>;
}

/** The mounted card canvas. Remounted (keyed) whenever its textures change. */
function CardScene({
  textures,
  back: backHandle,
  width,
  tiltX,
  tiltY,
  rotation,
  scale,
  glow,
  time,
  quality,
  padding = 28,
  shadow = true,
  testID,
}: CardSceneProps) {
  const back = backHandle.value;
  const effect = useMemo(() => getCardEffect(), []);
  const backEffect = useMemo(() => getBackEffect(), []);
  const zero = useSharedValue(0);
  const one = useSharedValue(1);
  const glowValue = glow ?? zero;
  const clock = time ?? zero;

  const k = width / CARD_W;
  const height = CARD_H * k;
  const canvasW = width + padding * 2;
  const canvasH = height + padding * 2;
  const projection: Projection = {
    tiltX,
    tiltY,
    rotation: rotation ?? zero,
    lift: scale ?? one,
    centerX: canvasW / 2,
    centerY: canvasH / 2,
    perspective: width * 3.4,
    k,
  };

  const frontMatrix = useCardMatrix(projection, THICKNESS / 2, false);
  const backMatrix = useCardMatrix(projection, -THICKNESS / 2, true);
  const slice1 = useCardMatrix(projection, THICKNESS / 4, false);
  const slice2 = useCardMatrix(projection, 0, false);
  const slice3 = useCardMatrix(projection, -THICKNESS / 4, false);
  const slices = quality === 'performance' ? [slice2] : [slice1, slice2, slice3];

  const { rotation: rot, lift } = projection;
  const facing = useDerivedValue(() => Math.cos(-tiltY.get() * MAX_TILT) * Math.cos(tiltX.get() * MAX_TILT + rot.get()));
  const frontOpacity = useDerivedValue(() => (facing.get() >= 0 ? 1 : 0));
  const backOpacity = useDerivedValue(() => (facing.get() < 0 ? 1 : 0));

  const shadowTransform = useDerivedValue(() => [
    { translateX: tiltX.get() * 10 * k },
    { translateY: (12 + Math.abs(tiltY.get()) * 4) * k * lift.get() },
  ]);
  const shadowOpacity = useDerivedValue(() => 0.5 - Math.min(0.25, Math.max(0, lift.get() - 1) * 0.6));

  // Everything captured by the uniform worklets below is a plain number or array.
  const parallax = quality === 'performance' ? 0.4 : 1;
  const face = useMemo(
    () =>
      textures
        ? {
            foil: foilUniforms(foilFor(textures.rarity, quality, textures.undiscovered)),
            artArea: [textures.art.area.x, textures.art.area.y, textures.art.area.width, textures.art.area.height],
            artWindow: [textures.layout.art.x, textures.layout.art.y, textures.layout.art.width, textures.layout.art.height],
            artScale: textures.art.scale,
            frameScale: textures.frameScale,
          }
        : null,
    [textures, quality],
  );
  const faceUniforms = useDerivedValue(() => {
    if (!face) return EMPTY_UNIFORMS;
    return {
      cardSize: [CARD_W, CARD_H],
      artArea: face.artArea,
      artWindow: face.artWindow,
      artScale: face.artScale,
      frameScale: face.frameScale,
      parallaxBack: [tiltX.get() * 9 * parallax, -tiltY.get() * 9 * parallax],
      parallaxFront: [tiltX.get() * 3.5 * parallax, -tiltY.get() * 3.5 * parallax],
      tilt: [tiltX.get(), tiltY.get()],
      time: clock.get(),
      ...face.foil,
      burst: [236, 182],
      glow: glowValue.get(),
    };
  });

  const backScale = back.width() / CARD_W;
  const backFoil = useMemo(
    () => ({
      foilStrength: quality === 'performance' ? BACK_FOIL.foilStrength * 0.6 : BACK_FOIL.foilStrength,
      glitter: quality === 'performance' ? 0 : BACK_FOIL.glitter,
      sheen: BACK_FOIL.sheen,
      tint: [BACK_FOIL.tint[0], BACK_FOIL.tint[1], BACK_FOIL.tint[2]],
    }),
    [quality],
  );
  const backUniforms = useDerivedValue(() => ({
    cardSize: [CARD_W, CARD_H],
    texScale: backScale,
    tilt: [-tiltX.get(), tiltY.get()],
    time: clock.get(),
    ...backFoil,
    glow: glowValue.get(),
  }));
  // While face textures bake (or when no card is given), the back artwork
  // stands in for the front; that placement has its own uniforms value.
  const placeholderUniforms = useDerivedValue(() => ({
    cardSize: [CARD_W, CARD_H],
    texScale: backScale,
    tilt: [tiltX.get(), tiltY.get()],
    time: clock.get(),
    ...backFoil,
    glow: glowValue.get(),
  }));

  const edgeColor = textures && !textures.undiscovered ? rarityMaterials[textures.rarity].metal[1] : '#5A4A2E';
  return (
    <Canvas testID={testID} style={{ width: canvasW, height: canvasH }}>
      {shadow ? (
        <Group transform={shadowTransform} opacity={shadowOpacity}>
          <RoundedRect x={padding + width * 0.06} y={padding + height * 0.05} width={width * 0.88} height={height * 0.92} r={CARD_RADIUS * k} color="#000000">
            <BlurMask blur={16 * k} style="normal" />
          </RoundedRect>
        </Group>
      ) : null}

      <Group opacity={backOpacity}>
        {[...slices].reverse().map((m, i) => (
          <Group key={`back-slice-${i}`} matrix={m}>
            <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CARD_RADIUS} color={edgeColor} />
          </Group>
        ))}
        <Group matrix={backMatrix}>
          <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CARD_RADIUS}>
            <Shader source={backEffect} uniforms={backUniforms}>
              <ImageShader image={back} tx="decal" ty="decal" />
            </Shader>
          </RoundedRect>
        </Group>
      </Group>

      <Group opacity={frontOpacity}>
        {slices.map((m, i) => (
          <Group key={`front-slice-${i}`} matrix={m}>
            <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CARD_RADIUS} color={edgeColor} />
          </Group>
        ))}
        <Group matrix={frontMatrix}>
          {textures ? (
            <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CARD_RADIUS}>
              <Shader source={effect} uniforms={faceUniforms}>
                <ImageShader image={textures.art.back} tx="decal" ty="decal" />
                <ImageShader image={textures.art.front} tx="decal" ty="decal" />
                <ImageShader image={textures.frame} tx="decal" ty="decal" />
              </Shader>
            </RoundedRect>
          ) : (
            <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CARD_RADIUS}>
              <Shader source={backEffect} uniforms={placeholderUniforms}>
                <ImageShader image={back} tx="decal" ty="decal" />
              </Shader>
            </RoundedRect>
          )}
        </Group>
      </Group>
    </Canvas>
  );
}

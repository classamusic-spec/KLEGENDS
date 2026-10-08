import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

import type { VisualQuality } from '@/state/settings';
import type { Rarity } from '@/domain/rarity';

/**
 * Holographic card material (SkSL). One draw per card composites:
 *   1. parallax art layers (back, front) sampled with tilt-dependent offsets,
 *   2. the frame layer,
 *   3. a rarity-specific foil (rainbow iridescence × pattern × view band),
 *   4. tilt-reactive glitter, a moving specular glare and directional shade.
 * All coordinates are card units (300 × 419); textures are sampled in pixels.
 */
const SOURCE = `
uniform shader backTex;
uniform shader frontTex;
uniform shader frameTex;

uniform float2 cardSize;
uniform float4 artArea;
uniform float4 artWindow;
uniform float artScale;
uniform float frameScale;
uniform float2 parallaxBack;
uniform float2 parallaxFront;
uniform float2 tilt;
uniform float time;
uniform float foilStrength;
uniform float artFoil;
uniform float frameFoil;
uniform float glitter;
uniform float sheen;
uniform float pattern;
uniform float3 tint;
uniform float2 burst;
uniform float glow;

float hash(float2 q) {
  q = fract(q * float2(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

half4 main(float2 p) {
  float2 a = p - artArea.xy;
  float4 back = float4(backTex.eval((a + parallaxBack) * artScale));
  float4 front = float4(frontTex.eval((a + parallaxFront) * artScale));
  float4 col = front + back * (1.0 - front.a);
  float4 frame = float4(frameTex.eval(p * frameScale));
  col = frame + col * (1.0 - frame.a);

  float2 uv = p / cardSize;
  float inArt = step(artWindow.x, p.x) * step(p.x, artWindow.x + artWindow.z)
              * step(artWindow.y, p.y) * step(p.y, artWindow.y + artWindow.w);
  float artVisible = inArt * (1.0 - frame.a);
  float weight = foilStrength * mix(frameFoil * frame.a, artFoil, artVisible);

  float view = (uv.x - 0.5) * 1.15 + (uv.y - 0.5) * 0.75 + tilt.x * 1.7 - tilt.y * 1.2;
  float3 spectrum = 0.5 + 0.5 * cos(6.28318 * (view * 1.25 + float3(0.0, 0.33, 0.67)));
  float3 rainbow = mix(tint, spectrum, 0.55);
  float band = exp(-pow((fract(view * 0.5 + 0.5) - 0.5) * 4.2, 2.0));

  float pat = 1.0;
  if (pattern > 0.5 && pattern < 1.5) {
    pat = 0.5 + 0.5 * sin((uv.x * 0.9 + uv.y * 1.3) * 240.0 + tilt.x * 6.0);
  } else if (pattern > 1.5 && pattern < 2.5) {
    pat = 0.62 + 0.38 * sin(uv.x * 9.0 + tilt.x * 2.4) * sin(uv.y * 7.0 - tilt.y * 2.4 + 1.3);
  } else if (pattern > 2.5) {
    float2 d = p - burst;
    float ang = atan(d.y, d.x);
    pat = 0.35 + 0.65 * pow(clamp(0.5 + 0.5 * cos(ang * 26.0 + tilt.x * 5.0 - tilt.y * 3.0), 0.0, 1.0), 3.0);
  }

  float lum = dot(col.rgb, float3(0.299, 0.587, 0.114));
  float3 holo = rainbow * (pat * band * weight) * (0.12 + 0.88 * lum) * 0.85;
  col.rgb += holo * col.a;

  float2 cell = floor(p / 2.4);
  float h = hash(cell);
  float2 f = fract(p / 2.4) - 0.5;
  float tw = clamp(0.5 + 0.5 * sin(h * 60.0 + tilt.x * 11.0 + tilt.y * 9.0 + time * 2.0), 0.0, 1.0);
  float spark = smoothstep(0.975, 1.0, h) * pow(tw, 12.0) * (1.0 - smoothstep(0.0, 0.4, length(f)));
  col.rgb += float3(spark * glitter * max(weight, 0.15) * (0.25 + lum) * 2.2) * col.a;

  float2 lightPos = float2(0.5 - tilt.x * 0.6, 0.3 + tilt.y * 0.6);
  float2 q = (uv - lightPos) * float2(1.0, cardSize.y / cardSize.x);
  float spec = exp(-dot(q, q) * 6.0);
  col.rgb += float3(spec * sheen * 0.24) * col.a;

  float shade = 1.0 - 0.1 * clamp((uv.x - 0.5) * tilt.x * 2.0 + (0.5 - uv.y) * tilt.y * 2.0, -1.0, 1.0);
  col.rgb *= shade;
  col.rgb += tint * (glow * 0.22) * col.a;
  return half4(col);
}
`;

/**
 * Single-texture foil material for card backs (and any one-layer surface):
 * gold foil on bright engraving, glitter, specular glare and shading.
 */
const BACK_SOURCE = `
uniform shader tex;
uniform float2 cardSize;
uniform float texScale;
uniform float2 tilt;
uniform float time;
uniform float foilStrength;
uniform float glitter;
uniform float sheen;
uniform float3 tint;
uniform float glow;

float hash(float2 q) {
  q = fract(q * float2(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

half4 main(float2 p) {
  float4 col = float4(tex.eval(p * texScale));
  float2 uv = p / cardSize;
  float view = (uv.x - 0.5) * 1.15 + (uv.y - 0.5) * 0.75 + tilt.x * 1.7 - tilt.y * 1.2;
  float3 rainbow = 0.55 + 0.45 * cos(6.28318 * (view * 1.25 + float3(0.0, 0.33, 0.67)));
  float band = exp(-pow((fract(view * 0.55 + 0.5) - 0.5) * 3.0, 2.0));
  float lum = dot(col.rgb, float3(0.299, 0.587, 0.114));
  float metal = smoothstep(0.35, 0.75, lum);
  col.rgb += rainbow * tint * (band * foilStrength * metal * 0.8) * col.a;

  float2 cell = floor(p / 2.4);
  float h = hash(cell);
  float2 f = fract(p / 2.4) - 0.5;
  float tw = clamp(0.5 + 0.5 * sin(h * 60.0 + tilt.x * 11.0 + tilt.y * 9.0 + time * 2.0), 0.0, 1.0);
  float spark = smoothstep(0.97, 1.0, h) * pow(tw, 12.0) * (1.0 - smoothstep(0.0, 0.4, length(f)));
  col.rgb += float3(spark * glitter * metal * 2.0) * col.a;

  float2 lightPos = float2(0.5 - tilt.x * 0.6, 0.3 + tilt.y * 0.6);
  float2 q = (uv - lightPos) * float2(1.0, cardSize.y / cardSize.x);
  col.rgb += float3(exp(-dot(q, q) * 6.0) * sheen * 0.22) * col.a;
  float shade = 1.0 - 0.1 * clamp((uv.x - 0.5) * tilt.x * 2.0 + (0.5 - uv.y) * tilt.y * 2.0, -1.0, 1.0);
  col.rgb *= shade;
  col.rgb += tint * (glow * 0.22) * col.a;
  return half4(col);
}
`;

let effect: SkRuntimeEffect | null = null;
let backEffect: SkRuntimeEffect | null = null;

export const getBackEffect = (): SkRuntimeEffect => {
  if (!backEffect) {
    backEffect = Skia.RuntimeEffect.Make(BACK_SOURCE);
    if (!backEffect) throw new Error('Card back shader failed to compile');
  }
  return backEffect;
};

/** Compiled lazily on first use (never at module scope — see index.web.ts). */
export const getCardEffect = (): SkRuntimeEffect => {
  if (!effect) {
    effect = Skia.RuntimeEffect.Make(SOURCE);
    if (!effect) throw new Error('Card material shader failed to compile');
  }
  return effect;
};

export interface FoilParams {
  readonly foilStrength: number;
  readonly artFoil: number;
  readonly frameFoil: number;
  readonly glitter: number;
  readonly sheen: number;
  readonly pattern: number;
  readonly tint: readonly [number, number, number];
}

const FOIL: Readonly<Record<Rarity, FoilParams>> = {
  common: { foilStrength: 0, artFoil: 0, frameFoil: 0, glitter: 0, sheen: 0.55, pattern: 0, tint: [1, 0.9, 0.75] },
  rare: { foilStrength: 0.9, artFoil: 0, frameFoil: 1, glitter: 0.3, sheen: 0.65, pattern: 1, tint: [0.72, 0.86, 1] },
  epic: { foilStrength: 1, artFoil: 0.22, frameFoil: 0.9, glitter: 0.6, sheen: 0.7, pattern: 2, tint: [0.88, 0.72, 1] },
  legendary: { foilStrength: 1, artFoil: 0.38, frameFoil: 0.9, glitter: 0.9, sheen: 0.75, pattern: 3, tint: [1, 0.86, 0.55] },
};

/** Card backs share the gold-on-sapphire treatment regardless of rarity. */
export const BACK_FOIL = { foilStrength: 0.8, glitter: 0.45, sheen: 0.7, tint: [1, 0.9, 0.7] as const } as const;

/** Foil settings for a rarity, reduced in lower visual quality modes. */
export const foilFor = (rarity: Rarity, quality: VisualQuality, undiscovered = false): FoilParams => {
  if (undiscovered) return { ...FOIL.common, sheen: 0.25 };
  const base = FOIL[rarity];
  if (quality === 'performance') return { ...base, glitter: 0, foilStrength: base.foilStrength * 0.55, pattern: Math.min(base.pattern, 1) };
  if (quality === 'cinematic') return { ...base, glitter: Math.min(1, base.glitter * 1.15), sheen: base.sheen * 1.1 };
  return base;
};

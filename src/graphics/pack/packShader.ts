import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

/**
 * Metallic wrapper material (SkSL). Samples the baked wrapper art and adds:
 * an anisotropic specular streak that slides with tilt, crinkle variation
 * from value noise so the foil never looks like flat plastic, and a
 * stretched, crackling highlight under the player's finger while gripping.
 * Coordinates are pack units; `tex` is sampled in pixels.
 */
const SOURCE = `
uniform shader tex;
uniform float texScale;
uniform float2 packSize;
uniform float2 tilt;
uniform float3 grab;
uniform float time;
uniform float sheen;
// Strip bend: x = tear tip (pack units), y = side (+1 from left / -1 from right), z = curl amount.
uniform float3 curl;

float hash(float2 q) {
  q = fract(q * float2(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

half4 main(float2 p) {
  float4 col = float4(tex.eval(p * texScale));
  if (col.a < 0.002) return half4(0.0);
  float2 uv = p / packSize;
  float n = noise(p * 0.085) * 0.6 + noise(p * 0.21 + 3.1) * 0.4;
  float bandX = 0.5 - tilt.x * 0.75 + (n - 0.5) * 0.14;
  float streak = exp(-pow((uv.x - bandX) * 5.0, 2.0)) * (0.55 + 0.45 * n);
  float streak2 = exp(-pow((uv.x - bandX + 0.36) * 9.0, 2.0)) * 0.4;
  float vertical = 0.82 + 0.18 * cos((uv.y - 0.35 + tilt.y * 0.4) * 3.0);
  float spec = (streak + streak2) * vertical * sheen;
  float2 g = (p - grab.xy) / float2(64.0, 30.0);
  float stress = exp(-dot(g, g) * 1.3) * grab.z * (0.5 + 0.5 * noise(p * 0.34 + time * 3.0));
  float3 light = float3(1.0, 0.96, 0.88);
  col.rgb += light * (spec * 0.3 + stress * 0.5) * col.a;
  float d = (curl.x - p.x) * curl.y;
  if (curl.z > 0.0 && d > 0.0) {
    float bend = smoothstep(0.0, 90.0, d) * curl.z;
    col.rgb *= 1.0 - 0.35 * bend;
    col.rgb += float3(0.55, 0.6, 0.7) * (0.12 * bend) * col.a;
  }
  return half4(col);
}
`;

let effect: SkRuntimeEffect | null = null;

export const getPackEffect = (): SkRuntimeEffect => {
  if (!effect) {
    effect = Skia.RuntimeEffect.Make(SOURCE);
    if (!effect) throw new Error('Pack material shader failed to compile');
  }
  return effect;
};

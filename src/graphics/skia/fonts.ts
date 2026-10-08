import { Skia, type SkTypeface, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';

import { fontAssets } from '@/design/fonts';

/** Font families registered with Skia for baked card typography. */
export const SKIA_FAMILY = {
  display: 'KL Display', // Cinzel SemiBold
  displayBold: 'KL Display Bold', // Cinzel Bold
  ui: 'KL UI', // Manrope SemiBold
  uiBold: 'KL UI Bold', // Manrope Bold
  scripture: 'KL Scripture', // Cormorant Garamond Medium
} as const;

const SOURCES: Readonly<Record<keyof typeof SKIA_FAMILY, number>> = {
  display: fontAssets.Cinzel_600SemiBold,
  displayBold: fontAssets.Cinzel_700Bold,
  ui: fontAssets.Manrope_600SemiBold,
  uiBold: fontAssets.Manrope_700Bold,
  scripture: fontAssets.CormorantGaramond_500Medium,
};

export interface SkiaFonts {
  readonly provider: SkTypefaceFontProvider;
  readonly typefaces: Readonly<Record<keyof typeof SKIA_FAMILY, SkTypeface>>;
}

const loadTypeface = async (source: number): Promise<SkTypeface> => {
  const asset = Asset.fromModule(source);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const data = await Skia.Data.fromURI(uri);
  const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
  if (!typeface) throw new Error(`Could not decode font ${uri}`);
  return typeface;
};

let pending: Promise<SkiaFonts> | null = null;

/** Loads the brand fonts into Skia once; subsequent calls share the result. */
export const loadSkiaFonts = (): Promise<SkiaFonts> => {
  pending ??= (async () => {
    const keys = Object.keys(SOURCES) as (keyof typeof SKIA_FAMILY)[];
    const loaded = await Promise.all(keys.map((key) => loadTypeface(SOURCES[key])));
    const provider = Skia.TypefaceFontProvider.Make();
    const typefaces = {} as Record<keyof typeof SKIA_FAMILY, SkTypeface>;
    keys.forEach((key, i) => {
      const typeface = loaded[i];
      if (!typeface) return;
      typefaces[key] = typeface;
      provider.registerFont(typeface, SKIA_FAMILY[key]);
    });
    return { provider, typefaces };
  })().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
};

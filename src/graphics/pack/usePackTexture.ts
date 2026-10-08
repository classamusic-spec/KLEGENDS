import type { SkImage } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';

import { loadPackTexture } from './packTexture';
import { Opaque } from '../skia/opaque';
import type { PackVisualTheme } from '@/domain/packs';

/** The baked wrapper texture as an opaque handle (null while baking). */
export const usePackTexture = (theme: PackVisualTheme, scale: number): Opaque<SkImage> | null => {
  const [loaded, setLoaded] = useState<{ key: string; handle: Opaque<SkImage> } | null>(null);
  const key = `${theme.id}|${scale}`;
  useEffect(() => {
    let alive = true;
    loadPackTexture(theme, scale)
      .then((image) => alive && setLoaded({ key, handle: new Opaque(image) }))
      .catch((error: unknown) => console.warn('[pack] texture bake failed', error));
    return () => {
      alive = false;
    };
  }, [theme, scale, key]);
  return loaded?.key === key ? loaded.handle : null;
};

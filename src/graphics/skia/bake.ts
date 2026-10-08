import { Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';

/**
 * Renders procedural drawing into an image on a CPU raster surface.
 * Raster surfaces work identically on iOS, Android and web (where GPU
 * offscreen surfaces would each consume one of the browser's limited WebGL
 * contexts). Baked images are uploaded to the GPU once when first drawn.
 */
export const bakeImage = (width: number, height: number, draw: (canvas: SkCanvas) => void): SkImage => {
  const w = Math.max(1, Math.ceil(width));
  const h = Math.max(1, Math.ceil(height));
  const surface = Skia.Surface.Make(w, h);
  if (!surface) throw new Error(`Could not allocate a ${w}×${h} surface`);
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));
  draw(canvas);
  surface.flush();
  const image = surface.makeImageSnapshot();
  surface.dispose?.();
  return image;
};

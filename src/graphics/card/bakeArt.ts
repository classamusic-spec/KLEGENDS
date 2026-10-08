import type { SkImage, SkRect } from '@shopify/react-native-skia';

import { artBleedRect, type CardLayout } from './layout';
import { SILHOUETTE_STYLE, type ArtScene, type SceneMode } from '../art/scene';
import { bakeImage } from '../skia/bake';
import { linear, makePaint, radial, rng, withAlpha } from '../skia/draw';

export interface ArtLayers {
  /** Opaque background layer covering `area`. */
  readonly back: SkImage;
  /** Transparent foreground (subjects) layer covering `area`. */
  readonly front: SkImage;
  /** Card-unit rect the layers cover (art window plus bleed). */
  readonly area: SkRect;
  /** Texture pixels per card unit. */
  readonly scale: number;
}

/** Cold, quiet backdrop for undiscovered cards. */
const undiscoveredBackdrop = (canvas: Parameters<ArtScene['back']>[0]['canvas'], area: SkRect) => {
  canvas.drawRect(area, makePaint({ shader: linear([0, area.y], [0, area.y + area.height], ['#161A22', '#0B0D12', '#07080B']) }));
  const c = [area.x + area.width / 2, area.y + area.height * 0.42] as const;
  canvas.drawCircle(c[0], c[1], area.width * 0.6, makePaint({ shader: radial(c, area.width * 0.6, [withAlpha('#5A6478', 0.28), withAlpha('#5A6478', 0)]) }));
  canvas.drawRect(area, makePaint({ shader: linear([0, area.y], [0, area.y + area.height], [withAlpha(SILHOUETTE_STYLE.fill, 0), withAlpha(SILHOUETTE_STYLE.fill, 0.5)]) }));
};

/** Bakes a scene's depth layers for one card layout at `scale` pixels per card unit. */
export const bakeArtLayers = (scene: ArtScene, layout: CardLayout, scale: number, mode: SceneMode = 'full'): ArtLayers => {
  const area = artBleedRect(layout);
  const draw = (layer: 'back' | 'front') =>
    bakeImage(area.width * scale, area.height * scale, (canvas) => {
      canvas.scale(scale, scale);
      canvas.translate(-area.x, -area.y);
      const ctx = { canvas, area, rand: rng(scene.seed + (layer === 'front' ? 101 : 0)), mode };
      if (layer === 'back') {
        if (mode === 'silhouette') undiscoveredBackdrop(canvas, area);
        else scene.back(ctx);
      } else {
        scene.front(ctx);
      }
    });
  return { back: draw('back'), front: draw('front'), area, scale };
};

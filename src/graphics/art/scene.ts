import type { SkCanvas, SkPaint, SkPath, SkRect } from '@shopify/react-native-skia';

import { drawLitFigure, type LightingOptions } from './figures';
import { makePaint, type Rng } from '../skia/draw';

export type SceneMode = 'full' | 'silhouette';

export interface SceneContext {
  readonly canvas: SkCanvas;
  /** Region (card units) the layer must cover, including parallax bleed. */
  readonly area: SkRect;
  readonly rand: Rng;
  readonly mode: SceneMode;
}

/**
 * A procedural illustration split into depth layers for parallax:
 * `back` must be opaque over the area; `front` is drawn on transparency.
 */
export interface ArtScene {
  readonly key: string;
  readonly seed: number;
  /** Dominant light color, used by reveal glows and foil tinting. */
  readonly light: string;
  back(ctx: SceneContext): void;
  front(ctx: SceneContext): void;
}

/** Undiscovered cards show subjects as dim, cold silhouettes. */
export const SILHOUETTE_STYLE = { fill: '#07080B', edge: '#4A4F5C' } as const;

/** Draws a subject respecting the scene mode (lit figure or undiscovered silhouette). */
export const drawSubject = (ctx: SceneContext, path: SkPath, lighting: LightingOptions) => {
  if (ctx.mode === 'silhouette') {
    ctx.canvas.drawPath(path, makePaint({ color: SILHOUETTE_STYLE.edge, stroke: 1.2, alpha: 0.7 }));
    ctx.canvas.drawPath(path, makePaint({ color: SILHOUETTE_STYLE.fill }));
    return;
  }
  drawLitFigure(ctx.canvas, path, lighting);
};

/** Draws a foreground prop (rock, ground) that turns to shadow on undiscovered cards. */
export const drawProp = (ctx: SceneContext, path: SkPath, paint: SkPaint) => {
  ctx.canvas.drawPath(path, ctx.mode === 'silhouette' ? makePaint({ color: SILHOUETTE_STYLE.fill }) : paint);
};

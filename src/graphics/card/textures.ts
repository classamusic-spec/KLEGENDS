import { ClipOp, ImageFormat, Skia, type SkImage, type SkRect } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';

import { bakeArtLayers, type ArtLayers } from './bakeArt';
import { bakeCardBack } from './cardBack';
import { bakeFrame } from './frame';
import { CARD_H, CARD_RADIUS, CARD_W, layoutFor, type CardLayout } from './layout';
import { sceneFor } from '../art/registry';
import { bakeImage } from '../skia/bake';
import { loadSkiaFonts } from '../skia/fonts';
import { catalog } from '@/content';
import type { CardId } from '@/domain/cards';
import type { Rarity } from '@/domain/rarity';

interface CardTextureData {
  readonly cardId: CardId;
  readonly rarity: Rarity;
  readonly layout: CardLayout;
  readonly art: ArtLayers;
  readonly frame: SkImage;
  /** Frame texture pixels per card unit. */
  readonly frameScale: number;
  readonly undiscovered: boolean;
  /** Dominant light color of the illustration (reveal glows). */
  readonly light: string;
}

/**
 * Baked textures for one card. An opaque class (private storage) so it can
 * flow through React state safely — see graphics/skia/opaque.ts.
 */
export class CardTextures {
  readonly #data: CardTextureData;

  constructor(data: CardTextureData) {
    this.#data = data;
  }

  get cardId() {
    return this.#data.cardId;
  }
  get rarity() {
    return this.#data.rarity;
  }
  get layout() {
    return this.#data.layout;
  }
  get art() {
    return this.#data.art;
  }
  get frame() {
    return this.#data.frame;
  }
  get frameScale() {
    return this.#data.frameScale;
  }
  get undiscovered() {
    return this.#data.undiscovered;
  }
  get light() {
    return this.#data.light;
  }
}

/** Lets the UI thread render a frame between heavy bake steps. */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const MAX_HERO_ENTRIES = 8;
const heroCache = new Map<string, CardTextures>();
const pendingHero = new Map<string, Promise<CardTextures>>();

/** Rounds scales so nearby requests share one bake. */
export const quantizeScale = (scale: number): number => Math.min(3, Math.max(0.5, Math.round(scale * 4) / 4));

const heroKeyOf = (cardId: CardId, scale: number, undiscovered: boolean) =>
  `${cardId}|${quantizeScale(scale)}|${undiscovered ? 'u' : 'o'}`;

export const loadCardTextures = (cardId: CardId, scale: number, undiscovered = false): Promise<CardTextures> => {
  const q = quantizeScale(scale);
  const key = heroKeyOf(cardId, scale, undiscovered);
  const cached = heroCache.get(key);
  if (cached) {
    heroCache.delete(key);
    heroCache.set(key, cached); // LRU touch
    return Promise.resolve(cached);
  }
  const inflight = pendingHero.get(key);
  if (inflight) return inflight;

  const work = (async () => {
    const card = catalog.card(cardId);
    if (!card) throw new Error(`Unknown card ${cardId}`);
    const fonts = await loadSkiaFonts();
    const layout = undiscovered ? layoutFor('common') : layoutFor(card.rarity);
    const scene = sceneFor(card.artKey);
    await yieldToUi();
    const art = bakeArtLayers(scene, layout, q, undiscovered ? 'silhouette' : 'full');
    await yieldToUi();
    const frame = bakeFrame({ card, layout, fonts, undiscovered }, q);
    const textures = new CardTextures({ cardId, rarity: card.rarity, layout, art, frame, frameScale: q, undiscovered, light: scene.light });
    heroCache.set(key, textures);
    while (heroCache.size > MAX_HERO_ENTRIES) {
      const oldest = heroCache.keys().next().value;
      if (oldest === undefined) break;
      heroCache.delete(oldest);
    }
    return textures;
  })().finally(() => pendingHero.delete(key));
  pendingHero.set(key, work);
  return work;
};

/**
 * Bakes several cards one after another (in the given order) so they are
 * ready before they are shown — e.g. every card of a pack while the pack
 * is being opened. Failures are logged, never thrown.
 */
export const prefetchCardTextures = async (cardIds: readonly CardId[], scale: number): Promise<void> => {
  for (const cardId of cardIds) {
    try {
      await loadCardTextures(cardId, scale);
    } catch (error) {
      console.warn('[textures] prefetch failed', cardId, error);
    }
  }
};

/** True when a card's textures are already baked at this scale. */
export const hasCardTextures = (cardId: CardId, scale: number, undiscovered = false): boolean =>
  heroCache.has(heroKeyOf(cardId, scale, undiscovered));

const backCache = new Map<number, Promise<SkImage>>();

export const loadCardBack = (scale: number): Promise<SkImage> => {
  const q = quantizeScale(scale);
  let pending = backCache.get(q);
  if (!pending) {
    pending = loadSkiaFonts().then(async (fonts) => {
      await yieldToUi();
      return bakeCardBack(fonts, q);
    });
    backCache.set(q, pending);
  }
  return pending;
};

const thumbCache = new Map<string, Promise<string>>();

/**
 * A flattened, static card image as a PNG data URI for grids and lists.
 * Grids use plain <Image> components, so dozens of cards cost no GPU canvases.
 */
export const loadCardThumbnail = (cardId: CardId, widthPx: number, undiscovered: boolean): Promise<string> => {
  const scale = Math.max(0.25, Math.round((widthPx / CARD_W) * 8) / 8);
  const key = `${cardId}|${scale}|${undiscovered ? 'u' : 'o'}`;
  let pending = thumbCache.get(key);
  if (!pending) {
    pending = (async () => {
      const card = catalog.card(cardId);
      if (!card) throw new Error(`Unknown card ${cardId}`);
      const fonts = await loadSkiaFonts();
      const layout = undiscovered ? layoutFor('common') : layoutFor(card.rarity);
      await yieldToUi();
      const art = bakeArtLayers(sceneFor(card.artKey), layout, scale, undiscovered ? 'silhouette' : 'full');
      const frame = bakeFrame({ card, layout, fonts, undiscovered }, scale);
      const flat = bakeImage(CARD_W * scale, CARD_H * scale, (canvas) => {
        canvas.save();
        canvas.clipRRect({ rect: { x: 0, y: 0, width: CARD_W * scale, height: CARD_H * scale }, rx: CARD_RADIUS * scale, ry: CARD_RADIUS * scale }, ClipOp.Intersect, true);
        const dst = { x: art.area.x * scale, y: art.area.y * scale, width: art.area.width * scale, height: art.area.height * scale };
        const src = (img: SkImage) => ({ x: 0, y: 0, width: img.width(), height: img.height() });
        canvas.drawImageRect(art.back, src(art.back), dst, paintless());
        canvas.drawImageRect(art.front, src(art.front), dst, paintless());
        canvas.drawImageRect(frame, src(frame), { x: 0, y: 0, width: CARD_W * scale, height: CARD_H * scale }, paintless());
        canvas.restore();
      });
      return `data:image/png;base64,${flat.encodeToBase64(ImageFormat.PNG, 100)}`;
    })();
    pending.catch(() => thumbCache.delete(key));
    thumbCache.set(key, pending);
  }
  return pending;
};

const illustrationCache = new Map<string, Promise<string>>();

/**
 * A card's illustration alone (no frame), cropped to `crop` in card units
 * (default: the visible art window), as a PNG data URI. Used for story
 * scenes in quests.
 */
export const loadIllustration = (cardId: CardId, widthPx: number, crop?: SkRect): Promise<string> => {
  const card = catalog.card(cardId);
  if (!card) return Promise.reject(new Error(`Unknown card ${cardId}`));
  const layout = layoutFor(card.rarity);
  const window = crop ?? layout.art;
  const scale = Math.min(4, Math.max(0.5, Math.round((widthPx / window.width) * 4) / 4));
  const key = `${cardId}|${scale}|${window.x},${window.y},${window.width},${window.height}`;
  let pending = illustrationCache.get(key);
  if (!pending) {
    pending = (async () => {
      await yieldToUi();
      const art = bakeArtLayers(sceneFor(card.artKey), layout, scale, 'full');
      const flat = bakeImage(window.width * scale, window.height * scale, (canvas) => {
        const dst = { x: (art.area.x - window.x) * scale, y: (art.area.y - window.y) * scale, width: art.area.width * scale, height: art.area.height * scale };
        const src = (img: SkImage) => ({ x: 0, y: 0, width: img.width(), height: img.height() });
        canvas.drawImageRect(art.back, src(art.back), dst, paintless());
        canvas.drawImageRect(art.front, src(art.front), dst, paintless());
      });
      return `data:image/png;base64,${flat.encodeToBase64(ImageFormat.PNG, 100)}`;
    })();
    pending.catch(() => illustrationCache.delete(key));
    illustrationCache.set(key, pending);
  }
  return pending;
};

export const useIllustration = (cardId: CardId, widthPx: number, crop?: SkRect): string | null => {
  const [state, setState] = useState<{ key: string; uri: string } | null>(null);
  const key = `${cardId}|${widthPx}|${crop ? `${crop.x},${crop.y},${crop.width},${crop.height}` : 'art'}`;
  useEffect(() => {
    let alive = true;
    loadIllustration(cardId, widthPx, crop)
      .then((uri) => alive && setState({ key, uri }))
      .catch((error: unknown) => console.warn('[textures] illustration failed', error));
    return () => {
      alive = false;
    };
    // `crop` is compared through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, widthPx, key]);
  return state?.key === key ? state.uri : null;
};

const paintless = () => {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  return p;
};

/** React binding: textures for a card, or null while baking. Cached textures are returned immediately. */
export const useCardTextures = (cardId: CardId | undefined, scale: number, undiscovered = false): CardTextures | null => {
  const key = cardId ? heroKeyOf(cardId, scale, undiscovered) : null;
  const [loaded, setLoaded] = useState<{ key: string; textures: CardTextures } | null>(null);
  useEffect(() => {
    if (!cardId || !key || heroCache.has(key)) return;
    let alive = true;
    loadCardTextures(cardId, scale, undiscovered)
      .then((textures) => alive && setLoaded({ key, textures }))
      .catch((error: unknown) => console.warn('[textures] bake failed', error));
    return () => {
      alive = false;
    };
  }, [cardId, key, scale, undiscovered]);
  if (!key) return null;
  return heroCache.get(key) ?? (loaded?.key === key ? loaded.textures : null);
};

export const useCardBack = (scale: number): SkImage | null => {
  const [image, setImage] = useState<SkImage | null>(null);
  useEffect(() => {
    let alive = true;
    loadCardBack(scale)
      .then((img) => alive && setImage(img))
      .catch((error: unknown) => console.warn('[textures] back bake failed', error));
    return () => {
      alive = false;
    };
  }, [scale]);
  return image;
};

export const useCardThumbnail = (cardId: CardId, widthPx: number, undiscovered: boolean): string | null => {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadCardThumbnail(cardId, widthPx, undiscovered)
      .then((value) => alive && setUri(value))
      .catch((error: unknown) => console.warn('[textures] thumbnail failed', error));
    return () => {
      alive = false;
    };
  }, [cardId, widthPx, undiscovered]);
  return uri;
};

export { CARD_H, CARD_W };

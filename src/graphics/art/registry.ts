import { drawCrown } from './emblems';
import { dustMotes, godRays, grain, ridge, ridgePoints, sky, sunGlow, vignette } from './environment';
import type { ArtScene } from './scene';
import { davidGiantSlayer } from './scenes/davidGiantSlayer';
import { davidShepherd } from './scenes/davidShepherd';
import { esther } from './scenes/esther';
import { joshua } from './scenes/joshua';
import { daniel, davidKing, davidPsalmist, elijah, moses, noah } from './scenes/oldTestament';
import { ruth } from './scenes/ruth';
import { slingStones } from './scenes/slingStones';

/**
 * A dignified stand-in for cards whose illustration has not been painted
 * yet: a dawn sky over hills with the crown crest. Clearly generic, never
 * mistaken for a depiction of the biblical subject.
 */
const pendingIllustration = (key: string, seed: number): ArtScene => ({
  key,
  seed,
  light: '#FFD9A0',
  back({ canvas, area, rand }) {
    sky(canvas, area, ['#121826', '#2A3550', '#7A6A6E', '#D9A877', '#F2D3A0'], [0, 0.3, 0.62, 0.84, 1]);
    const sun = [area.x + area.width / 2, area.y + area.height * 0.66] as const;
    sunGlow(canvas, sun, { radius: 12, halo: '#FFC98A', core: '#FFF4DE' });
    godRays(canvas, rand, sun, { count: 16, length: 260, angle: -Math.PI / 2, spread: 2.6, color: '#FFE6B8', alpha: 0.12 });
    ridge(canvas, ridgePoints(rand, { x0: area.x - 20, x1: area.x + area.width + 20, baseY: area.y + area.height * 0.74, amp: 10 }), area.y + area.height + 20, '#3A3346', '#1A1822');
  },
  front({ canvas, area, rand, mode }) {
    if (mode === 'silhouette') return;
    drawCrown(canvas, [area.x + area.width / 2, area.y + area.height * 0.42], 70);
    dustMotes(canvas, rand, area, 20, '#FFE6B8');
    grain(canvas, area, 0.05);
    vignette(canvas, area, 0.5);
  },
});

const SCENES: Readonly<Record<string, ArtScene>> = {
  [davidGiantSlayer.key]: davidGiantSlayer,
  [ruth.key]: ruth,
  [davidShepherd.key]: davidShepherd,
  [joshua.key]: joshua,
  [esther.key]: esther,
  [slingStones.key]: slingStones,
  [noah.key]: noah,
  [moses.key]: moses,
  [davidKing.key]: davidKing,
  [davidPsalmist.key]: davidPsalmist,
  [elijah.key]: elijah,
  [daniel.key]: daniel,
};

let fallbackSeed = 100;
const fallbacks = new Map<string, ArtScene>();

export const sceneFor = (artKey: string): ArtScene => {
  const scene = SCENES[artKey];
  if (scene) return scene;
  let fallback = fallbacks.get(artKey);
  if (!fallback) {
    fallback = pendingIllustration(artKey, fallbackSeed++);
    fallbacks.set(artKey, fallback);
  }
  return fallback;
};

export const hasPaintedScene = (artKey: string): boolean => SCENES[artKey] !== undefined;

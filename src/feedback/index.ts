import { audio } from './audio';
import { haptic } from './haptics';

export { audio } from './audio';
export { haptic } from './haptics';
export type { HapticEvent } from './haptics';
export type { SoundId } from './sounds';

/** Common interface feedback: sound and touch together, always restrained. */
export const feedback = {
  tap: () => {
    haptic('tap');
    audio.play('ui_tap');
  },
  select: () => {
    haptic('select');
    audio.play('ui_select');
  },
  back: () => {
    haptic('tap');
    audio.play('ui_back');
  },
  confirm: () => {
    haptic('success');
    audio.play('ui_confirm');
  },
  panel: () => audio.play('stone_slide', { volume: 0.7 }),
} as const;

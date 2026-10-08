import type { SoundId, SoundSpec } from './sounds';

/**
 * Bundled sounds and mix levels. All files are TEMPORARY procedurally
 * synthesized placeholders (scripts/generate-audio.mjs); keep these ids
 * stable when professional sound design replaces them.
 *
 * Every file is peak-normalized to −3 dBFS (loops −10 dBFS), so perceived
 * loudness is balanced here: UI clicks sit low, the Legendary moment highest.
 */
export const SOUND_MANIFEST: Partial<Record<SoundId, SoundSpec>> = {
  ui_tap: { source: require('../../assets/audio/ui_tap.wav'), category: 'ui', gain: 0.38, voices: 3 },
  ui_select: { source: require('../../assets/audio/ui_select.wav'), category: 'ui', gain: 0.38, voices: 2 },
  ui_back: { source: require('../../assets/audio/ui_back.wav'), category: 'ui', gain: 0.4 },
  ui_confirm: { source: require('../../assets/audio/ui_confirm.wav'), category: 'ui', gain: 0.5 },
  stone_slide: { source: require('../../assets/audio/stone_slide.wav'), category: 'ui', gain: 0.42 },
  pack_grab: { source: require('../../assets/audio/pack_grab.wav'), category: 'effects', gain: 0.75, voices: 2 },
  foil_stretch_loop: { source: require('../../assets/audio/foil_stretch_loop.wav'), category: 'effects', gain: 0.5, loop: true },
  foil_rip_1: { source: require('../../assets/audio/foil_rip_1.wav'), category: 'effects', gain: 0.72, voices: 2 },
  foil_rip_2: { source: require('../../assets/audio/foil_rip_2.wav'), category: 'effects', gain: 0.72, voices: 2 },
  foil_rip_3: { source: require('../../assets/audio/foil_rip_3.wav'), category: 'effects', gain: 0.72, voices: 2 },
  foil_rip_4: { source: require('../../assets/audio/foil_rip_4.wav'), category: 'effects', gain: 0.72, voices: 2 },
  foil_release: { source: require('../../assets/audio/foil_release.wav'), category: 'effects', gain: 0.85 },
  wrapper_fall: { source: require('../../assets/audio/wrapper_fall.wav'), category: 'effects', gain: 0.6 },
  cards_slide: { source: require('../../assets/audio/cards_slide.wav'), category: 'effects', gain: 0.7 },
  card_shuffle: { source: require('../../assets/audio/card_shuffle.wav'), category: 'effects', gain: 0.6 },
  card_flip: { source: require('../../assets/audio/card_flip.wav'), category: 'effects', gain: 0.7, voices: 2 },
  card_place: { source: require('../../assets/audio/card_place.wav'), category: 'effects', gain: 0.6, voices: 2 },
  card_whoosh: { source: require('../../assets/audio/card_whoosh.wav'), category: 'effects', gain: 0.55, voices: 2 },
  reveal_common: { source: require('../../assets/audio/reveal_common.wav'), category: 'effects', gain: 0.55 },
  reveal_rare: { source: require('../../assets/audio/reveal_rare.wav'), category: 'effects', gain: 0.65 },
  reveal_epic: { source: require('../../assets/audio/reveal_epic.wav'), category: 'effects', gain: 0.75 },
  legendary_anticipation: { source: require('../../assets/audio/legendary_anticipation.wav'), category: 'effects', gain: 0.85 },
  legendary_reveal: { source: require('../../assets/audio/legendary_reveal.wav'), category: 'effects', gain: 0.95 },
  shimmer_tail: { source: require('../../assets/audio/shimmer_tail.wav'), category: 'effects', gain: 0.5 },
  quest_complete: { source: require('../../assets/audio/quest_complete.wav'), category: 'effects', gain: 0.8 },
  answer_correct: { source: require('../../assets/audio/answer_correct.wav'), category: 'effects', gain: 0.6 },
  answer_gentle: { source: require('../../assets/audio/answer_gentle.wav'), category: 'effects', gain: 0.5 },
  xp_gain: { source: require('../../assets/audio/xp_gain.wav'), category: 'effects', gain: 0.5 },
  ambient_hall_loop: { source: require('../../assets/audio/ambient_hall_loop.wav'), category: 'music', gain: 0.6, loop: true },
  ambient_treasury_loop: { source: require('../../assets/audio/ambient_treasury_loop.wav'), category: 'music', gain: 0.6, loop: true },
};

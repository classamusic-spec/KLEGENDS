/** Every sound the game can play. Assets live in assets/audio/<id>.wav. */
export type SoundId =
  | 'ui_tap'
  | 'ui_select'
  | 'ui_back'
  | 'ui_confirm'
  | 'stone_slide'
  | 'pack_grab'
  | 'foil_stretch_loop'
  | 'foil_rip_1'
  | 'foil_rip_2'
  | 'foil_rip_3'
  | 'foil_rip_4'
  | 'foil_release'
  | 'wrapper_fall'
  | 'cards_slide'
  | 'card_shuffle'
  | 'card_flip'
  | 'card_place'
  | 'card_whoosh'
  | 'reveal_common'
  | 'reveal_rare'
  | 'reveal_epic'
  | 'legendary_anticipation'
  | 'legendary_reveal'
  | 'shimmer_tail'
  | 'quest_complete'
  | 'answer_correct'
  | 'answer_gentle'
  | 'xp_gain'
  | 'ambient_hall_loop'
  | 'ambient_treasury_loop';

export type SoundCategory = 'ui' | 'effects' | 'music';

export interface SoundSpec {
  /** Metro asset reference (`require('…wav')`). */
  readonly source: number;
  readonly category: SoundCategory;
  /** Mix level relative to the category volume (0–1). */
  readonly gain: number;
  /** Simultaneous voices; > 1 lets rapid repeats overlap. */
  readonly voices?: number;
  readonly loop?: boolean;
}

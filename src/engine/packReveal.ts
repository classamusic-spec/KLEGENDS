import type { PackOpening, PackOpeningItem } from '@/domain/packs';
import { compareRarity } from '@/domain/rarity';

/**
 * Presentation state machine for the Royal Pack Opening.
 *
 * Rewards are decided and committed before this machine ever runs (see
 * packTransactions.openPack); the machine only choreographs how an immutable
 * PackOpening is shown. No event can add, remove or change a card, so
 * skipping, interrupting or replaying the reveal is always safe.
 *
 *   LOADING ─▶ PRESENTING ─▶ READY_TO_GRAB ─▶ GRABBING ─▶ TENSION ─▶ TEARING ─▶ OPENED
 *      │                         ▲    │ (AUTO_OPEN: accessible alternative)    │
 *      ▼                         └────┴──────────── RELEASE (below threshold) ◀┘
 *    ERROR ─RETRY─▶ LOADING
 *   OPENED ─▶ CARDS_EXTRACTING ─▶ REVEALING_CARD ─▶ RARITY_CELEBRATION ─▶ REVEAL_COMPLETE
 *                                      ▲                                        │
 *                                      └──────────────── NEXT ─────────────────┤
 *                                                                               ▼
 *                                                          SUMMARY ─CLOSE─▶ CLOSED
 */
export type RevealPhase =
  | 'LOADING'
  | 'ERROR'
  | 'PRESENTING'
  | 'READY_TO_GRAB'
  | 'GRABBING'
  | 'TENSION'
  | 'TEARING'
  | 'OPENED'
  | 'CARDS_EXTRACTING'
  | 'REVEALING_CARD'
  | 'RARITY_CELEBRATION'
  | 'REVEAL_COMPLETE'
  | 'SUMMARY'
  | 'CLOSED';

export interface RevealState {
  readonly phase: RevealPhase;
  readonly opening?: PackOpening;
  /** Item indexes in presentation order. */
  readonly order: readonly number[];
  /** Cards flipped face-up so far. Mirrors PackOpening.revealedCount. */
  readonly revealed: number;
  /** Seal tear progress 0–1. Never decreases: a released tear keeps its progress. */
  readonly tearProgress: number;
  readonly error?: string;
  /** True while the app is backgrounded; animations and audio pause. */
  readonly paused: boolean;
  /** True when the machine was restored from an interrupted opening. */
  readonly resumed: boolean;
}

export type RevealEvent =
  | { readonly type: 'REWARD_RECEIVED'; readonly opening: PackOpening }
  | { readonly type: 'REWARD_FAILED'; readonly message: string }
  | { readonly type: 'RETRY' }
  | { readonly type: 'PRESENTATION_FINISHED' }
  | { readonly type: 'GRAB' }
  | { readonly type: 'TENSION' }
  | { readonly type: 'TEAR_PROGRESS'; readonly progress: number }
  | { readonly type: 'RELEASE' }
  | { readonly type: 'AUTO_OPEN' }
  | { readonly type: 'EXTRACT_START' }
  | { readonly type: 'EXTRACT_CANCEL' }
  | { readonly type: 'EXTRACT_COMPLETE' }
  | { readonly type: 'REVEAL' }
  | { readonly type: 'CELEBRATION_DONE' }
  | { readonly type: 'NEXT' }
  | { readonly type: 'SKIP_TO_SUMMARY' }
  | { readonly type: 'BACKGROUND' }
  | { readonly type: 'FOREGROUND' }
  | { readonly type: 'CLOSE' };

export interface RevealMachineConfig {
  readonly tearCompleteThreshold: number;
}

export const initialRevealState: RevealState = {
  phase: 'LOADING',
  order: [],
  revealed: 0,
  tearProgress: 0,
  paused: false,
  resumed: false,
};

/**
 * Presentation order: ascending rarity so the strongest moment lands last,
 * stable by pack position. This is a presentation rule only.
 */
export const presentationOrder = (items: readonly PackOpeningItem[]): number[] =>
  [...items].sort((a, b) => compareRarity(a.rarity, b.rarity) || a.index - b.index).map((item) => item.index);

const SKIPPABLE: ReadonlySet<RevealPhase> = new Set([
  'PRESENTING',
  'READY_TO_GRAB',
  'GRABBING',
  'TENSION',
  'TEARING',
  'OPENED',
  'CARDS_EXTRACTING',
  'REVEALING_CARD',
  'RARITY_CELEBRATION',
  'REVEAL_COMPLETE',
]);

const total = (state: RevealState): number => state.opening?.items.length ?? 0;

const clamp01 = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

export const revealReducer = (
  state: RevealState,
  event: RevealEvent,
  config: RevealMachineConfig,
): RevealState => {
  if (state.phase === 'CLOSED') return state;

  // Global events.
  switch (event.type) {
    case 'CLOSE':
      return { ...state, phase: 'CLOSED' };
    case 'FOREGROUND':
      return state.paused ? { ...state, paused: false } : state;
    case 'BACKGROUND': {
      const interrupted: Partial<Record<RevealPhase, RevealPhase>> = {
        GRABBING: 'READY_TO_GRAB',
        TENSION: 'READY_TO_GRAB',
        TEARING: 'READY_TO_GRAB',
        CARDS_EXTRACTING: 'OPENED',
        RARITY_CELEBRATION: 'REVEAL_COMPLETE',
      };
      return { ...state, paused: true, phase: interrupted[state.phase] ?? state.phase };
    }
    case 'SKIP_TO_SUMMARY':
      if (!SKIPPABLE.has(state.phase)) return state;
      return { ...state, phase: 'SUMMARY', revealed: total(state), tearProgress: 1 };
    default:
      break;
  }

  switch (state.phase) {
    case 'LOADING':
      if (event.type === 'REWARD_RECEIVED') {
        const { opening } = event;
        const count = opening.items.length;
        const alreadyRevealed = opening.status === 'committed' ? Math.min(opening.revealedCount, count) : 0;
        const base: RevealState = {
          ...state,
          opening,
          order: presentationOrder(opening.items),
          error: undefined,
          revealed: alreadyRevealed,
          resumed: alreadyRevealed > 0,
        };
        if (alreadyRevealed >= count) return { ...base, phase: 'SUMMARY', tearProgress: 1 };
        if (alreadyRevealed > 0) return { ...base, phase: 'REVEALING_CARD', tearProgress: 1 };
        return { ...base, phase: 'PRESENTING', tearProgress: 0 };
      }
      if (event.type === 'REWARD_FAILED') return { ...state, phase: 'ERROR', error: event.message };
      return state;

    case 'ERROR':
      return event.type === 'RETRY' ? { ...state, phase: 'LOADING', error: undefined } : state;

    case 'PRESENTING':
      if (event.type === 'PRESENTATION_FINISHED') return { ...state, phase: 'READY_TO_GRAB' };
      if (event.type === 'AUTO_OPEN') return { ...state, phase: 'OPENED', tearProgress: 1 };
      return state;

    case 'READY_TO_GRAB':
      if (event.type === 'GRAB') return { ...state, phase: 'GRABBING' };
      if (event.type === 'AUTO_OPEN') return { ...state, phase: 'OPENED', tearProgress: 1 };
      return state;

    case 'GRABBING':
    case 'TENSION':
    case 'TEARING':
      if (event.type === 'TENSION' && state.phase === 'GRABBING') return { ...state, phase: 'TENSION' };
      if (event.type === 'TEAR_PROGRESS') {
        if (state.phase === 'GRABBING' && clamp01(event.progress) <= state.tearProgress) return state;
        const progress = Math.max(state.tearProgress, clamp01(event.progress));
        if (progress >= 1) return { ...state, phase: 'OPENED', tearProgress: 1 };
        return { ...state, phase: 'TEARING', tearProgress: progress };
      }
      if (event.type === 'RELEASE') {
        if (state.tearProgress >= config.tearCompleteThreshold) return { ...state, phase: 'OPENED', tearProgress: 1 };
        return { ...state, phase: 'READY_TO_GRAB' };
      }
      return state;

    case 'OPENED':
      if (event.type === 'EXTRACT_START') return { ...state, phase: 'CARDS_EXTRACTING' };
      if (event.type === 'EXTRACT_COMPLETE') return { ...state, phase: 'REVEALING_CARD' };
      return state;

    case 'CARDS_EXTRACTING':
      if (event.type === 'EXTRACT_CANCEL') return { ...state, phase: 'OPENED' };
      if (event.type === 'EXTRACT_COMPLETE') return { ...state, phase: 'REVEALING_CARD' };
      return state;

    case 'REVEALING_CARD':
      if (event.type === 'REVEAL' && state.revealed < total(state)) {
        return { ...state, phase: 'RARITY_CELEBRATION', revealed: state.revealed + 1 };
      }
      return state;

    case 'RARITY_CELEBRATION':
      if (event.type === 'CELEBRATION_DONE' || event.type === 'NEXT') return { ...state, phase: 'REVEAL_COMPLETE' };
      return state;

    case 'REVEAL_COMPLETE':
      if (event.type === 'NEXT') {
        return { ...state, phase: state.revealed >= total(state) ? 'SUMMARY' : 'REVEALING_CARD' };
      }
      return state;

    case 'SUMMARY':
      return state;
  }
};

/** The card currently in focus: the face-down card about to flip, or the card just revealed. */
export const focusedItem = (state: RevealState): PackOpeningItem | undefined => {
  const items = state.opening?.items;
  if (!items) return undefined;
  const position =
    state.phase === 'REVEALING_CARD' ? state.revealed : state.phase === 'RARITY_CELEBRATION' || state.phase === 'REVEAL_COMPLETE' ? state.revealed - 1 : -1;
  const index = state.order[position];
  return index === undefined ? undefined : items[index];
};

/** Items already flipped, in presentation order. */
export const revealedItems = (state: RevealState): PackOpeningItem[] => {
  const items = state.opening?.items ?? [];
  return state.order
    .slice(0, state.revealed)
    .map((index) => items[index])
    .filter((item): item is PackOpeningItem => item !== undefined);
};

export const isLastCard = (state: RevealState): boolean => state.revealed >= total(state);

import {
  focusedItem,
  initialRevealState,
  isLastCard,
  presentationOrder,
  revealedItems,
  revealReducer,
  type RevealEvent,
  type RevealState,
} from './packReveal';
import type { PackOpening, PackOpeningItem } from '@/domain/packs';
import type { Rarity } from '@/domain/rarity';

const CONFIG = { tearCompleteThreshold: 0.62 };

const item = (index: number, rarity: Rarity): PackOpeningItem => ({
  index,
  editionId: `card${index}/standard`,
  cardId: `card${index}`,
  rarity,
  isNew: true,
  copiesAfter: 1,
});

const opening = (overrides: Partial<PackOpening> = {}): PackOpening => ({
  id: 'opening_1',
  grantId: 'grant_1',
  playerId: 'player_1',
  packDefinitionId: 'demo',
  createdAt: '2026-10-08T15:00:00.000Z',
  items: [item(0, 'rare'), item(1, 'legendary'), item(2, 'common'), item(3, 'epic'), item(4, 'common')],
  isDemo: true,
  status: 'committed',
  revealedCount: 0,
  ...overrides,
});

const run = (events: RevealEvent[], start: RevealState = initialRevealState): RevealState =>
  events.reduce((state, event) => revealReducer(state, event, CONFIG), start);

const ready = (): RevealState => run([{ type: 'REWARD_RECEIVED', opening: opening() }, { type: 'PRESENTATION_FINISHED' }]);

const opened = (): RevealState => run([{ type: 'AUTO_OPEN' }], ready());

const revealing = (): RevealState => run([{ type: 'EXTRACT_START' }, { type: 'EXTRACT_COMPLETE' }], opened());

describe('presentation order', () => {
  it('reveals in ascending rarity, stable by pack position, with the Legendary last', () => {
    expect(presentationOrder(opening().items)).toEqual([2, 4, 0, 3, 1]);
  });
});

describe('loading and failures', () => {
  it('moves from LOADING to PRESENTING when the committed opening arrives', () => {
    const state = run([{ type: 'REWARD_RECEIVED', opening: opening() }]);
    expect(state.phase).toBe('PRESENTING');
    expect(state.order).toEqual([2, 4, 0, 3, 1]);
    expect(state.resumed).toBe(false);
  });

  it('shows an error on a failed reward request and retries', () => {
    const failed = run([{ type: 'REWARD_FAILED', message: 'offline' }]);
    expect(failed.phase).toBe('ERROR');
    expect(failed.error).toBe('offline');
    const retried = run([{ type: 'RETRY' }], failed);
    expect(retried.phase).toBe('LOADING');
    expect(retried.error).toBeUndefined();
  });
});

describe('tearing the seal', () => {
  it('follows GRAB → TENSION → TEARING → OPENED', () => {
    let state = run([{ type: 'GRAB' }], ready());
    expect(state.phase).toBe('GRABBING');
    state = run([{ type: 'TENSION' }], state);
    expect(state.phase).toBe('TENSION');
    state = run([{ type: 'TEAR_PROGRESS', progress: 0.3 }], state);
    expect(state.phase).toBe('TEARING');
    expect(state.tearProgress).toBeCloseTo(0.3);
    state = run([{ type: 'TEAR_PROGRESS', progress: 1 }], state);
    expect(state.phase).toBe('OPENED');
    expect(state.tearProgress).toBe(1);
  });

  it('treats a short drag (grab and release) as a no-op', () => {
    const state = run([{ type: 'GRAB' }, { type: 'RELEASE' }], ready());
    expect(state.phase).toBe('READY_TO_GRAB');
    expect(state.tearProgress).toBe(0);
  });

  it('preserves partial tear progress when released below the threshold', () => {
    const state = run([{ type: 'GRAB' }, { type: 'TENSION' }, { type: 'TEAR_PROGRESS', progress: 0.4 }, { type: 'RELEASE' }], ready());
    expect(state.phase).toBe('READY_TO_GRAB');
    expect(state.tearProgress).toBeCloseTo(0.4);
  });

  it('continues from preserved progress on a repeated gesture and never moves backwards', () => {
    const partial = run([{ type: 'GRAB' }, { type: 'TENSION' }, { type: 'TEAR_PROGRESS', progress: 0.4 }, { type: 'RELEASE' }], ready());
    const regrab = run([{ type: 'GRAB' }, { type: 'TEAR_PROGRESS', progress: 0.2 }], partial);
    expect(regrab.phase).toBe('GRABBING');
    expect(regrab.tearProgress).toBeCloseTo(0.4);
    const advanced = run([{ type: 'TEAR_PROGRESS', progress: 0.5 }], regrab);
    expect(advanced.phase).toBe('TEARING');
    expect(advanced.tearProgress).toBeCloseTo(0.5);
  });

  it('completes the tear smoothly when released past the threshold', () => {
    const state = run([{ type: 'GRAB' }, { type: 'TENSION' }, { type: 'TEAR_PROGRESS', progress: 0.7 }, { type: 'RELEASE' }], ready());
    expect(state.phase).toBe('OPENED');
    expect(state.tearProgress).toBe(1);
  });

  it('clamps invalid progress values', () => {
    const state = run([{ type: 'GRAB' }, { type: 'TENSION' }, { type: 'TEAR_PROGRESS', progress: Number.NaN }], ready());
    expect(state.tearProgress).toBe(0);
    const over = run([{ type: 'TEAR_PROGRESS', progress: 7 }], run([{ type: 'GRAB' }, { type: 'TENSION' }], ready()));
    expect(over.phase).toBe('OPENED');
  });

  it('offers an accessible open that needs no gesture', () => {
    expect(opened().phase).toBe('OPENED');
    expect(run([{ type: 'AUTO_OPEN' }], run([{ type: 'REWARD_RECEIVED', opening: opening() }])).phase).toBe('OPENED');
  });

  it('ignores tear events before the pack is ready', () => {
    const presenting = run([{ type: 'REWARD_RECEIVED', opening: opening() }]);
    expect(run([{ type: 'GRAB' }, { type: 'TEAR_PROGRESS', progress: 0.9 }], presenting)).toBe(presenting);
  });
});

describe('extracting and revealing cards', () => {
  it('returns to OPENED when an extraction drag is cancelled', () => {
    const state = run([{ type: 'EXTRACT_START' }, { type: 'EXTRACT_CANCEL' }], opened());
    expect(state.phase).toBe('OPENED');
  });

  it('supports a tap-to-extract alternative', () => {
    expect(run([{ type: 'EXTRACT_COMPLETE' }], opened()).phase).toBe('REVEALING_CARD');
  });

  it('reveals one card at a time with a celebration for each', () => {
    let state = revealing();
    expect(focusedItem(state)?.index).toBe(2);
    state = run([{ type: 'REVEAL' }], state);
    expect(state.phase).toBe('RARITY_CELEBRATION');
    expect(state.revealed).toBe(1);
    expect(focusedItem(state)?.index).toBe(2);
    state = run([{ type: 'CELEBRATION_DONE' }], state);
    expect(state.phase).toBe('REVEAL_COMPLETE');
    state = run([{ type: 'NEXT' }], state);
    expect(state.phase).toBe('REVEALING_CARD');
    expect(focusedItem(state)?.index).toBe(4);
  });

  it('lets the player tap through a celebration', () => {
    const state = run([{ type: 'REVEAL' }, { type: 'NEXT' }], revealing());
    expect(state.phase).toBe('REVEAL_COMPLETE');
  });

  it('ends on the Legendary and then shows the summary', () => {
    let state = revealing();
    for (let i = 0; i < 5; i++) {
      if (i > 0) state = run([{ type: 'NEXT' }], state);
      state = run([{ type: 'REVEAL' }, { type: 'CELEBRATION_DONE' }], state);
    }
    expect(focusedItem(state)?.rarity).toBe('legendary');
    expect(isLastCard(state)).toBe(true);
    state = run([{ type: 'NEXT' }], state);
    expect(state.phase).toBe('SUMMARY');
    expect(revealedItems(state).map((i) => i.index)).toEqual([2, 4, 0, 3, 1]);
  });

  it('cannot reveal more cards than the pack contains', () => {
    let state = revealing();
    for (let i = 0; i < 9; i++) state = run([{ type: 'REVEAL' }, { type: 'CELEBRATION_DONE' }, { type: 'NEXT' }], state);
    expect(state.revealed).toBe(5);
    expect(state.phase).toBe('SUMMARY');
  });
});

describe('skip, interruption and restoration', () => {
  it('skips straight to the summary from any presentation phase, revealing everything', () => {
    for (const state of [ready(), opened(), revealing(), run([{ type: 'REVEAL' }], revealing())]) {
      const skipped = run([{ type: 'SKIP_TO_SUMMARY' }], state);
      expect(skipped.phase).toBe('SUMMARY');
      expect(skipped.revealed).toBe(5);
      expect(skipped.opening).toBe(state.opening);
    }
  });

  it('cannot skip while loading or after an error', () => {
    expect(run([{ type: 'SKIP_TO_SUMMARY' }]).phase).toBe('LOADING');
  });

  it('cancels an in-flight tear gesture on background but keeps its progress', () => {
    const tearing = run([{ type: 'GRAB' }, { type: 'TENSION' }, { type: 'TEAR_PROGRESS', progress: 0.45 }], ready());
    const backgrounded = run([{ type: 'BACKGROUND' }], tearing);
    expect(backgrounded.phase).toBe('READY_TO_GRAB');
    expect(backgrounded.paused).toBe(true);
    expect(backgrounded.tearProgress).toBeCloseTo(0.45);
    expect(run([{ type: 'FOREGROUND' }], backgrounded).paused).toBe(false);
  });

  it('settles an interrupted celebration so the revealed card stays revealed', () => {
    const celebrating = run([{ type: 'REVEAL' }], revealing());
    const state = run([{ type: 'BACKGROUND' }], celebrating);
    expect(state.phase).toBe('REVEAL_COMPLETE');
    expect(state.revealed).toBe(1);
  });

  it('cancels an in-flight extraction on background', () => {
    const extracting = run([{ type: 'EXTRACT_START' }], opened());
    expect(run([{ type: 'BACKGROUND' }], extracting).phase).toBe('OPENED');
  });

  it('restores an interrupted opening at the next unrevealed card', () => {
    const state = run([{ type: 'REWARD_RECEIVED', opening: opening({ revealedCount: 3 }) }]);
    expect(state.phase).toBe('REVEALING_CARD');
    expect(state.resumed).toBe(true);
    expect(state.revealed).toBe(3);
    expect(focusedItem(state)?.index).toBe(3);
  });

  it('restores a fully revealed but unfinished opening to the summary', () => {
    const state = run([{ type: 'REWARD_RECEIVED', opening: opening({ revealedCount: 5 }) }]);
    expect(state.phase).toBe('SUMMARY');
  });

  it('replays an already presented opening from the sealed pack', () => {
    const state = run([{ type: 'REWARD_RECEIVED', opening: opening({ status: 'presented', revealedCount: 5 }) }]);
    expect(state.phase).toBe('PRESENTING');
    expect(state.revealed).toBe(0);
  });

  it('closes from any phase and ignores everything afterwards', () => {
    const closed = run([{ type: 'CLOSE' }], revealing());
    expect(closed.phase).toBe('CLOSED');
    expect(run([{ type: 'REVEAL' }, { type: 'RETRY' }, { type: 'FOREGROUND' }], closed)).toBe(closed);
  });
});

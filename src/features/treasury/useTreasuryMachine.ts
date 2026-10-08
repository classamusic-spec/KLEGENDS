import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_REVEAL_CONFIGURATION } from '@/domain/packs';
import { initialRevealState, revealReducer, type RevealEvent, type RevealState } from '@/engine/packReveal';
import { audio } from '@/feedback';
import { describeServiceError } from '@/services/gameService';
import { gameService } from '@/state/game';

const reducer = (state: RevealState, event: RevealEvent) =>
  revealReducer(state, event, { tearCompleteThreshold: DEFAULT_REVEAL_CONFIGURATION.tearCompleteThreshold });

/**
 * Binds the pure reveal state machine to the game service and the device:
 * requests the (idempotent) opening, retries failures, persists reveal
 * progress as cards are flipped, marks the opening presented, and pauses
 * the presentation while the app is backgrounded. Rewards are never
 * touched here — they were committed when the opening was created.
 */
export const useTreasuryMachine = (grantId: string | undefined) => {
  const [state, dispatch] = useReducer(reducer, initialRevealState);
  const [attempt, setAttempt] = useState(0);
  const lastPersisted = useRef(0);

  // Request the opening (or the existing one, for a resumed reveal).
  useEffect(() => {
    if (!grantId) {
      dispatch({ type: 'REWARD_FAILED', message: 'This pack could not be found.' });
      return;
    }
    let alive = true;
    gameService
      .openPack(grantId)
      .then((opening) => {
        if (!alive) return;
        lastPersisted.current = opening.revealedCount;
        dispatch({ type: 'REWARD_RECEIVED', opening });
      })
      .catch((error: unknown) => alive && dispatch({ type: 'REWARD_FAILED', message: describeServiceError(error) }));
    return () => {
      alive = false;
    };
  }, [grantId, attempt]);

  // Persist presentation progress (monotonic; never affects rewards).
  useEffect(() => {
    const opening = state.opening;
    if (!opening || opening.status === 'presented') return;
    if (state.revealed > lastPersisted.current) {
      lastPersisted.current = state.revealed;
      gameService.recordRevealProgress(opening.id, state.revealed).catch(() => undefined);
    }
    if (state.phase === 'SUMMARY') {
      gameService.markOpeningPresented(opening.id).catch(() => undefined);
    }
  }, [state.opening, state.revealed, state.phase]);

  // Background / foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      dispatch({ type: next === 'active' ? 'FOREGROUND' : 'BACKGROUND' });
    });
    return () => sub.remove();
  }, []);

  // Ambient bed for the treasury.
  useEffect(() => {
    audio.startLoop('ambient_treasury_loop', { level: 0.8, fadeMs: 1200 });
    return () => audio.stopLoop('ambient_treasury_loop', 600);
  }, []);

  const retry = useCallback(() => {
    dispatch({ type: 'RETRY' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, dispatch, retry };
};

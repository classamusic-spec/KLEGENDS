import { useCallback, useState } from 'react';

import type { GrantId } from '@/domain/packs';
import { describeServiceError } from '@/services/gameService';
import { gameService, useAvailableGrant, useDailyPackStatus, useResumableOpening } from '@/state/game';

/** What the treasury offers right now, in priority order. */
export type TreasuryEntry =
  | { readonly kind: 'loading' }
  | { readonly kind: 'resume'; readonly grantId: GrantId; readonly revealed: number; readonly total: number }
  | { readonly kind: 'open'; readonly grantId: GrantId }
  | { readonly kind: 'claim' }
  | { readonly kind: 'wait'; readonly nextAvailableAt: string };

/**
 * Treasury availability for the Royal Hall and the pack selection screen,
 * plus the daily claim action. The claim is validated by the game service;
 * this hook never decides eligibility on its own.
 */
export const useTreasuryEntry = (now: Date) => {
  const resumable = useResumableOpening();
  const grant = useAvailableGrant();
  const daily = useDailyPackStatus(now);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let entry: TreasuryEntry;
  if (resumable) entry = { kind: 'resume', grantId: resumable.grantId, revealed: resumable.revealedCount, total: resumable.items.length };
  else if (grant) entry = { kind: 'open', grantId: grant.id };
  else if (!daily) entry = { kind: 'loading' };
  else if (daily.state === 'available') entry = { kind: 'claim' };
  else entry = { kind: 'wait', nextAvailableAt: daily.nextAvailableAt };

  /** Claims today's pack; resolves to the new grant id, or null on failure. */
  const claim = useCallback(async (): Promise<GrantId | null> => {
    setClaiming(true);
    setError(null);
    try {
      const claimed = await gameService.claimDailyPack();
      return claimed.id;
    } catch (e) {
      setError(describeServiceError(e));
      return null;
    } finally {
      setClaiming(false);
    }
  }, []);

  return { entry, claim, claiming, error };
};

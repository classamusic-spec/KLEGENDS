import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import type { CardId } from '@/domain/cards';
import { TreasuryScreen } from '@/features/treasury/TreasuryScreen';
import { useAvailableGrant, useResumableOpening } from '@/state/game';

/**
 * Royal Treasury route. `grantId` selects the pack to open; without it the
 * screen resumes an interrupted opening or opens the next available pack.
 */
export default function TreasuryRoute() {
  const params = useLocalSearchParams<{ grantId?: string }>();
  const router = useRouter();
  const resumable = useResumableOpening();
  const available = useAvailableGrant();
  // Resolved once: the opening must not switch packs while it is on screen.
  const [grantId] = useState(() => params.grantId ?? resumable?.grantId ?? available?.id);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/hall');
  }, [router]);
  const inspect = useCallback((cardId: CardId) => router.push({ pathname: '/card/[cardId]', params: { cardId } }), [router]);
  const story = useCallback((cardId: CardId) => router.push({ pathname: '/card/[cardId]', params: { cardId, panel: 'story' } }), [router]);
  const collection = useCallback(() => router.dismissTo('/collection'), [router]);

  return <TreasuryScreen grantId={grantId} onClose={close} onInspect={inspect} onStory={story} onCollection={collection} />;
}

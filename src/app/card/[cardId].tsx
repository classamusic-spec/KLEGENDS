import { useLocalSearchParams } from 'expo-router';

import { ArtifactChamberScreen } from '@/features/cards/ArtifactChamberScreen';

export default function CardRoute() {
  const { cardId, panel } = useLocalSearchParams<{ cardId: string; panel?: string }>();
  return <ArtifactChamberScreen key={cardId} cardId={cardId} panel={panel === 'story' ? 'story' : undefined} />;
}

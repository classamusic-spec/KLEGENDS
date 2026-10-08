import { useLocalSearchParams } from 'expo-router';

import { QuestScreen } from '@/features/quest/QuestScreen';

export default function QuestRoute() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  return <QuestScreen key={questId} questId={questId} />;
}

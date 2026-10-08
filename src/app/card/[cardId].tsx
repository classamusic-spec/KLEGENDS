import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/ui/AppText';

export default function CardRoute() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <AppText variant="displayM">{cardId}</AppText>
    </View>
  );
}

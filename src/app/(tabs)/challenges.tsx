import { View } from 'react-native';

import { AppText } from '@/ui/AppText';

export default function Screen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <AppText variant="displayM">challenges</AppText>
    </View>
  );
}

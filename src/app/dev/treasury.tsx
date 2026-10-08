import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { colors } from '@/design/tokens';
import { gameService } from '@/state/game';
import { AppText } from '@/ui/AppText';

/** Development shortcut: grants a demo pack and opens it in the treasury. */
export default function DevTreasury() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    gameService.prototype
      .grantDemoPack()
      .then((grant) => router.replace({ pathname: '/treasury', params: { grantId: grant.id } }))
      .catch((e: unknown) => setError(String(e)));
  }, [router]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <AppText variant="caption">{error ?? 'Granting a demo pack…'}</AppText>
    </View>
  );
}

import { useLocalSearchParams } from 'expo-router';
import { Image, View } from 'react-native';

import { catalog } from '@/content';
import { CARD_H, CARD_W, rect } from '@/graphics/card/layout';
import { useIllustration } from '@/graphics/card/textures';

/** Development scene lab: a card's illustration alone, large, without frame or foil. */
export default function SceneLab() {
  const { card = 'ruth-loyal', full } = useLocalSearchParams<{ card?: string; full?: string }>();
  const crop = full === '1' ? rect(0, 0, CARD_W, CARD_H) : undefined;
  const width = 360;
  const uri = useIllustration(card, width * 2, crop);
  const def = catalog.card(card);
  const aspect = crop ? CARD_H / CARD_W : def?.rarity === 'legendary' ? CARD_H / CARD_W : 266 / 270;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      {uri ? <Image testID="scene-image" source={{ uri }} style={{ width, height: width * aspect }} /> : null}
    </View>
  );
}

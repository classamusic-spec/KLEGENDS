import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { CardView } from '@/graphics/card/CardView';

/** Development art lab: one card, drag to tilt, tap Flip to see the back. */
export default function ArtLab() {
  const params = useLocalSearchParams<{ card?: string; u?: string; tx?: string; ty?: string; flip?: string; g?: string; sv?: string }>();
  const cardId = params.card ?? 'david-giant-slayer';
  const Wrapper = (params.sv === '0' ? View : ScrollView) as typeof View;
  const tiltX = useSharedValue(Number(params.tx ?? 0));
  const tiltY = useSharedValue(Number(params.ty ?? 0));
  const rotation = useSharedValue(params.flip === '1' ? Math.PI : 0);
  const [flipped, setFlipped] = useState(params.flip === '1');

  const pan = Gesture.Pan()
    .onChange((e) => {
      tiltX.set(Math.max(-1, Math.min(1, tiltX.get() + e.changeX / 120)));
      tiltY.set(Math.max(-1, Math.min(1, tiltY.get() - e.changeY / 160)));
    })
    .onEnd(() => {
      tiltX.set(withSpring(0));
      tiltY.set(withSpring(0));
    });

  return (
    <Wrapper {...(params.sv === '0' ? { style: { flex: 1, alignItems: 'center', paddingVertical: 24 } } : { contentContainerStyle: { alignItems: 'center', paddingVertical: 24 } })}>
      {params.g === '0' ? (
        <View>
          <CardView cardId={cardId} undiscovered={params.u === '1'} width={300} tiltX={tiltX} tiltY={tiltY} rotation={rotation} quality="balanced" />
        </View>
      ) : (
        <GestureDetector gesture={pan}>
          <View>
            <CardView cardId={cardId} undiscovered={params.u === '1'} width={300} tiltX={tiltX} tiltY={tiltY} rotation={rotation} quality="balanced" />
          </View>
        </GestureDetector>
      )}
      <Pressable
        onPress={() => {
          rotation.set(withTiming(flipped ? 0 : Math.PI, { duration: 600 }));
          setFlipped(!flipped);
        }}
        style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#725A38', borderRadius: 8 }}
      >
        <Text style={{ color: '#E8CB8E' }}>Flip</Text>
      </Pressable>
    </Wrapper>
  );
}

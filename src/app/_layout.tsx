import { useFonts } from 'expo-font';
import { DarkTheme, SplashScreen, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { fontAssets } from '@/design/fonts';
import { colors } from '@/design/tokens';
import { audio } from '@/feedback';
import { initializeGame } from '@/state/game';
import { loadSettings } from '@/state/settings';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.borderSubtle,
    primary: colors.gold,
  },
};

/** Pauses audio while the app is in the background. */
function useAudioLifecycle() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') audio.resume();
      else audio.suspend();
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [booted, setBooted] = useState(false);
  useAudioLifecycle();

  useEffect(() => {
    Promise.allSettled([loadSettings(), initializeGame(), audio.init()]).then(() => setBooted(true));
  }, []);

  const ready = (fontsLoaded || fontError !== null) && booted;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={THEME}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="treasury" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="card/[cardId]" />
          <Stack.Screen name="quest/[questId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="settings" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Web entry. On web, Skia runs through CanvasKit (WASM), and the `Skia` API
// object binds to `global.CanvasKit` when its module is first evaluated.
// Expo Router evaluates route modules lazily (on first render), so rendering
// the root component only after LoadSkiaWeb resolves guarantees every module
// that touches Skia is evaluated after CanvasKit is ready.
// Pattern from the React Native Skia web docs ("deferred component registration").
import '@expo/metro-runtime';

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

LoadSkiaWeb({ locateFile: (file: string) => `/${file}` })
  .then(() => renderRootComponent(App))
  .catch((error: unknown) => {
    const root = document.getElementById('root') ?? document.body;
    root.innerHTML =
      '<p style="color:#E8D8B8;font-family:sans-serif;padding:24px">' +
      'Kingdom Legends could not start its graphics engine in this browser.</p>';
    console.error('[web-entry] Failed to load CanvasKit', error);
  });

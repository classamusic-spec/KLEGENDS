import { Redirect, Stack } from 'expo-router';

/** Development-only tools (art lab, previews). Unreachable in production builds. */
export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

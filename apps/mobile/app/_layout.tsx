// Must be the very first import — polyfills crypto.getRandomValues, which Hermes/React Native
// doesn't provide natively. This file is the app's first-loaded module now that the entry point is
// `expo-router/entry` rather than `index.ts`, so the polyfill moved here with it. `encryption.ts`
// also imports it directly, so this is belt-and-braces rather than the only guard.
import "react-native-get-random-values";

import { Stack } from "expo-router";

// Headers are off globally: every screen already draws its own header, and 1.2.0.4 ports them as-is
// so the text-driven Playwright/Maestro suites keep matching. Turning headers on is a deliberate
// per-route decision later, not a default inherited from the router.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

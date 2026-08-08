// Must be the very first import — polyfills crypto.getRandomValues, which Hermes/React Native
// doesn't provide natively. This file is the app's first-loaded module now that the entry point is
// `expo-router/entry` rather than `index.ts`, so the polyfill moved here with it. `encryption.ts`
// also imports it directly, so this is belt-and-braces rather than the only guard.
import "react-native-get-random-values";

import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppGate } from "../src/components/AppGate";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { PremiumProvider } from "../src/premium/PremiumContext";
import { AppDataProvider } from "../src/state/AppDataContext";
import { ThemeProvider } from "../src/ThemeContext";
import { initAnalytics } from "../src/analyticsClient";
import { initErrorReporting } from "../src/errorReporting";
import { initPurchases } from "../src/premium/purchasesClient";

// Module-scope, so they run exactly once before the first render — same as when they sat at the top
// of App.tsx. They stay side-effecting rather than becoming hooks: error reporting in particular has
// to be armed before any component can throw.
initErrorReporting();
initAnalytics();
initPurchases();

/**
 * The provider stack lives here, ABOVE the `Stack`, so every route sees it. Mounted inside a route
 * instead, sibling routes would each get their own copy of the theme and the premium entitlement —
 * the failure mode where one tab shows a different state than the one beside it.
 *
 * Headers are off globally: every screen already draws its own, and 1.2.0.4 ports them as-is so the
 * text-driven Playwright/Maestro suites keep matching. Turning headers on is a deliberate per-route
 * decision later, not a default inherited from the router.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PremiumProvider>
          <AppDataProvider>
            <ErrorBoundary>
              <AppGate>
                <Stack screenOptions={{ headerShown: false }} />
              </AppGate>
            </ErrorBoundary>
          </AppDataProvider>
        </PremiumProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

# Web E2E tests (Playwright)

End-to-end tests that drive the **Expo-web** build of the app in a real browser. They catch
UI-logic regressions across whole flows (onboarding → dashboard → add entry → tax breakdown) that
the Vitest unit suite can't.

**Scope:** web-renderable React Native code only. Native-only paths — `Alert.alert` dialogs, the
native date picker, biometric lock, share sheets, the IAP sheet — are **not** covered here; those
live in [`../.maestro`](../.maestro) and run on a simulator in CI.

## Run locally

This machine needs the system CA for Expo's TLS, so start the web server yourself and let
Playwright reuse it:

```bash
# terminal 1 — leave running
NODE_OPTIONS=--use-system-ca npm run web

# terminal 2
npm run e2e:install   # one-time: download the Chromium binary
npm run e2e
```

If port 8081 is busy, point Playwright at another port with `E2E_PORT=8083 npm run e2e` (and start
Expo on that port).

## Run in CI

The `web-e2e` Codemagic workflow installs deps, builds the tax-engine, then runs `npm run e2e`.
Playwright starts the web server itself via the `webServer` block in `playwright.config.ts` (no
system-CA flag needed there).

## Selector conventions

Prefer user-facing selectors that survive refactors: `getByPlaceholder`, `getByText`, and
`getByLabel` (react-native-web renders `accessibilityLabel` as `aria-label`). Reach for a `testID`
(rendered as `data-testid`) only when text is ambiguous or absent. See `helpers.ts` for the shared
`resetAppStorage` and `completeOnboarding` helpers.

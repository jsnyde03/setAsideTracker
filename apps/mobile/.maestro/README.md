# Native E2E tests (Maestro)

Maestro flows that drive the **real React Native app on a simulator/device** — the half of the app
the web Playwright suite ([`../e2e`](../e2e)) can't reach: `Alert.alert` dialogs, the native date
picker, and (later) biometric lock, share sheets, and the IAP sheet. These are the long-standing
"needs a real device" items the project has deferred since v0.3; this is the forcing function that
finally puts them under automated coverage.

Flows target the app by bundle id `com.gigtaxtracker.app`.

## Run locally

```bash
# Install Maestro (one-time): https://maestro.mobile.dev
curl -Ls "https://get.maestro.mobile.dev" | bash

# Build & install the app on a booted simulator first (Debug needs Metro running; a Release
# simulator build is self-contained), then:
cd apps/mobile
maestro test .maestro
```

## Run in CI

The `maestro-ios` Codemagic workflow (see `codemagic.yaml`) does this on a mac instance: prebuild →
Release simulator build via `xcodebuild` → `simctl install` → `maestro test .maestro`. A Release
build embeds the JS bundle, so no Metro server is needed during the run.

> **First-run caveat:** like the `ios-testflight` workflow before it, the `maestro-ios` CI workflow
> is expected to need a round of tuning against a real Codemagic mac runner (simulator name/runtime,
> exact build-products path). The flows themselves and the build recipe encode the intended shape;
> treat the first CI run as the validation pass. Selectors that rely on placeholder/label text may
> need a `testID` fallback if Maestro can't see them on the real accessibility tree.

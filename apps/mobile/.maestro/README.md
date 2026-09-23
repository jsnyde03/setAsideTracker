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

**GitHub Actions**, not Codemagic: `.github/workflows/maestro-ios.yml` does prebuild → Release
simulator build via `xcodebuild` → `simctl install` → `maestro test .maestro`. A Release build
embeds the JS bundle, so no Metro server is needed during the run.

```bash
gh workflow run maestro-ios.yml --ref v1.2                      # the whole suite
gh workflow run maestro-ios.yml --ref v1.2 -f flow=demo-mode.yaml   # one flow
```

⚡ **macOS runners are free here because the repo is public** — measured at
`billable.MACOS.total_ms = 0` ([D27], 2026-09-22). Codemagic's `maestro-ios` workflow was retired
the next day; its remaining minutes are reserved for TestFlight alone.

> ⛔ **Never set `centerElement` on a `scrollUntilVisible`.** While it is set the loop accepts only
> a near-centre element for five iterations and reaches the plain visibility check on the sixth —
> and a target in the last screenful cannot be centred, so passing depends on a sixth iteration
> fitting inside the timeout. It reads as three separate bugs: "not visible" on elements that are
> plainly on screen, run-to-run flakiness, and a step that passes four runs then fails a fifth
> untouched. `visibilityPercentage` already defaults to 100.

> ⚠️ **The build dominates each run at ~35 min**, so a single-flow run is barely faster than the
> whole suite. Prefer the full suite unless you are iterating on one thing.

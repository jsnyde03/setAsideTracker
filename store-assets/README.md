# Store assets

Out-of-bundle images for App Store Connect (kept here, not under `apps/mobile/assets`, so they're
never bundled into the app).

- **`iap-review-paywall.png`** — the **In-App Purchase review screenshot** (App Store Connect → each
  subscription product → "Review Information → Screenshot"). Required for Apple to approve the IAP.
  Web-rendered paywall at 1290×2796; shows the Guideline 3.1.2 elements (both prices, Subscribe with
  billed price, auto-renewal disclosure, Terms/Privacy, Restore). Regenerate by driving the Expo-web
  paywall with Playwright. _Attach the same image to both the Annual and Monthly products._

> Note: this is **not** a marketing/store listing screenshot. Per `SCREENSHOT_PLAN.md`, those must be
> captured from the iOS Simulator for pixel-perfect native chrome.

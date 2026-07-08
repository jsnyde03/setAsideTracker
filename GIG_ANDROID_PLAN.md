# Gig (SetAsideTracker) — Android Launch Plan

_Created 2026-07-07. Google Play Console access is complete → **Android is unblocked.** Gig is the portfolio's first Android launch, chosen because it's the proven iOS revenue app, it's Expo/React Native (the **same codebase** builds Android), and the gig-worker audience (delivery, rideshare) skews heavily Android. This is the decomposed, executable plan. Every step is tagged **[JASON]** (you, in an external dashboard — written field-by-field per the executable-how-to rule) or **[CLAUDE]** (I do it in the repo)._

---

## ⚠️ 0. THE TIMELINE GATE — determine this FIRST: personal vs organization account

Everything downstream hinges on one fact about your Play Console account:

| | **Personal account** | **Organization account** |
|---|---|---|
| Closed-testing gate | **≥12 testers, opted-in 14 continuous days**, before you can apply for production | **Exempt** |
| Then | Apply for production access → ~7-day review | Normal review (~days) |
| **Time to live** | **~3 weeks minimum** + you must recruit 12 real testers | **~1 week** |

**[JASON] How to check:** Play Console → **Settings (gear) → Developer account → Account details** — the "Developer account type" field says *Personal* or *Organization*. (Org accounts required D-U-N-S verification to create; if you did that, you're an org.)

**Why it matters:** if personal, we sequence the 14-day closed test to run *in parallel* with everything else so it's not 3 weeks of pure waiting. If org, we can move straight to production. **This is the one thing I need from you before locking the timeline.**

---

## What's already ready (good news)

- **`app.json` android block exists** — package `com.gigtaxtracker.app`, `versionCode: 1`, **adaptive icons already present** (`android-icon-foreground/background/monochrome.png`, bg `#E6F4FE`).
- **`codemagic.yaml` has a documented Android stub** (lines 346–349) — the planned `android-internal-track` workflow was deferred *pending exactly these Play credentials*. Now buildable.
- **Expo SDK 56 targets API 35** — meets Play's new-app requirement (Android 15). _(Verify at first prebuild.)_
- **`STORE_LISTING.md`** (the iOS ASO pass) — most copy adapts directly to the Play listing.
- **Sentry + PostHog** (both anonymous, no PII, no location) — the Data Safety form answers are already known from the iOS App Privacy work.

---

## The sequence

<details><summary><b>1. [JASON] Account type + (if personal) the 12-tester plan</b> — §0 above</summary>

Check the account type. If **personal**, start lining up **12 testers** now (friends/family/gig-worker contacts with Android devices + Google accounts) — they just need to install the closed-testing build and leave it installed for 14 days. This runs in parallel with steps 3–7.
</details>

<details><summary><b>2. [JASON] Google Play Billing — Premium subs + RevenueCat Android</b> (mirrors your iOS RevenueCat setup)</summary>

The Premium subs (Annual $29.99 / Monthly $4.99, entitlement `premium`) exist for Apple; Android needs its own Google Play products + a RevenueCat link:
- **Play Console → your app → Monetize → Products → Subscriptions → Create** — make two base plans matching the iOS product IDs where possible (Play uses one subscription with base plans, e.g. `premium` with `annual` + `monthly` base plans). Prices: $29.99/yr, $4.99/mo.
- **RevenueCat → your project → add a Google Play app** — upload a **Google Play service account JSON** (Play Console → Setup → API access → create/link a service account with "Financial data / Manage orders" permission) so RevenueCat can validate purchases.
- **RevenueCat → attach the Play products to the existing `premium` entitlement / `default` offering**, and copy the **Android SDK (public) key** (`goog_…`) → hand it back to me for `EXPO_PUBLIC_RC_ANDROID_KEY`.
_(This is the Android twin of the iOS `appl_…` key setup you already did.)_
</details>

<details><summary><b>3. [CLAUDE] Codemagic `android-internal-track` workflow</b> — build the AAB + publish to Play</summary>

Following the stub already in `codemagic.yaml`: `npm ci` → build tax-engine → typecheck/tests → `expo prebuild --platform android` → Gradle `bundleRelease` (AAB) → publish to the Play **internal** track via `google_play`. Wire `EXPO_PUBLIC_RC_ANDROID_KEY` + the reused Sentry/PostHog keys. Android builds run on a **Linux** runner (cheaper than the mac iOS builds — [[conserve Codemagic minutes]] still applies but Linux is the light path). I'll gate it to a branch so it doesn't touch master.
</details>

<details><summary><b>4. [JASON] Play App Signing + service-account credentials for CI</b></summary>

- **Play App Signing**: when you create the app / first upload, let **Google generate & hold the app signing key** (recommended) — you keep only an *upload* key. Codemagic needs an **upload keystore** (I'll document generating one, or Codemagic can manage it) + the **Google service account JSON** (from step 2's API access) as a Codemagic secure variable so the workflow can publish.
- Provide the service-account JSON + upload keystore to the Codemagic variable group (secure), same pattern as the `AppleConnect` group.
</details>

<details><summary><b>5. [CLAUDE] Adapt the Play Store listing copy + asset specs</b></summary>

From `STORE_LISTING.md` (iOS), produce the Play variants: **Title (≤30)**, **Short description (≤80)**, **Full description (≤4000)**, and the **feature-graphic spec (1024×500)** + Android screenshot list. Play indexes the short + full description (unlike iOS), so I'll tune keyword placement for Play's algorithm. Written as a paste-ready doc.
</details>

<details><summary><b>6. [JASON] Play Console listing entry</b> (field-by-field how-to I'll write in step 5's doc)</summary>

Play Console → your app → **Grow → Store presence → Main store listing** (title/desc/graphics), **Policy → App content** (content rating questionnaire, **Data safety** form [anonymous diagnostics, no location — from the iOS privacy work], target audience, ads = No, news = No), and **category = Finance**. I'll give exact answers for the Data Safety + content-rating questionnaires.
</details>

<details><summary><b>7. [CLAUDE] Android device-QA checklist</b> — the per-platform pass</summary>

Android native paths differ from iOS — I'll write `ANDROID_QA_CHECKLIST.md` covering: **Google Play Billing** purchase/restore (not StoreKit), the hardware/gesture **back button**, **adaptive icon** on the launcher (masked shapes), **notifications** (Android channels + the payday reminders), **share sheet** + **PDF export** (Android intents), and the financial-accuracy spot-checks. Native-first (the real check is a device/closed-test build).
</details>

<details><summary><b>8. [JASON] Closed testing</b> (if personal account) — the 14-day gate</summary>

Play Console → **Test → Closed testing → create a track** → upload the AAB (from step 3) → add your **≥12 testers** (email list or a Google Group) → share the opt-in link → they install and keep it 14 continuous days. Start this the moment the first AAB builds, so the clock runs while we finish the listing + QA.
</details>

<details><summary><b>9. [JASON] Android device-QA pass</b> — run step 7's checklist on a real Android device (from the closed-test build). Hard gate before production, same as the iOS TestFlight rule.</summary></details>

<details><summary><b>10. [JASON] Production</b> — apply for production access → submit → live</summary>

After the 14-day test (personal) or immediately (org): Play Console → **Production → create release** → submit. First production submission triggers Google's review (~7 days or less).
</details>

---

## Timeline

- **Organization account:** listing + build + QA + review ≈ **1–2 weeks**, most of it parallelizable.
- **Personal account:** the **14-day closed test dominates** — but run it in parallel with the listing/QA so total ≈ **3 weeks**, not additive.

## What I'll start now (parallel with your account-type check)

Steps **3** (Codemagic Android workflow), **5** (Play listing copy), and **7** (Android QA checklist) don't depend on the account type — I can begin those immediately. Step **2** (Play Billing/RevenueCat) is your external setup and gates the paywall on Android, so it's the long pole to start on your side.

**Sources:** [Play closed-testing requirement (12 testers / 14 days)](https://support.google.com/googleplay/android-developer/answer/14151465) · [Target API level requirement (API 35 for new apps)](https://support.google.com/googleplay/android-developer/answer/11926878)

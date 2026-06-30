# Phase B — Manual Setup Checklist (Your To-Do List)

This is **your** punch list for the account/product/dashboard work that Phase B is blocked on.
Claude can write every line of code, but it can't create accounts, App Store Connect products,
or vendor dashboards. Until these exist, there's nothing to write paywall code *against*.

Companion to [PHASE_B_EXECUTION_PLAN.md](PHASE_B_EXECUTION_PLAN.md) (the *how/what-order*).

**How to use this doc:**
1. Work top-to-bottom — the tasks are in dependency order.
2. Each task ends with a **➡️ Hand back to Claude** box listing the exact value(s) to paste
   into our chat. The moment you give Claude those, it can start that step's code.
3. Don't paste anything marked *secret* (auth tokens, API secret keys) into the repo or chat
   unless the instructions say it's safe — Claude will tell you where each value goes.

**Status legend:** ⬜ Not started · 🔄 In progress · ✅ Done

---

## Task 0 — Confirm v1.0 status (gates *merging*, not building)  🔄 IN REVIEW

> ℹ️ This does **not** block building/testing Phase B on the `v1.1` branch. It only blocks
> merging Phase B to `master`. You can do everything below and TestFlight-test it before v1.0
> is live. Just don't let me merge to master until v1.0 is approved.

- [x] v1.0 submitted to App Store review
- [ ] v1.0 **approved and live** ← *in review as of 2026-06-30; tell me when it flips to live*

**➡️ Hand back to Claude:** just tell me the current state ("submitted" / "in review" /
"live as of <date>"). I'll record it in memory so I don't try to merge early.

> **Status: 🔄 In App Store review as of 2026-06-30.** Keep working on `v1.1`; no merge to
> master until this is live.

---

## Task 1 — Sentry (crash reporting)  ✅ DONE & VERIFIED

The code scaffold already exists ([errorReporting.ts](apps/mobile/src/errorReporting.ts)) and
no-ops until a real DSN is set. You're creating the project and handing me three values.

> **Status (2026-06-30):**
> - ✅ **DSN received and wired.** `EXPO_PUBLIC_SENTRY_DSN` committed to
>   [codemagic.yaml](codemagic.yaml) (`ios-testflight` vars). Runtime crash capture is already
>   fully coded (`initErrorReporting()` at App.tsx:36 + `reportError` across every handler and the
>   ErrorBoundary), so the **next TestFlight build will report crashes** — no further code needed
>   for basic crash reporting.
> - ✅ **Source-map upload wired.** Auth token in Codemagic (`AppleConnect` group); the
>   `@sentry/react-native` config plugin in app.json is configured with org `jason-snyder` /
>   project `react-native`; `SENTRY_DISABLE_AUTO_UPLOAD` flipped to `false`. Pre-build check passed
>   (`expo config --type introspect` applies the plugin cleanly; typecheck + 83 tests green).
> - ✅ **Verified on a real build (2026-06-30):** a manual v1.1 Codemagic build proceeded past the
>   "Bundle React Native code and images" phase to IPA creation. Since a source-map upload failure
>   would have failed that phase (Sentry RN 7.11.0 has no allow-failure), reaching IPA == upload
>   succeeded. **Sentry is fully live: crashes reported + stack traces symbolicated.** Task 1 closed.

### Steps
1. [x] Go to **https://sentry.io** → sign up / log in (free "Developer" tier is fine to start).
2. [x] **Create a new project** → platform: **React Native**. Name it e.g. `setasidetracker`.
3. [x] After creation, Sentry shows a **DSN** (looks like
       `https://abc123@o456.ingest.sentry.io/789`). Copy it. *This is safe to be public — it's a
       write-only ingestion endpoint, which is why it lives in a `EXPO_PUBLIC_` env var.*
       ✅ **Done — wired into codemagic.yaml.**
4. [x] Note your **org slug** and **project slug** (visible in the URL:
       `sentry.io/organizations/<ORG-SLUG>/projects/<PROJECT-SLUG>/`).
       ✅ org slug = `jason-snyder`, project slug = `react-native` (received 2026-06-30).
5. [x] Create an **auth token** for source-map upload (org auth token, or a user token with
       `project:releases` + `org:read`). ✅ **Done** — added as a **Secure** `SENTRY_AUTH_TOKEN`
       variable in the Codemagic **`AppleConnect`** group, which the workflow auto-loads. Kept out
       of committed codemagic.yaml (no secret in git). Source-map upload verified on a real build.

### ➡️ Hand back to Claude
| Value | Example | Where it goes |
|---|---|---|
| **DSN** (safe) | `https://abc@o456.ingest.sentry.io/789` | Codemagic env var `EXPO_PUBLIC_SENTRY_DSN` |
| **org slug** (safe) | `jason-snyder` | `app.json` Sentry config plugin |
| **project slug** (safe) | `setasidetracker` | `app.json` Sentry config plugin |
| **auth token** (SECRET) | *do not paste in chat* | Codemagic group `AppleConnect` (or a new group), as `SENTRY_AUTH_TOKEN` |

> ⚠️ **CI caution (this has bitten us before):** I will add the `@sentry/react-native/expo`
> config plugin to `app.json` and flip off `SENTRY_DISABLE_AUTO_UPLOAD` in
> [codemagic.yaml](codemagic.yaml) **only after** the auth token exists in Codemagic. Adding the
> plugin with placeholder/missing creds breaks the iOS archive. We'll re-run a Codemagic build
> immediately after to confirm it's still green.

---

## Task 2 — Analytics vendor  ✅ DONE (PostHog US)

Pick one vendor. The scaffold ([analytics.ts](apps/mobile/src/analytics.ts)) is vendor-agnostic;
only that one file changes when you choose.

**Recommendation: PostHog.** Generous free tier (1M events/mo), first-class Expo support, product
analytics + funnels in one tool (good for the paywall funnel we're about to build). Amplitude is
the fine alternative if you already have an account.

### Steps (PostHog)
1. [x] Go to **https://posthog.com** → sign up (free "Totally free" tier).
2. [x] Pick the **US** or **EU** cloud (EU if you want EU data residency). ✅ **US chosen.**
3. [x] **Project Settings → Project API Key** — copy the key (starts with `phc_...`).
       ✅ Received + wired into codemagic.yaml as `EXPO_PUBLIC_POSTHOG_KEY` (public client key).
4. [x] Note the **host**. ✅ `https://us.i.posthog.com` → `EXPO_PUBLIC_POSTHOG_HOST`.

> **Status (2026-06-30): code complete.** `posthog-react-native@4.53.3` installed (pure-JS, no
> native module/podspec → no autolinking/CI risk; all peer deps optional). Implemented `trackEvent`
> behind the existing facade ([analytics.ts](apps/mobile/src/analytics.ts), kept import-light) with
> the real SDK in a separate native wrapper ([analyticsClient.ts](apps/mobile/src/analyticsClient.ts)),
> `initAnalytics()` wired at App startup. Premium-funnel event names defined now
> (`paywall_viewed` / `purchase_started` / `purchase_completed` / `restore_completed`) for Step 1's
> paywall. Verified: typecheck clean, 88 unit tests (incl. new analytics suite), `expo config`
> introspects, web bundle compiles WITH posthog + app mounts in real Chromium with no page errors,
> and the **full local Playwright e2e suite passes 6/6** (see recipe at the bottom of this doc).
> Live in CI/TestFlight builds only (key unset locally → facade no-ops).

### ➡️ Hand back to Claude
| Value | Example | Where it goes |
|---|---|---|
| **vendor chosen** | "PostHog" | — |
| **project API key** (safe) | `phc_xxx` | Codemagic env var `EXPO_PUBLIC_POSTHOG_KEY` |
| **host** (safe) | `https://us.i.posthog.com` | Codemagic env var `EXPO_PUBLIC_POSTHOG_HOST` |

Once I have these I'll: install the vendor SDK (`expo install`, with a native-build-safety pass
first), implement `trackEvent` behind the existing shim, and add the premium-funnel events the
paywall needs (`paywall_viewed`, `purchase_started`, `purchase_completed`, `restore_completed`).

---

## Task 3 — App Store Connect: the subscription product  ⬜

This is the actual thing users buy. RevenueCat (Task 4) wraps it; it has to exist first.

### Steps
1. [ ] **https://appstoreconnect.apple.com** → **My Apps** → your app → **Subscriptions**
       (under "Monetization" / "In-App Purchases & Subscriptions").
2. [ ] Create a **Subscription Group** (e.g. `Premium`). All your premium tiers live in one group.
3. [ ] **Create an auto-renewing subscription**:
   - [ ] **Reference Name** (internal): e.g. `Premium Annual`
   - [ ] **Product ID**: pick a stable, namespaced ID you won't change, e.g.
         `com.gigtaxtracker.app.premium.annual`. **Write it down exactly** — I hard-code it nowhere,
         but RevenueCat maps to it and I reference the *entitlement*, not this, so accuracy matters at the dashboard.
   - [ ] **Duration**: 1 year (recommended primary) — and optionally also a monthly
         `...premium.monthly` if you want a monthly option.
   - [ ] **Price**: set your tier (you're in the Apple Small Business Program → 15% cut).
4. [ ] Add **localized display name + description** (required, or it stays in "Missing Metadata").
5. [ ] Add a **review screenshot** + notes (Apple requires this to approve the IAP; can be a mock
       of the paywall — I'll generate a paywall screenshot once that screen is built, so you may
       circle back here).
6. [ ] Create a **Sandbox tester account**: **Users and Access → Sandbox → Testers → +**.
       Use an email you control that is **not** a real Apple ID. You'll sign in with this on a
       device to test purchases without being charged.

> The product can sit in "Ready to Submit" / "Missing Metadata" while we build — it does **not**
> need to be approved to test in sandbox. It only needs approval when v1.1 itself goes to review.

### ➡️ Hand back to Claude
| Value | Example | Notes |
|---|---|---|
| **Product ID(s)** | `com.gigtaxtracker.app.premium.annual` | Exact string(s) |
| **Subscription group name** | `Premium` | — |
| **Sandbox tester email** | *you keep this* | You'll use it on-device; I just need to know one exists |

---

## Task 4 — RevenueCat dashboard  ⬜

RevenueCat is the layer the app actually talks to. It maps your App Store product → a named
**entitlement** the code checks. (Bonus: same SDK unifies Google Play later in v1.2.)

> **Do Task 3 first** — you need the Product ID to wire here.

### Steps
1. [ ] **https://app.revenuecat.com** → sign up (free up to $2.5k/mo tracked revenue).
2. [ ] **Create a Project** (e.g. `SetAsideTracker`).
3. [ ] **Add an App** → platform **App Store** → bundle ID **`com.gigtaxtracker.app`**.
   - [ ] RevenueCat will ask for an **App Store Connect App-Specific Shared Secret** *or* an
         **In-App Purchase Key** (.p8). Generate the **In-App Purchase Key** in App Store Connect:
         **Users and Access → Integrations → In-App Purchase** → generate, download the `.p8`,
         note the **Key ID** and **Issuer ID**. Upload to RevenueCat. *The .p8 is a SECRET — it
         goes only into RevenueCat, never the repo/chat.*
4. [ ] **Products**: add the Product ID(s) from Task 3.
5. [ ] **Entitlements**: create one named exactly **`premium`** (lowercase). Attach your product(s)
       to it. *This is the string my `usePremium()` gate checks — keep it `premium`.*
6. [ ] **Offerings**: create the default offering (call it `default`) and add a package pointing at
       your product(s). The paywall reads the offering to display prices.
7. [ ] **API Keys**: **Project Settings → API Keys** → copy the **Apple/Public SDK key**
       (starts with `appl_...`). *Safe to embed in the client — goes in `EXPO_PUBLIC_RC_IOS_KEY`.*

### ➡️ Hand back to Claude
| Value | Example | Where it goes |
|---|---|---|
| **RevenueCat public Apple SDK key** (safe) | `appl_xxx` | Codemagic env var `EXPO_PUBLIC_RC_IOS_KEY` |
| **entitlement identifier** | `premium` | confirm you named it exactly this |
| **offering identifier** | `default` | confirm |

---

## Task 5 — Tell Claude when you're ready for each step

You don't have to finish all of this at once. The work splits cleanly:

- **Finish Tasks 1 + 2** → I build **Step 0 (observability)**: wire Sentry + analytics for real,
  add funnel events, unit-test the call sites. Small, fast, unblocks confident decisions.
- **Finish Tasks 3 + 4** → I build **Step 1 (the IAP spine)**: install `react-native-purchases`,
  the `usePremium()` gate (with offline-cached entitlement), the Paywall screen, and
  restore-purchases. This gates every paid feature.
- After that, the premium features flow in dependency order (PDF + Schedule C → mileage fields →
  custom categories → W-4 optimizer → safe-harbor → year-over-year), each behind `usePremium()`.

> Some surfaces I **cannot** verify in a browser and will hand back to you for a real-device pass:
> the actual purchase → unlock → restore loop (sandbox account + TestFlight) and PDF/native share.
> I'll author Maestro flows for these and flag exactly what needs your eyes on a device.

---

## Quick reference — every value you'll hand back

| # | Value | Secret? | Destination |
|---|---|---|---|
| 1 | Sentry DSN | no | Codemagic `EXPO_PUBLIC_SENTRY_DSN` |
| 1 | Sentry org + project slug | no | `app.json` plugin |
| 1 | Sentry auth token | **yes** | Codemagic group (you add it) |
| 2 | Analytics vendor + project key + host | no | Codemagic `EXPO_PUBLIC_POSTHOG_*` |
| 3 | App Store product ID(s) | no | RevenueCat dashboard (you) |
| 3 | Sandbox tester email | keep private | on-device testing (you) |
| 4 | RevenueCat public SDK key | no | Codemagic `EXPO_PUBLIC_RC_IOS_KEY` |
| 4 | entitlement id (`premium`) + offering id (`default`) | no | confirm to Claude |
| 3/4 | In-App Purchase `.p8` key | **yes** | RevenueCat only |

---

## Appendix — running the Playwright e2e locally (verification recipe)

Playwright works fine on this Windows machine; the trick is **don't collide with your own
running Expo server on :8081**, and make sure the web server is fully up before the runner hits it.

```bash
cd apps/mobile

# 1. Start a DEDICATED web server on 8090 (leaves your :8081 dev server alone). System CA is
#    required for Expo's TLS on this machine. Leave it running in another terminal.
NODE_OPTIONS=--use-system-ca npx expo start --web --port 8090

# 2. Wait until it actually responds (first compile is slow), then run the suite against it:
E2E_PORT=8090 npx playwright test --config e2e/playwright.config.ts
```

- The config has `reuseExistingServer: true`, so it attaches to the 8090 server you started rather
  than spawning its own.
- If a competing/stale server gets in the way, just kill it (you confirmed you won't be using your
  own dev server while we work) — but a flaky run is usually a not-yet-finished first compile, so
  poll `curl localhost:8090` for a 200 before running the suite.
- In CI, the `web-e2e` Codemagic workflow starts and stops the server itself on Linux — no recipe
  needed there.
- Earlier "worker exited / spawn UNKNOWN" errors were transient (a broad node kill mid-run + a
  competing server), not a real tooling problem. Verified 6/6 specs green with the recipe above.

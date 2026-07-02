# App Store Connect — v1.1 submission walkthrough (tap-by-tap)

**Created 2026-07-01.** The exact click-path to submit **v1.1.0** for App Store review, with the Premium
IAP subscriptions attached for their first review. All field *values* live in
[STORE_LISTING.md](STORE_LISTING.md) — this doc is the *order of operations* + the easy-to-miss toggles
(License Agreement, App Privacy answers, export compliance, IDFA). Companion to
[MASTER_PLAN §9 item 1](../app-portfolio/MASTER_PLAN.md) (steps 1.3–1.6).

**Legend:** ☐ = do it · ⚠️ = common rejection / easy-to-miss.

---

## Phase 0 — Pre-submit gates (must all be green first)

- [x] **Live privacy policy updated + verified** (Sentry/PostHog described as active/anonymous) — done 2026-07-01.
- [ ] ⚠️ **PostHog → disable IP data capture** (Settings → Project → Privacy). This is what keeps the "no Location" App Privacy answer truthful. Do this before answering the questionnaire in Phase 3.
- [ ] **Screenshots finalized** — 6.9" **1320 × 2868**, no alpha, value-led order, AppScreens overlays using the per-shot Title/Subtitle from [SCREENSHOT_PLAN.md](SCREENSHOT_PLAN.md).
- [ ] **v1.1.0 build available in ASC** (Phase 1).

## Phase 1 — Get the 1.1.0 build into App Store Connect  _(plan steps 1.3–1.4)_

You already have a **QA-passed 1.1.0 build in TestFlight** — you can submit that exact build (no rebuild), or ship a fresh one from `master`. Recommended: **reuse the TestFlight build** to save a CI run.

- [ ] **Git ship** (only if you want a fresh build, or to get `master` current): push `v1.1` → `origin`, merge `v1.1` → `master`, push `master`. ⚠️ Pushing `master` auto-triggers CI (one build) — that's the intended single build. _(Tell Claude "go" and it'll do the push/merge.)_
- [ ] Confirm the **1.1.0 build** shows under the app's **TestFlight / Builds** with status "Ready to Submit" (processed, export-compliance answered — see Phase 4).

## Phase 2 — App-level info  _(App Store Connect → your app → General → App Information)_

- [ ] **Name:** `SetAsideTracker: Gig Taxes`  ⚠️ this Name change is only possible now that v1.0 is **approved/live** (can't rename while a version is *in review*).
- [ ] **Subtitle:** `Quarterly 1099 tax calculator`
- [ ] **Primary category:** Finance · **Secondary:** Utilities (optional)
- [ ] ⚠️ **License Agreement:** set to **Standard Apple License Agreement (EULA)** (App Information → License Agreement). Pairs with the EULA link now in the description.
- [ ] **Privacy Policy URL:** `https://jsnyde03.github.io/Set_Aside_Tracker/privacy.html`

## Phase 3 — App Privacy  _(General → App Privacy → Edit)_

Answer the questionnaire to match [STORE_LISTING.md → App Privacy table](STORE_LISTING.md). Everything is **anonymous / Not Linked to the user / not used for tracking**:

- [ ] **Crash Data** (Diagnostics) — collected · Not Linked · not for tracking · purpose App Functionality + Analytics _(Sentry)_
- [ ] **Performance Data** (Diagnostics) — collected · Not Linked · not for tracking · App Functionality + Analytics _(Sentry traces)_
- [ ] **Product Interaction** (Usage Data) — collected · Not Linked · not for tracking · Analytics _(PostHog events)_
- [ ] **Device ID** (Identifiers) — collected · Not Linked · not for tracking · Analytics _(PostHog anonymous id)_
- [ ] ⚠️ **Location — answer NO** (only valid because PostHog IP capture is disabled — Phase 0). Everything else (Contact Info, Financial Info, User Content, Health, Contacts, Browsing, Search, Purchases, etc.) = **No** — that data never leaves the device.
- [ ] **App Tracking Transparency:** none — the app does **not** track across other companies' apps/sites, no ad SDKs → no ATT prompt.

## Phase 4 — Create the 1.1.0 version + fill metadata  _(left sidebar → “+ Version or Platform” → iOS)_

- [ ] Create version string **1.1.0**.
- [ ] **Promotional Text** — paste from STORE_LISTING (161 chars; editable anytime without review).
- [ ] **Description** — paste from STORE_LISTING. ⚠️ Confirm the **Terms of Use (EULA) + Privacy Policy URLs are at the very end** (3.1.2 metadata requirement — they're already in the STORE_LISTING description block).
- [ ] **Keywords** — `estimated,selfemployed,mileage,expense,deduction,rideshare,delivery,freelance,contractor,sidehustle` (no spaces, 99/100).
- [ ] **What's New in This Version** — paste the v1.1 block from STORE_LISTING / [RELEASE_NOTES.md](RELEASE_NOTES.md).
- [ ] **Support URL:** `https://jsnyde03.github.io/Set_Aside_Tracker/support.html`
- [ ] **Screenshots:** upload the 6.9" set (1320×2868) in value-led order.
- [ ] **Build:** select the **1.1.0** build (from Phase 1).
- [ ] **Age rating:** run the questionnaire → should land **4+** (no objectionable content, no gambling, no unrestricted web, no UGC).
- [ ] **App Review Information → Notes:** paste the **Reviewer Notes block** from [STORE_LISTING.md → App Review notes](STORE_LISTING.md) verbatim (what it does · no login/no demo account · exact taps to open the paywall + test the subscription · what Premium unlocks · privacy). No demo account needed.
- [ ] ⚠️ **Contact email/phone** for the review team (App Review Information) — use `setasidetrackersupport@gmail.com`.

## Phase 5 — Attach the IAP subscriptions for first review  ⚠️

First-time auto-renewable subscriptions **must be submitted with an app version** or review can stall.

- [ ] In **Monetization → Subscriptions**, confirm both are **Ready to Submit** with a localized **display name + description**:
  - `com.gigtaxtracker.app.premium.annual` — $29.99/yr
  - `com.gigtaxtracker.app.premium.monthly` — $4.99/mo
  - (group **Premium**, entitlement `premium`, offering `default`)
- [ ] ⚠️ Each subscription needs a **review screenshot** of the paywall — use `store-assets/iap-review-paywall.png`.
- [ ] On the **1.1.0 version page → In-App Purchases and Subscriptions**, **add/attach both subscriptions** to this version so they review together with the app.

## Phase 6 — Submit  _(version page → Add for Review → Submit)_

- [ ] ⚠️ **Export compliance:** the app uses only standard/HTTPS encryption → **exempt** (answer "No" to "uses non-exempt encryption", or rely on `ITSAppUsesNonExemptEncryption=false` if set in the build). 
- [ ] ⚠️ **Advertising Identifier (IDFA):** **No** — the app does not use the IDFA (no ads, no tracking).
- [ ] **Content rights:** you own or are licensed for all content → Yes.
- [ ] **Submit for Review.**

## Phase 7 — Post-submit  _(plan step 1.6)_

- [ ] On **approval**, Premium goes live automatically (the subs approve with the version).
- [ ] Flip status to "v1.1 submitted → live": [RELEASE_NOTES.md](RELEASE_NOTES.md), MASTER_PLAN §9 (move item 1 to the Completed log), and the live-state memory.
- [ ] Resume **Debt v1.5 (step 2.13→)** during the review wait _(context-switch rule: external-wait build work)_.

---

### Quick reference — where each value lives
- **All copy/metadata values:** [STORE_LISTING.md](STORE_LISTING.md)
- **Screenshot order + overlay captions:** [SCREENSHOT_PLAN.md](SCREENSHOT_PLAN.md)
- **What's New:** [RELEASE_NOTES.md](RELEASE_NOTES.md)
- **Guideline 3.1.2 compliance sign-off:** [STORE_LISTING.md → compliance section](STORE_LISTING.md)

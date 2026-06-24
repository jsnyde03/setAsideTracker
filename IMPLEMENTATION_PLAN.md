# Gig Tax Tracker — Implementation Plan by Version

Companion to [ROADMAP.md](ROADMAP.md). The roadmap covers *what* and *why*; this breaks it into shippable versions — each one is a real, usable milestone (internal, beta, or public), not just a sprint boundary. Versions follow `major.minor`: major bumps = new monetization tier or major capability shift (AI layer, etc.); minor bumps = a coherent batch of features shippable on its own.

**Status legend:** ✅ Done · 🔄 In Progress · ⬜ Not Started

---

## ✅ v0.1 — Tax Engine Proof of Concept (internal only)
**Status: Done** — `services/tax-engine/`
**Goal:** prove the core math is right before building anything else on top of it.
- [x] Standalone tax-engine package: SE tax, federal bracket calc, standard mileage deduction
- [x] Versioned tax-year config — shipped with **2025** rates initially, then **2026** added once official IRS Rev. Proc. 2025-32 (brackets/standard deduction), Notice 2026-10 (mileage rate: $0.725/mi), and the SSA 2026 COLA fact sheet (SS wage base: $184,500) were confirmed. `currentTaxYear` now points at the 2026 config; `taxYear2025` stays available for historical accuracy. per [ROADMAP §2.2](ROADMAP.md)
- [x] Unit tests against hand-verified IRS-style scenarios for **both** 2025 and 2026 configs (single filer, multiple income levels including SS wage base cap + Additional Medicare Tax threshold) — 18 tests passing
- [x] No UI — test harness only, via Vitest
**Ships to:** you/dev team only. **Exit criteria:** ✅ met — tax engine outputs match hand-calculated IRS examples exactly for both tax years.

## ✅ v0.2 — Manual Entry + Dashboard (internal alpha)
**Status: Done** — `apps/mobile/` (Expo/React Native + TypeScript)
**Goal:** the core daily-use loop works end to end on a device.
- [x] Auth — **stubbed as a local profile** (name/email, no password, stored on-device via AsyncStorage). Real Apple/Google OAuth deferred until Apple Developer/Google Cloud credentials are available — by design, see decision log below.
- [x] Manual entry flow: platform (Amazon Flex/Spark/DoorDash/Uber/Instacart/Other), date, gross pay, tips, mileage
- [x] Single dashboard: total earnings, estimated tax owed ("set aside for taxes"), entry list
- [x] Tax profile onboarding wizard (filing status, dependents, W2 job y/n + estimated W2 income, state)
- [x] All data local-only (AsyncStorage) — no backend yet, per decision log below
- [x] Calculation glue layer (`src/calculations.ts`) aggregates entries and calls the tax-engine package directly as a workspace dependency
- [x] Unit tests for the aggregation/engine-wiring logic (5 tests) + full type-check clean
- [x] **Browser dev mode confirmed working** — `npm run web` (`expo start --web`) boots Metro, serves the app at `localhost:8081`, and the full bundle compiles clean (verified by fetching the actual bundle and dev server response). Added `react-dom` + `react-native-web` for this.
**Ships to:** internal device testing / friends & family (via Expo Go on a phone, or browser dev mode for fast iteration — see below). **Exit criteria:** core loop (onboard → log entry → see dashboard update) works end to end; verified via web bundle compile, not yet click-tested in an actual browser window or on a physical device — that's the next concrete step.

**Decision log (confirmed with you before building):**
- Auth: local stub now, real OAuth later once credentials exist
- Backend: local-only for this alpha; server-side sync is in scope for v0.3's offline-first work, not before

**Dev workflow note:** run `npm run web` from `apps/mobile/` for fast iteration in a browser — no TestFlight/device build needed for day-to-day UI changes. Reserve actual device builds (Expo Go, or eventually TestFlight) for verifying things browser dev mode can't catch: native-only APIs, real touch/gesture behavior, and final pre-release sign-off. AsyncStorage works in the browser too (backed by IndexedDB), so local data persistence behaves the same way there.

**Bug fixed during verification:** browser mode initially loaded a blank white page with no visible error. Root cause was a `react`/`react-dom` version mismatch (19.2.3 vs 19.2.0) — React 19 fails hard on any mismatch and React Native Web's error overlay doesn't always surface it clearly. Found it by loading the page in a headless browser and reading the actual console/page error rather than guessing. Fixed by pinning `react-dom` to the exact same version as `react` (`"19.2.3"`, no `^` range) so they can't drift apart again on a future `npm install`.

## ✅ v0.3 — Closed Beta (expenses + reminders)
**Status: Done** — all planned items shipped; see exit-criteria caveat below before calling this fully verified.
**Goal:** feature-complete enough for a small group of real gig workers to rely on.
- [x] **State tax module** for 6 states — `services/tax-engine/src/stateTax.ts` + `src/stateTaxConfigs/2026.ts`. Covers all three structural types a state tax system can take: no income tax (**TX, FL**), flat rate (**PA**, 3.07%), and progressive brackets (**CA, NY, MD**). Wired into `estimateTax`/`TaxEstimateResult` (new `stateTax` field) and the mobile dashboard, which now shows a SE/federal/state breakdown and a red warning banner if the user's state isn't in the supported list yet (never silently treats an unsupported state as $0 tax owed without flagging it). 14 new tests (8 in tax-engine, 4 in mobile glue layer, plus updated existing tests) — all passing.
  - **Confidence varies by state** — flagged explicitly in code comments: TX/FL are stable by definition; PA is high-confidence (unchanged since 2004); CA 2026 brackets are FTB-based projections (FTB hadn't published final certified 2026 figures at build time); NY 2026 figures are **provisional** (sources disagreed on the lowest five brackets after NY's FY2026 budget cut); MD is high-confidence (sourced from actual statute text).
  - 2025 config only backfills TX/FL/PA (the stable ones); CA/NY/MD under the 2025 tax year will report as unsupported until backfilled.
- [x] **MD county "piggyback" local tax** — `services/tax-engine/src/stateTaxConfigs/mdLocalTax2026.ts`. Models all 23 MD counties + Baltimore City + the flat 2.25% nonresident rate, including the two counties (Anne Arundel, Frederick) with graduated/tiered rate structures instead of a flat rate (reuses the same bracket math as state/federal). `StateTaxResult` now exposes `stateLevelTax`, `localTax`, `county`, and `localTaxSupported` separately (with `stateTax` remaining the combined total, so existing total-tax math wasn't disrupted). The dashboard shows a separate "{county} local tax" line and a distinct red warning if MD is selected but no recognized county is set — never silently drops the local tax to $0 without flagging it. Onboarding now shows a county picker (24 buttons) automatically whenever the selected state has a local tax layer, generic to any future state, not hardcoded to MD. 9 new tests added (5 tax-engine, 4 mobile), full suite green (31 tax-engine + 11 mobile), and the picker flow was verified end-to-end in a real browser session (state→county picker appears, selection persists through onboarding, dashboard shows the correct breakdown line).
  - **Confidence:** moderate — sourced from a third-party aggregator (countrytaxcalc.com), cross-checked against a Tax Foundation summary for the overall rate range and the two 2026 rate increases (Allegany, Kent), but not yet directly verified against the official Comptroller/DLS PDF tables. Flagged in code comments; verify before relying on for real filings.
  - **Known nuance:** the rate that applies is based on county of *residence*, not where the work happens — the onboarding copy says so, but there's nothing stopping a user from picking the wrong one.
- [x] **Expense tracking beyond mileage** (parking, tolls, supplies, phone business-use portion) — `Entry.expenses` in `apps/mobile/src/types.ts`, subtracted from net SE profit in `aggregateEntries` (`calculations.ts`). Mileage stays handled separately via the standard mileage rate, not as a dollar expense, since the tax engine already deducts it at the IRS rate. AddEntryScreen has a collapsed-by-default "+ Add expenses" toggle (most entries won't have any) revealing 4 fields; Dashboard shows an "Expenses logged" line and a per-entry expense note in red. 3 new tests, full suite green (13 mobile tests), verified end-to-end in a real browser session (entered $5/$3/$12/$8 across the 4 categories, confirmed the $28 total, lower tax estimate, and per-entry note all appeared correctly).
  - Note: "phone %" from the original plan language became a manual per-entry dollar amount (the business-use portion you attribute to that shift) rather than an automatic monthly-bill-times-percentage calculation — simpler for this alpha, revisit if testers want the automatic version.
- [x] Multi-platform tracking (manually tagged entries) — *already shipped in v0.2*, carrying forward as satisfied
- [x] **Quarterly estimated-tax due-date push reminders** — `apps/mobile/src/notifications/quarterlyDueDates.ts` (pure due-date math, 4 tests) + `scheduleReminders.ts` (expo-notifications wiring). Schedules a "heads up" notification 7 days before each of the next 4 quarterly due dates, plus one on the due date itself; idempotent (cancels and reschedules each call), called after onboarding completes and on every cold start that lands on the dashboard. No-ops cleanly on web (expo-notifications doesn't support reliable scheduled delivery in a browser tab) — verified via browser smoke test that this doesn't throw or block the UI.
  - **Known simplification:** due dates use the fixed Apr 15/Jun 15/Sep 15/Jan 15 rule, not adjusted for weekends/federal holidays (the IRS shifts the actual deadline to the next business day in that case). Fine for a "don't forget" nudge a few days early; don't treat the exact date as authoritative.
  - **Not verified by automated testing:** actual on-device notification delivery at a future scheduled time can't be confirmed without waiting days/months for a real due date to arrive. What's verified: the due-date math (tests) and that scheduling calls complete without error in the live API shape (confirmed against the real Expo v56 docs, since SDK 56's notification trigger API differs from older versions). Real delivery needs confirming on an actual device/Expo Go on your end.
- [x] **Basic security: biometric/PIN lock + encryption at rest** ([ROADMAP §8.2](ROADMAP.md)) — `apps/mobile/src/security/appLock.ts` + `LockScreen.tsx`, and `apps/mobile/src/storage/encryption.ts` + `cryptoCore.ts`.
  - **App lock:** Face ID/Touch ID/fingerprint via `expo-local-authentication`, with the OS's own device-passcode fallback after failed biometric attempts — this satisfies "PIN lock" without a custom in-app PIN screen, since `disableDeviceFallback` defaults to false. Locks on cold start and re-locks whenever the app returns from the background. Skips locking entirely on web or on a device with no biometrics/passcode enrolled (no native support there, and there's no security feature to enforce if the user has none set up) — verified via browser smoke test that web goes straight to onboarding/dashboard with no lock screen.
  - **Encryption at rest:** AES encryption (crypto-js) of the AsyncStorage JSON blobs, using a random 256-bit key generated once and stored in SecureStore (iOS Keychain / Android Keystore). Pure encrypt/decrypt functions split into `cryptoCore.ts` specifically so they're unit-testable without pulling in React Native's Flow-typed source (which broke Vitest's parser when crypto and key-management lived in one file) — 3 tests covering round-trip correctness, IV/salt randomness, and wrong-key failure. No-ops to plaintext on web (expo-secure-store has no web implementation) and includes a defensive fallback to read old plaintext data written before this change, so existing local test data isn't lost.
  - **Honest caveat:** this is software-level encryption with a hardware-backed key — real protection against casual disk/backup inspection, but not a substitute for an actual security audit before handling production-grade financial data at scale (same caveat the roadmap already flags for anything touching financial data).
  - **Not verified by automated testing:** real Face ID/Touch ID prompts can't be triggered headlessly. Face ID specifically does not work inside Expo Go — needs a development build to test on iOS.
**Ships to:** 20–50 closed beta testers (recruit from gig-worker subreddits/FB groups). **Exit criteria:** beta users keep using it past week 2 without prompting. **Before recruiting beta testers:** verify notification delivery and biometric unlock on a real device — both are flagged above as unverifiable by automated testing alone.

## 🔄 v1.0 — Public Launch (Free Tier)
**Status: In Progress**
**Goal:** first public release; free tier ships exactly as scoped, no more, no less.
- [x] **Mobile polish / premium visual pass** — `apps/mobile/src/theme.ts` (color/spacing/radius/typography/shadow tokens) + shared components (`PrimaryButton`, `Chip`, `TextField`, `Screen`) in `apps/mobile/src/components/`. All four screens (Onboarding, Dashboard, AddEntry, LockScreen) restyled on the shared token set instead of inline ad-hoc styles.
  - Safe-area handling via `react-native-safe-area-context` (`SafeAreaProvider` in `App.tsx`, `Screen` wraps every screen) — previously content could sit under the notch/status bar on real devices.
  - `KeyboardAvoidingView` added to Onboarding and AddEntry forms — previously the keyboard could cover input fields on-device.
  - `@expo/vector-icons` (Ionicons) replace plain text glyphs (`+`, `−`) throughout; per-platform icons on dashboard entry rows.
  - Dark gradient (`expo-linear-gradient`) "set aside for taxes" card for a premium fintech feel, replacing the flat tan card.
  - Light haptic feedback (`expo-haptics`) on primary button presses and chip selection — no-ops safely on web.
  - Subtle entrance fade/slide transition per screen via `Animated` — **gated to native only** (`Platform.OS !== "web"`) after discovering `useNativeDriver` animations can stall mid-transition on react-native-web (backgrounded/headless tabs throttle `requestAnimationFrame`), which left screens permanently semi-transparent. Caught via Playwright screenshot verification, not by eyeballing the dev server.
  - Verified end-to-end in a real browser session via Playwright: onboarding → dashboard → add entry → save, with a real DoorDash entry, confirming totals/tax breakdown/icons all render correctly with zero console errors. Full typecheck + 19 mobile tests still green after the change.
  - **Not yet verified:** real on-device feel (haptics, biometric-gated lock screen styling, actual notch/safe-area behavior) — browser/web verification only so far, per the project's existing browser-first dev workflow.
- [ ] **📍 Expand state tax coverage from 6 states to all 50 states + DC.** Right now `services/tax-engine/src/stateTaxConfigs/2026.ts` only covers CA, FL, MD, NY, PA, TX — every other state shows the dashboard's red "not supported, $0 state tax" warning. That's the large majority of the US population, which undercuts the free tier's core promise ("know what to set aside") for most users on day one. The architecture is already pluggable (`type: "none" | "flat" | "bracket"`, per [ROADMAP §2.2](ROADMAP.md)), so this is research-and-data-entry work, not a redesign — but it's real per-state research, not a quick pass. Breaking it down by effort:
  - **No-income-tax states (trivial, same `"none"` type already used for TX/FL):** AK, NV, SD, TN, WA, WY, NH (NH fully repealed its interest/dividends tax in 2025, so it's effectively wage-tax-free now too) — 7 states, near-zero effort each.
  - **Flat-rate states (easy, same `"flat"` type already used for PA):** roughly AZ, CO, GA, IL, IN, KY, MI, NC, UT, and others — verify each state's current rate, since several (e.g. GA) have been transitioning toward flat rates recently and the exact current rate/year matters.
  - **Progressive-bracket states (the real work, same `"bracket"` type already used for CA/MD/NY):** the remaining ~25 states + DC — each needs actual bracket/standard-deduction data sourced and confidence-flagged the way CA/NY/MD already are in the v0.3 notes above (some sources will disagree, especially for any state mid-legislative-change).
  - **Known follow-on complexity, separate from this item:** several states have *local/municipal* income tax beyond the state level — not just MD's county piggyback tax already modeled, but e.g. Pennsylvania's local Earned Income Tax (most PA municipalities), Ohio's near-universal municipal income tax (RITA/CCA), and New York City's city income tax. PA and NY are already "supported" at the state level today but are **silently missing this local layer** — worth a follow-up audit once the 50-state pass is underway, using the same "never silently show $0 without a warning" pattern already established for MD county tax.
  - Recommend treating this as an ongoing fast-follow alongside or immediately after the rest of v1.0 rather than a hard launch blocker — but it should be prioritized high given how directly it affects the app's core value prop for most of the US.
- [x] **🔴 Critical: entries are never scoped to a tax year — FIXED.** `services/tax-engine/src/index.ts` now exports `taxYearConfigs: Record<number, TaxYearConfig>` alongside the existing `currentTaxYear`. `apps/mobile/src/calculations.ts`'s `computeTaxEstimate(entries, taxProfile, year = currentCalendarYear)` filters entries to that calendar year via a new `entriesForYear()` helper before aggregating, and looks up the matching config from `taxYearConfigs[year]` instead of always using the global `currentTaxYear` — falling back to `currentTaxYear` (with a `usedFallbackConfig` flag) only if no config exists yet for the requested year. `DashboardScreen` now scopes its headline "Total earnings logged" and "Set aside for taxes" numbers to that same year, shows a `{year}` badge next to "Your earnings" so the scoping is visible, and shows a red warning banner if `usedFallbackConfig` is true (next year's rates aren't published yet). The "Recent entries" list intentionally still shows full history (it's a log, not a calculation) — only the headline numbers are year-scoped.
  - 6 new tests added to `calculations.test.ts` (year-exclusion, fallback-config flagging, `entriesForYear`/`yearsWithEntries` helpers) — full suite green (25 mobile + 31 tax-engine tests).
  - Verified end-to-end in a real browser session: logged a 2026 DoorDash entry ($120) and a 2020 Uber entry ($99,999) — the dashboard's totals/tax estimate stayed at $120/$16.96 (2026-only), while "Recent entries" correctly showed both, confirming the prior-year entry doesn't leak into the current year's math.
  - **Known follow-up, not done here:** there's still no UI to *view* a prior year's totals (e.g. switch the dashboard to 2025) — it only ever shows the current calendar year. That's the "selectable tax year" half of the original gap description; tracked as a smaller fast-follow, not blocking, since the correctness bug (mixing years together) is what's fixed.
- [ ] **Quarterly due dates aren't shown anywhere in the UI.** `getUpcomingQuarterlyDueDates()` (`apps/mobile/src/notifications/quarterlyDueDates.ts`) only feeds the push-notification scheduler — the dashboard never surfaces "next estimated payment due [date]," even though that's the natural companion to the "set aside" number it already shows.
- [ ] **No tracking of estimated payments already made, and no "catch-up" plan for users who fall behind.** The set-aside number is always "total tax owed so far this year," with no way to mark a quarterly payment as paid and see what's still outstanding — without it, the number gets less useful as the year goes on (a diligent user who already paid Q1 sees the same growing total as someone who hasn't paid anything). This naturally extends into a **catch-up calculator**: let the user self-report how much they've actually set aside so far (the app can't see a real savings account, so this has to be self-reported — a single running "amount set aside" number is enough for v1, not a full ledger); compare it against the computed total owed; if there's a gap, use the already-built `getUpcomingQuarterlyDueDates()` to show "you're $X behind — set aside an extra $Y/week until [next due date] to catch up" instead of just a scary lump-sum number. This is the single most requested-feeling gap for anyone who hasn't been diligent for a few weeks or months — reassurance + a concrete plan, not just a bigger number. Per [ROADMAP §9.2](ROADMAP.md).
- [x] **`dependents` is collected during onboarding but never used in any tax calculation — FIXED, by implementing real Child Tax Credit support.** New `services/tax-engine/src/childTaxCredit.ts`: nonrefundable credit ($2,200/child for 2025/2026 per the OBBBA-set permanent figure) applied against federal income tax first, plus a refundable Additional Child Tax Credit (capped at $1,700/child and at 15% of earned income over $2,500) that can offset total tax owed — including SE tax — even when income tax liability is already zero, which is the scenario that matters most for lower-income gig workers. Basic high-income phase-out included ($200k single/$400k MFJ, −$50 per $1,000 over). `TaxYearConfig` gained a `childTaxCredit` config block (added to both `taxYear2025` and `taxYear2026`); `TaxEstimateInput` gained optional `numberOfChildren` (defaults to 0, so omitting it is a no-op — existing callers unaffected); `TaxEstimateResult` gained a `childTaxCredit` field. `apps/mobile/src/calculations.ts` now passes `taxProfile.dependents` through as `numberOfChildren`, and the dashboard shows a green "Child Tax Credit (N) −$X" breakdown line whenever it's nonzero.
  - **Known simplification, flagged in code:** every declared dependent is treated as a CTC-qualifying child under 17 — the real IRS rules give non-qualifying dependents (e.g. an elderly parent) only the smaller, separate $500 Credit for Other Dependents, which isn't modeled.
  - **Confidence:** phase-out mechanics and the refundable cap are carried forward from pre-OBBBA/2025 figures into the 2026 config since the IRS hadn't published the 2026 inflation-indexed amount at build time — flagged in code comments the same way the provisional NY brackets already are; verify before relying on for real filings.
  - 9 new tax-engine tests (6 unit tests on the pure `calculateChildTaxCredit` function covering zero-children, full nonrefundable absorption, refundable-capped-by-per-child-cap, refundable-capped-by-earned-income, full phase-out, and partial phase-out; 3 integration tests on `estimateTax` confirming SE tax is never reduced by the credit, the credit nets correctly into `totalEstimatedTax`, and the refundable case floors at zero) — full suite green (40 tax-engine tests). 1 new mobile regression test confirming `dependents` now actually changes the estimate (the original bug) — full suite green (26 mobile tests).
  - Verified end-to-end in a real browser session: onboarded with 2 dependents and an $80,000 entry, dashboard showed "Child Tax Credit (2) −$4,400.00" and the total matched hand-checked arithmetic (SE tax + federal income tax − credit + state tax) exactly.
  - **Not in scope here:** state-level dependent exemptions/credits (most states use a different mechanism than the federal CTC) — left for the existing 50-state-coverage work, not duplicated as a separate item.
- [x] **Default entry date uses UTC, not local time — FIXED.** `todayIsoDate()` in `AddEntryScreen.tsx` now builds the default from local `getFullYear()`/`getMonth()`/`getDate()` instead of `toISOString().slice(0, 10)`. Verified analytically (a fixed UTC instant that's still "yesterday" in `America/New_York` now correctly resolves to yesterday's local date instead of today's UTC date) and in a live browser session (default field matched the browser's own locally-reported date). While investigating, also fixed a related **flaky test** in `encryption.test.ts`: `decryptText` with a wrong key can legitimately throw (CryptoJS's UTF-8 decode fails on most, but not all, random garbage byte sequences) rather than reliably returning a string — the test now accepts either outcome, since the actual invariant is "never recovers the original plaintext," not "always returns a string." No code in `cryptoCore.ts` itself changed.
- [x] **Edit/delete logged entries — FIXED.** New `updateEntry()` in `apps/mobile/src/storage/repository.ts` alongside the existing `deleteEntry()`. `AddEntryScreen` now does double duty: an optional `entry` prop switches it into edit mode (prefills every field, preserves the original `id`/`createdAt` on save, title becomes "Edit Entry," save button becomes "Save Changes," and a trash icon appears in the header). Tapping any row in the dashboard's "Recent entries" list (now a `Pressable` with a chevron affordance) opens it in edit mode; `App.tsx` tracks `editingEntry` and routes `handleSaveEntry` to `updateEntry` vs `addEntry` accordingly. Delete asks for confirmation via `Alert.alert` (destructive-style button) before calling the new `handleDeleteEntry`. Added `accessibilityLabel`/`accessibilityRole` to the close and delete icon buttons while touching this screen (closes part of the separately-tracked accessibility-labels gap below).
  - Verified end-to-end in a real browser session: logged a $100 DoorDash entry, tapped it, confirmed the edit screen was correctly prefilled, changed gross pay to $250, saved, and confirmed the dashboard total updated to exactly $250 (not a duplicate entry).
  - **Delete confirmation not verified by browser testing — found a real platform limitation, not a bug in this feature:** `Alert.alert` is a complete no-op on React Native Web in this project's dev setup (no dialog, no console output, nothing) — confirmed by testing that even the already-shipped, pre-existing "Check gross pay" validation alert produces zero visible effect on web. This affects every `Alert.alert` call in the app, not just the new delete confirmation; it's a known web-dev-mode gap, same category as the already-flagged biometric/notification on-device-only verification items. The delete *logic* (button → confirmation → `onDelete(entry.id)` → `deleteEntry()` → state update) follows the identical, already-trusted `Alert.alert` pattern used elsewhere in this codebase, but needs confirming on a real device/Expo Go before launch.
  - Full suite green (typecheck clean, 26 mobile tests — no new automated tests added here since `repository.ts` has no existing test coverage precedent, same reason as `cryptoCore.ts` being split out for testability; this is UI+storage wiring verified via the browser session above instead).
- [ ] **Settings screen** — there is currently no way, post-onboarding, to: edit the tax profile (filing status/state/county/dependents/W2 income — typos or life changes like moving states are unrecoverable without reinstalling), edit the local user profile (name/email), or trigger `clearAllLocalData()` (also already written, also unused) for an account-reset/data-deletion action. The latter doubles as the CCPA-style "user-facing data export and account/data deletion" requirement already flagged in [ROADMAP §8.2](ROADMAP.md) — currently unimplemented, not just unexposed.
- [ ] **Native date picker for entry date** — `AddEntryScreen` still takes the date as free-typed `YYYY-MM-DD` text with only a regex-format check (no real calendar, no validation that the date isn't in the future, no leap-day/month-length validation). Manual date typing on a touchscreen is exactly the kind of friction the "premium feel" pass should remove; swap for `@react-native-community/datetimepicker` or equivalent.
- [ ] **App-level error boundary** — no `ErrorBoundary` exists anywhere; an uncaught render/calculation error currently white-screens the entire app with no recovery path. Pairs with the already-planned "Crash reporting" item below, but is a distinct, cheap defensive layer worth adding regardless of what crash-reporting SDK is chosen.
- [ ] **Accessibility labels on icon-only controls** — the new close (`×`) and back-style icon buttons added during the polish pass (e.g. `AddEntryScreen`'s header) have no `accessibilityLabel`/`accessibilityRole`, so they're unreadable to screen readers. Quick fix, but currently missing app-wide on every icon-only `Pressable`.
- [ ] **Finalize app identity before submission** — `app.json` still has placeholder `"name": "mobile"` / `"slug": "mobile"` and no `ios.bundleIdentifier` / `android.package` set. Needs real branding (app name, identifiers, possibly a non-default icon) before this can go to either store — call this out explicitly so it isn't discovered for the first time during the App Store submission item below.
- [ ] **True hourly rate calculator — pulled forward from v1.4.** Net earnings minus tax set-aside (and ideally vehicle cost/mileage-implied expense) divided by actual hours worked. Per [ROADMAP §9.1](ROADMAP.md), this is exactly the kind of single-number insight that gets shared in gig-worker communities — free-tier insight, not automation, so there's no reason to wait for v1.4. **Blocked on a real prerequisite, not just UI work:** `Entry` (`apps/mobile/src/types.ts`) has no field for hours worked at all today — needs a simple manual `hoursWorked` input added to `AddEntryScreen` before this can be computed, then a dashboard line (e.g. "Effective hourly rate: $X/hr after taxes").
- [ ] CSV export
- [ ] Disclaimer flows (onboarding + persistent near tax figures) — liability coverage per [ROADMAP §2.3](ROADMAP.md)
- [ ] App Store / Play Store submission (financial app review — budget extra review time)
- [ ] Crash reporting + basic analytics instrumentation
- [ ] Account recovery / multi-device basics ([ROADMAP §8.3](ROADMAP.md))
- [ ] **Dark mode.** Cheap now specifically because of the polish-pass token system (`apps/mobile/src/theme.ts`) — add a dark token set and a scheme switch, not a rewrite. Currently `app.json` hardcodes `userInterfaceStyle: "light"`. Per [ROADMAP §9.3](ROADMAP.md).
- [ ] **Local backup/restore (export/import a JSON data snapshot).** A client-side stopgap for the real data-loss risk created by local-only storage, shippable well before any account system exists. Distinct from "Account recovery / multi-device basics" above, which implies a backend. Per [ROADMAP §5](ROADMAP.md).
**Ships to:** general public, free tier only. **Exit criteria:** stable public release, no payment infra live yet — validate retention before monetizing.

## ⬜ v1.1 — Premium Tier Launch
**Status: Not Started**
**Goal:** turn on monetization once free-tier retention looks healthy.
- Payment infra decision executed: IAP (Apple Small Business Program enrolled for 15% rate) vs. Stripe web checkout per [ROADMAP §8.4](ROADMAP.md)
- Subscription management + dunning/failed-payment handling
- Unlimited platform tracking, multi-state support
- PDF tax-ready summary report export
- Year-over-year insights (once there's a year of data — soft-gate until applicable)
- **"Show your math" audit-trail view** (free — ships alongside premium launch as a trust feature, never paywalled, per [ROADMAP §9.4](ROADMAP.md))
- **Custom/user-defined expense categories** (premium) — pairs with the Schedule C alignment work in v1.5
**Ships to:** general public. **Exit criteria:** premium conversion funnel works end-to-end, including cancel/refund flows.

## ⬜ v1.2 — Platform Auto-Sync
**Status: Not Started**
**Goal:** kill the manual-entry tax for the platforms that matter most.
- Argyle (or equivalent) integration for Amazon Flex, Uber, DoorDash, Instacart per [ROADMAP §3.5](ROADMAP.md)
- Email/statement parsing fallback for platforms aggregator doesn't cover (verify Spark coverage)
- Premium-gated "auto-sync your earnings"
**Ships to:** general public, premium feature. **Exit criteria:** auto-synced entries match manual entries in accuracy during a parallel-run validation period.

## ⬜ v1.3 — Mileage & Receipts Automation
**Status: Not Started**
**Goal:** automate the two most tedious manual inputs.
- GPS-assisted mileage tracking (geofencing/significant-change APIs, not continuous polling — battery concern per [ROADMAP §8.3](ROADMAP.md))
- Receipt photo capture + OCR for expenses
- **IRS-compliant mileage log fields** (business purpose + locations per entry, not just a mileage total) — strengthens audit defensibility and gives GPS-detected trips somewhere to put the purpose they can't infer automatically. Per [ROADMAP §2.2](ROADMAP.md).
**Ships to:** general public, premium feature.

## ⬜ v1.4 — Retention & Growth Features
**Status: Not Started**
**Goal:** the features designed to make this "kickass," not just functional — per [ROADMAP §9](ROADMAP.md).
- Home-screen/lock-screen widget (today's earnings + set-aside number)
- Voice/hands-free logging (Siri Shortcuts / Google Assistant)
- Shift/earnings optimizer based on user's own historical patterns
- **"What-if" earnings simulator** (free — no AI cost, just reruns the existing tax engine with hypothetical numbers) per [ROADMAP §9.2](ROADMAP.md)
- **Milestone celebrations / logging streaks** and a **referral program** (both free, retention/growth levers) per [ROADMAP §9.5](ROADMAP.md)
**Ships to:** general public; widget + what-if simulator + milestones/referral in free tier (drives sharing/virality), optimizer as premium.
**Note:** the true hourly rate calculator originally planned here was pulled forward into v1.0 — see below.

## ⬜ v1.5 — Filing Season Toolkit
**Status: Not Started**
**Goal:** be indispensable in Jan–April, when gig workers actually file.
- Schedule C category alignment for expenses ([ROADMAP §8.1](ROADMAP.md))
- 1099-NEC/1099-K reconciliation against tracked totals
- Affiliate integration with tax filing software (TurboTax/FreeTaxUSA) — monetization lever per [ROADMAP §5](ROADMAP.md)
- **Year-end "Tax Wrapped" recap** (free) — annual summary (total earned, miles driven, top platform, busiest month, tax saved via deductions), timed for this version's Jan launch window. Per [ROADMAP §9.5](ROADMAP.md).
- **Safe-harbor / Form 2210 underpayment-penalty calculator** (free, trust feature) — surfaces the IRS's 110%-of-prior-year safe-harbor rule directly in the UI. Per [ROADMAP §2.2/§9.4](ROADMAP.md).
**Ships to:** general public, timed for tax season launch.

## ⬜ v1.6 — Money-Moves & Pro Tools
**Status: Not Started**
**Goal:** turn the app's data into concrete financial decisions, not just numbers — the "amazing premium tier" features.
- W-4 withholding optimizer (W2+1099 combo — suggest adjusting W2 withholding to cover 1099 liability instead of quarterly payments)
- QuickBooks Self-Employed-compatible export
- CPA/tax-pro shareable summary package (beyond the plain PDF from v1.1 — a dedicated "share with your preparer" flow)
- Multi-vehicle selection/tracking (per-entry vehicle, feeding the v2.3 vehicle break-even analysis)
**Ships to:** general public, premium feature. **Exit criteria:** each feature independently demonstrates a concrete dollar-value or time-saved benefit a user can point to (e.g. "this caught $X you'd have missed").

---

## ⬜ v2.0 — AI Layer Begins (Premium+/AI Tier Launch)
**Status: Not Started**
**Goal:** first AI tier features ship, with a cost model validated before wide rollout.
- AI tier cost/usage-cap model validated against real inference costs ([ROADMAP §8.4](ROADMAP.md))
- Natural language entry ("spent $40 on gas, made $180 on Flex today" → structured entry)
- AI deduction finder (pattern-based suggestions on expense/mileage data)
**Ships to:** general public, new Premium+/AI tier. **Exit criteria:** AI tier pricing covers per-user inference cost with margin at expected usage.

## ⬜ v2.1 — Conversational Assistant
**Status: Not Started**
- Personalized tax optimization chat (RAG over user's own transaction history)
- Anomaly detection (flag weeks where earnings/mileage look off vs. historical pattern)
**Ships to:** AI tier.

## ⬜ v2.2 — Predictive Finance
**Status: Not Started**
- Predictive cash-flow ("you'll owe ~$X this quarter, adjust your weekly set-aside")
- Bank/Plaid auto-sync (high compliance overhead — legal review required before this ships, per [ROADMAP §6](ROADMAP.md))
- Promised-vs-actual pay discrepancy detection
**Ships to:** AI tier.

## ⬜ v2.3 — Financial Wellness Suite
**Status: Not Started**
- Envelope-style virtual buckets (tax/savings/spending)
- Vehicle break-even analysis (true cost per mile vs. standard deduction)
- Retirement nudges with actual action (SEP-IRA/Roth partnership integration)
**Ships to:** AI tier, with envelope buckets possibly soft-launched to premium as a teaser.

---

## ⬜ v3.0 — Platform Expansion
**Status: Not Started**
**Goal:** broaden reach once core product/monetization is proven.
- Apple Watch companion app
- Multi-language support
- Web dashboard (if not already pulled forward — revisit the [open question](ROADMAP.md) on timing)
- B2B/white-label exploration (gig platforms embedding your tooling) per [ROADMAP §5](ROADMAP.md)

---

## Sequencing notes
- **v0.1–v0.3 are not public** — they exist to de-risk the tax engine and core loop before any store submission or marketing spend.
- **Don't start v1.2 (platform auto-sync) before v1.1 (payment infra) is stable** — auto-sync is the single best premium conversion driver and shouldn't launch into a broken checkout flow.
- **v1.5 (filing season toolkit) is date-sensitive** — target shipping by early January regardless of where other version work stands, since the value window is narrow (Jan–April).
- **v2.0 is gated on the cost model, not the calendar** — don't ship AI tier features until per-user inference economics are validated; this is the one version where "feature complete" should yield to "financially sound."
- **v1.6 (Money-Moves & Pro Tools) only depends on v1.1's premium infra being live** — it doesn't need platform auto-sync (v1.2) or mileage/receipt automation (v1.3), so it can ship in parallel with or ahead of either if it's a faster win.

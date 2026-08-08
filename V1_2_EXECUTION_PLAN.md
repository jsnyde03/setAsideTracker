# v1.2 — Execution Plan · **THE ACTIVE DRIVER**

> **This file is where active work lives** (Jason 2026-08-07). One active item at a time, decomposed
> here and nowhere else. Detail of completed work → [V1_2_LOG.md](V1_2_LOG.md). Version ladder →
> [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Nothing else carries a v1.2 queue.

> ## ⏭️ RESUME HERE — session closed 2026-08-08
>
> **Repo CLEAN and PUSHED on `v1.2`** — everything below is on the remote; nothing lives only on the
> machine. _(Deliberately not pinning a commit hash here: it goes stale the next time anything lands,
> and `git log -1` is always right.)_
>
> **▶ ACTIVE = 1.2.1 (demo mode), before-scan DONE 2026-08-08, decomposed into 7 sub-steps below.**
> The scan killed the spec's central premise — persistence does **not** all funnel through
> `repository.ts` — and found the persona already exists as a valid backup file. Record →
> [V1_2_LOG.md](V1_2_LOG.md). **1.2.1.1–1.2.1.4 closed 2026-08-08; next action: 1.2.1.5.**
> _(Health moved: **27/27** Playwright (was 23) · **190** mobile unit (was 144) · typecheck clean ·
> lint still 14, none introduced.)_
> ⚠️ **Still web/unit-verified only** — the leak guards are asserted against mocks. The review prompt,
> the notification permission dialog and real scheduling are device-owed, at 1.2.9.
>
> **✅ Just finished: 1.2.0 (routing migration), 8 sub-steps, closed.** The app went from a
> `useState<Screen>` machine in a 593-line `App.tsx` to real `expo-router` routes. `App.tsx` deleted.
>
> **✅ TestFlight build SUCCEEDED 2026-08-08** — `1.2.0` built, signed, uploaded and is installable.
> The whole `expo-router` + `react-native-screens` stack packages correctly. **There is now a real
> device build of the migration**, which is what unblocks everything in
> [V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md) §A — the checks no harness can perform.
>
> **❌ Maestro dispatch #1 FAILED 2026-08-08 — INFRASTRUCTURE, triaged and fixed.** It died at **step 7
> (`xcodebuild`)**, so the flows never ran: **the rewritten selectors and the stacked-route a11y
> hierarchy are still entirely unvalidated.** Cause: the workflow omits the `AppleConnect` group (no
> signing needed for a simulator), and that group is also where `SENTRY_AUTH_TOKEN` lives — so
> `sentry-cli` failed and took the JS-bundle phase down with it. **Fixed:**
> `SENTRY_DISABLE_AUTO_UPLOAD: "true"` on that workflow. Full triage → [V1_2_LOG.md](V1_2_LOG.md).
>
> **▶ Dispatch #2 is owed and NOT yet sent** — batching it behind 1.2.1.7's demo flow so one mac run
> validates the migration flows *and* demo mode. ⚠️ Still-live triage rule for that run: the recipe
> boots **`"iPhone 15"`** with `|| true` on an **Xcode 26.4** runner — if that image has no iPhone 15,
> the swallowed boot failure surfaces as an *install* failure and misreads as an app problem.
> A failure inside **`Run Maestro native flows`** is the only outcome that is real signal.
>
> **⚠️ Standing caveat: everything in v1.2 so far is WEB-VERIFIED ONLY.** react-native-web renders no
> `Alert`, no biometrics, no document picker, no real navigation stack — and `react-native-screens`
> now sits under every screen. **A green suite here means "nothing else broke", not "this works on a
> phone."** That happened three times in this item alone. Device gates →
> [V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md).
>
> **Health at close:** 23/23 Playwright · 245 unit (101 engine + 144 mobile) · typecheck clean · lint
> at 14 pre-existing findings, none introduced (ledger clears at 1.2.8).

**Branch:** `v1.2` (pushed) · **Target:** live on the App Store by **end of August 2026** ([D4])
**Structural audit:** [`docs/audits/2026-08-07-v1.2-structural/`](docs/audits/2026-08-07-v1.2-structural/SYNTHESIS.md) · **Ladder rationale:** [BUILD_ORDER_REVIEW_2026-08-07.md](BUILD_ORDER_REVIEW_2026-08-07.md)

**Backwards from Aug 31:** live Aug 31 ← Apple review + resubmit buffer (~1wk) ⇒ **submit ~Aug 24**
← TestFlight device-QA pass, a hard gate (~1wk) ⇒ **feature-complete ~Aug 20** ⇒ **~13 build days.**

---

## 📐 How this doc is worked — the scan protocol

_Set by Jason 2026-08-07. Every level, no exceptions; scans are proportional, never skipped._

1. **Before-scan (viability + enhancement)** fires at **switch-in** for the whole version, for each
   **task**, and for each **sub-task**. It verifies the plan's premises **against the current code**
   (a written plan is a hypothesis) and scouts adjacent improvements.
2. **After-scan** fires on completion at the same three levels — it catches what only surfaced *during*
   implementation, which a before-scan structurally cannot.
3. **Routing:** version-necessary + low-risk → fold into the current item. Everything else → the
   **Deferred backlog** below, *immediately*, in the same edit. Never a later pass.
4. **On completion:** collapse the active item to one terse line → move to **Closed** → push detail to
   [V1_2_LOG.md](V1_2_LOG.md) → **then** promote and decompose the next item. The queue never sits idle
   and never holds two decomposed items.

**Scan status legend:** ⬜ not run · 🔵 before-scan done · ✅ after-scan done (item complete)

**🔌 Standing (Jason 2026-08-07): never leave Expo ports open.** Any step that boots Expo web —
`npm run web`, or a Playwright run whose `webServer` starts Metro — must end with **8081 / 8082 /
19000 / 19001 / 19006 verified free**. A stale Metro serves the *old bundle* to the next run, which
reads exactly like a change that didn't take. ⚠️ Identify a PID before killing it: Adobe Creative
Cloud runs its own `node.exe`.

**⚙️ Environment:** npm and Playwright here need `NODE_OPTIONS=--use-system-ca`, or installs fail with
`ERR_SSL_WRONG_VERSION_NUMBER`. Recurs on every install (1.2.3, 1.2.6).

---

## ▶️ ACTIVE QUEUE — exactly one item

### ▶ **1.2.1 — Demo mode** · 🔵 before-scan done 2026-08-08 · **4/7 sub-steps**

**Why it is next:** the bundle's lead item — reusable seed infrastructure the others consume. 1.2.2 is
unshowable on an empty account, 1.2.4 needs populated views to teach over, 1.2.3 needs realistic
content to lay out.

⚠️ **The before-scan killed the spec's central premise.** Persistence does **not** all funnel through
`repository.ts` — `appReview.ts` (one-shot review flag), notification scheduling and analytics all
bypass it. Isolation is a **three-file** guarantee, not one. Full record → [V1_2_LOG.md](V1_2_LOG.md).

| # | sub-step | scan |
|---|---|---|
| **1.2.1.1** | ✅ **Demo store — DONE 2026-08-08.** In-memory `demoStore.ts` + a one-function `backend()` switch; `repository.ts` now has **zero** direct `AsyncStorage.` calls. Premium cache deliberately exempt. 8 tests, verified by mutation. | ✅ |
| **1.2.1.2** | ✅ **Seed generator — DONE 2026-08-08.** `buildDemoSeed(now)` with day-offset dates, compressed (not spilled) when the tax year is too young — `entriesForYear` would otherwise drop the whole persona on 1 Jan. 29 tests across 7 calendar dates; totals verified against the plan's $6,213. | ✅ |
| **1.2.1.3** | ✅ **Leaks plugged — DONE 2026-08-08.** Guards at 4 choke points (review prompt · schedule · **cancel** · analytics), flag moved to a pure `demo/demoMode.ts`. ⭐ The scan found a **fourth** leak: `cancelQuarterlyReminders` wipes *all* device notifications, so a demo toggle would have deleted the real user's reminders. 9 paired tests. | ✅ |
| **1.2.1.4** | ✅ **Enter/exit — DONE 2026-08-08.** `DemoContext` inside `AppDataProvider`; entry on onboarding, exit first in Settings; entry rolls back if the re-read fails. ⭐ **`RequireTaxProfile` needed NO widening** — the demo seeds a profile, so the Debt `3.5.4.3` premise doesn't transfer and no guard was weakened. 4 new e2e → 27/27. | ✅ |
| **1.2.1.5** | **Mark every demo surface** — on screen **and** in the a11y tree | ⬜ |
| **1.2.1.6** | **Premium preview without entitlement** — per **[D5]**: `isDemoPreview` alongside `isPremium` at the 4 gate sites; purchase + PDF export still check `isPremium` alone | ⬜ |
| **1.2.1.7** | **Tests** — Playwright enter/exit + real-data-untouched · Maestro flow · unit tests for seed + isolation | ⬜ |

**Exit line:** demo enters and exits clean with the real data **provably untouched**; every surface
showing demo money is marked as such **on screen and in the accessibility tree**; premium screens
preview populated while `subscribe`/`export` still route to the real paywall.

## 📋 Queue — everything else _(terse rows; decomposed only on promotion)_

_1.2.1 is not listed here — it is the active item above. An item appears in exactly one place._

| # | item | notes |
|---|---|---|
| 1.2.2 | **⭐ Premium slice** | Optimizer (headline) · safe-harbor payment tracker · per-quarter amounts in reminders · expense drill-down. **Before the screen passes** so each walks the final surface once. |
| 1.2.3 | **Native iPad** | Adaptive split-view/sidebar. ~2× its original estimate (scoped at 6 screens, now 13). |
| 1.2.4 | **Guided onboarding tour** | Full coachmark tour over populated views. Reusable overlay system. Render **outside** gesture handlers. |
| 1.2.5 | **Accessibility depth audit** | Dynamic Type · VoiceOver · 44pt targets · contrast · reduce-motion. VoiceOver end-to-end is device-owed. |
| 1.2.6 | **iOS home-screen widget** 🔒 | **Blocked on external prerequisites.** The #1 risk to the August date — cut this before cutting the date. |
| 1.2.7 | **Filed correctness backlog** | IRS due-date business-day shift 🔴 · completeness prompt · analytics opt-out · privacy-page single source. |
| 1.2.8 | **Lint ledger → CI gate** | 14 findings; runs late because 1.2.0–1.2.3 rewrite those files. |
| 1.2.9 | **Verify · device QA · phase after-scan** | TestFlight pass (hard gate) · guideline pass · whole-phase after-scan. |

_Item specs live in [V1_2_LOG.md](V1_2_LOG.md) and are retrieved at switch-in — not carried here._

## ✅ Closed

- **1.2.0.8 — Close the native-verification gap ✅ DONE 2026-08-08.** ⭐ **Root cause found: `TextField`
  never labelled its input** — every text field in the app was an unnamed box to VoiceOver, which is
  *why* tests could only reach them by placeholder-and-index. Fixed (label → `accessibilityLabel`,
  visible label hidden from a11y to stop double-announcement), which made 7 fragile Maestro selectors
  addressable by name. **New `clear-all-data.yaml`** covers the automatable data-loss path;
  **[V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md)** makes restore + app-lock explicit
  manual gates. Verified: 23/23 e2e with the Playwright helper switched to `getByLabel`, which *proves*
  the labels landed. ⚠️ **The Maestro changes are unrun — the first `maestro-ios` dispatch is their
  validation, not a regression check.**

- **1.2.0 — Routing migration to `expo-router` ✅ DONE 2026-08-08** _(absorbed 1.2.0.6)._ The app had no
  navigation library; it now has real routes. `expo-router@56.2.18` · entry point → `expo-router/entry`
  · providers + `AppGate` above the `Stack` · `AppDataProvider` owns app data · **13 screens → 12 route
  files** · `App.tsx` (593 lines) **deleted** · `editingEntry` → an `?id=` param · `paywallOrigin`
  **gone** · guards on 9 routes + the reverse guard on onboarding · `useGoBack` so a deep-linked screen
  can still be closed. **23/23 e2e (4 new) · 245 unit · typecheck + lint clean · every route looked at
  in both themes · iOS build validated on Codemagic.** _Full detail + all 7 scan records → [V1_2_LOG.md](V1_2_LOG.md)._

---

## Decisions settled — do not re-open without new information

| # | decision | when |
|---|---|---|
| **[D1]** | **Adopt `expo-router` first**, then build iPad on it. | Jason 2026-08-07 |
| **[D2]** | **The iOS widget folds into v1.2**; Android's rides v1.3. | Jason 2026-08-07 |
| **[D3]** | **A premium slice joins v1.2** ("Both"). **Standing: every version carries a premium line.** | Jason 2026-08-07 |
| **[D4]** | **v1.2 stays INTACT, targets August.** | Jason 2026-08-07 |
| **[D5]** | **Demo previews premium via a separate `isDemoPreview`, never by faking `isPremium`.** The entitlement boolean stays honest; purchase + export keep checking it alone. | Jason 2026-08-08 |
| — | Guided onboarding = the **full coachmark tour**, not a lightweight intro. | Jason 2026-06-30 |
| — | Demo mode is **isolated and fully reversible**. | Jason 2026-06-30 |
| — | Free half stays free; premium half is **additive**, on the tax-time/complexity axis. | standing |

## ⚠️ External prerequisites — Jason-side

**Gating 1.2.6 (the widget) — start day one or cut it:**
1. **App Group capability** → ⚠️ **regenerate provisioning profiles or CI signing fails.** Standing rule.
2. **Mirror Freedom v1's widget template** (Expo 56 + Codemagic + widget target, Team `CVCY985YCD`).
3. **Watch the Codemagic `xcodeproj` glob gotcha** — run a native build *early*, not at the end.

**Not gating v1.2, but start now** — external latency that doesn't compress:
4. **Play Console account type** (personal ⇒ 12 testers × 14 days) + Play Billing + RevenueCat Android key → v1.3.
5. **Tax-filing affiliate applications** — must be in by ~November or v1.4's affiliate half misses its window.

## 🗄 Deferred backlog — surfaced during v1.2, filed immediately

- **🟠 [DECISION — Jason] Can an already-onboarded user reach the demo?** Today: **no.** The affordance
  lives only on onboarding, so the demo serves the not-yet-onboarded visitor and a fresh App Review
  install, but an existing account has no way in. That is defensible, and it also means **you cannot
  shoot store screenshots from the demo without wiping your own data first** — the exact chore
  1.2.1.1's spec said demo mode would retire. _Recommendation: add "Explore sample data" to Settings
  too_ — the machinery is built, it's a few lines, and it makes premium previews reachable for anyone
  evaluating the app. **Not folded, because it widens who the feature is for, which is a product call
  rather than a wiring detail.** _(Found 2026-08-08 at the 1.2.1.4 after-scan.)_
- **Nothing *enforces* that persistence goes through `repository.ts` → 1.2.8.** Add an ESLint
  `no-restricted-imports` rule allowing `@react-native-async-storage/async-storage` only in
  `src/storage/`, so demo mode's isolation guarantee is checked by CI rather than requested by a
  comment. **Deferred, not folded:** 1.2.8 is already the lint-rule/CI-gate item, and it runs after the
  files in question stop being rewritten. _(Found 2026-08-08 at the 1.2.1.1 after-scan.)_
- **`appReview.ts` writes AsyncStorage directly, outside the repository and unencrypted → 1.2.8.**
  1.2.1.3 neutralizes it *in demo*; consolidating it (and any sibling) into `repository.ts` so the
  "one persistence path" claim becomes true is the broader fix. **Deferred, not folded:** it touches a
  path demo mode doesn't need changed. _(Found 2026-08-08 at the 1.2.1 before-scan.)_
- **`SCREENSHOT_PLAN.md`'s persona will have two sources of truth once 1.2.1.2 lands → 1.2.9.** Point
  the plan at the demo seed (one-tap, as it already anticipates) instead of the hand-maintained
  `maya-persona-backup.json`. _(Same provenance.)_
- **🔴 `Chip` announces no selected state to screen readers → 1.2.5 (a11y audit).** `Chip` sets
  `accessibilityState={{ selected }}` with `accessibilityRole="button"`, and **RN-Web drops it** —
  ARIA doesn't allow `aria-selected` on `button`, so the accessibility tree renders a bare
  `button "Dark"` with no indication it's the active choice. **`Chip` is the app's selection primitive**
  (filing status, platform, theme, tax year), so a VoiceOver user currently cannot tell which option is
  selected *anywhere in the app*. Fix is likely `radio`/`radiogroup` semantics for mutually-exclusive
  sets, or `aria-pressed` for toggles. **Deferred, not folded:** it changes a shared primitive used
  across every screen, so it belongs in the audit that sweeps them all. _(Found 2026-08-07 at 1.2.0.2,
  by reading the a11y snapshot after a test assertion failed against it.)_
- **Settings `Switch`es carry no `accessibilityLabel` → 1.2.5 (a11y audit).** App Lock and Quarterly
  Due Date Reminders are labelled only by adjacent `Text`, so they announce as bare switches. _(Same
  provenance. Note `TextField` was fixed at 1.2.0.8 — the `Switch` and `Chip` cases remain.)_
- ~~**Clear-all-data, restore-from-backup and app-lock have NO automated coverage**~~ → ✅ **CLOSED
  2026-08-08 by 1.2.0.8**, as far as it can be closed. `clear-all-data.yaml` covers the automatable
  one end-to-end (destructive Alert → return to onboarding → data provably gone). **Restore and
  app-lock are genuinely un-automatable** — a native document picker and a biometric prompt — so they
  are now explicit manual gates in
  [V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md) §A rather than an unstated hole.

## ⏳ Open

- **[D3-ASA] the ASA read** — impressions, CPT, tap→install, `paywall_viewed`. Still outstanding.
- **Conversion numbers** — Jason reports conversions started; count + install base still needed.
- **Differentiation repositioning** — owed at the v1.2 switch-in, not yet done; store/ASO work that fits
  a wait-window. Promotion is first-class work, not filler.
- **Deferred, unchanged:** repo → private (⚠️ check Pages first) · "More" hub IA reframe.

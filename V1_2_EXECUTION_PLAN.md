# v1.2 — Execution Plan · **THE ACTIVE DRIVER**

> **This file is where active work lives** (Jason 2026-08-07). One active item at a time, decomposed
> here and nowhere else. Detail of completed work → [V1_2_LOG.md](V1_2_LOG.md). Version ladder →
> [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Nothing else carries a v1.2 queue.

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

### ▶ **1.2.0 — Routing migration to `expo-router`** · 🔵 before-scan done · 🔨 **3 of 7 sub-steps done**

> **✅ NATIVE BUILD VALIDATED (2026-08-07).** The Codemagic run **compiled, signed and produced a valid
> `.ipa`** — so `expo prebuild` survives the `expo-router/entry` swap, **`react-native-screens`
> autolinks**, the new `scheme` doesn't disturb signing, and there's no xcodeproj-glob breakage. The
> owed native pass is closed. It failed only at **upload**: ASC rejected `CFBundleShortVersionString
> 1.1.1` as already-approved. **Fixed — `app.json` version bumped to `1.2.0`.**
>
> ⚠️ **Lesson, folded into the plan:** bump the version at the START of a version's work, not at
> submission. A stale version number turns every interim TestFlight build into a failed upload, which
> is exactly when those builds are most useful.

**Why it leads:** the app has **no navigation library**. Routing is a `useState<Screen>` machine in a
593-line `App.tsx` that renders one screen at a time by construction, so iPad split-view (1.2.3) is
architecturally impossible without this. It also gates the tour's and demo's entry points, deep links,
route guards, and v1.3's Android back button.

**🔎 Before-scan findings** _(2026-08-07, verified against code — full record in the log)_

| | finding | consequence |
|---|---|---|
| ✅ | **The 12 Playwright specs use ZERO `getByTestId`** — one `goto("/")`, then drive by visible text | **The migration is not a 24-file rewrite.** Preserve the visible UI and the suite survives. Biggest de-risk. |
| ✅ | `encryption.ts:3` **self-imports** the `react-native-get-random-values` polyfill | The entry-point swap does *not* silently break crypto on device. Verify, don't fear. |
| ⚠️ | `"main": "index.ts"` must become `expo-router/entry`; `index.ts` also holds the polyfill import | Entry-point change is real. Keep polyfill-before-crypto ordering. |
| ⚠️ | **`app.json` has no `scheme`** | Deep links need one. New config key → confirm it doesn't disturb signing. |
| ⚠️ | **11 Maestro flows** drive native UI by text | Same resilience as Playwright *if* UI is preserved — but native-verified only at 1.2.9. |
| ⚠️ | All app state (entries, profiles, settings, lock) lives in `AppContent` | Must be lifted **above** the Stack, or sibling routes see nothing. Debt's `3.5.4.2` lesson. |
| ⚠️ | `paywallOrigin` state exists only to emulate "go back" | Real routing deletes this concept. Remove it, don't port it. |
| ❓ | expo-router version compatible with Expo SDK 56 / RN 0.85 / React 19.2.3 | **Unverified offline** — resolve at install (1.2.0.1). The one genuine viability risk. |

**Sub-steps** _(each gets its own before + after scan)_

- [x] **1.2.0.1 — Install + entry point ✅ DONE 2026-08-07.** `expo-router@56.2.18` +
      `react-native-screens@4.27.0`; `"main"` → `expo-router/entry`; `scheme: "setasidetracker"`;
      polyfill rehomed to `app/_layout.tsx`; `index.ts` deleted. **Whole app mounted as ONE route
      (strangler-fig) so it stays working at every step.** ⭐ **Viability CLOSED — [D1] holds.**
      *Verified:* 17/17 Playwright green **with zero test edits**, 245 unit tests, typecheck clean.
- [x] **1.2.0.2 — Hoist the provider stack ✅ DONE 2026-08-07.** Providers + the three `init*` calls
      moved into `app/_layout.tsx` above the `Stack`; `App.tsx` is now a plain route component.
      **`ThemeProvider` owns the theme preference** (loads + persists it), which deletes the lifted
      state and lets any route change the theme. New `updateAppSettings` merges instead of
      overwriting. ⭐ **Fixed a pre-existing bug:** restore-from-backup applied only `appLockEnabled`,
      so a restored theme didn't show until a cold start and restored reminders were never rescheduled.
      *Verified:* 19/19 e2e (2 new), 245 unit, typecheck + lint clean, ports closed.
- [x] **1.2.0.3 — Lift app state above the router ✅ DONE 2026-08-08.** New
      `src/state/AppDataContext.tsx` above the `Stack` owns profile / tax profile / entries and the two
      non-theme settings; **`App.tsx` imports nothing from `storage/` any more** — which is the seam
      demo mode redirects. Data layer throws; `App` keeps alerts, analytics and navigation. Boot
      screen and `isLocked` are now **derived** rather than set in an effect. *Verified:* 19/19 e2e,
      245 unit, typecheck + lint clean (still 14).
      ⚠️ **Coverage gap found, filed below** — clear-all-data / restore / lock have no test anywhere.
- [ ] **1.2.0.4 — Port the 13 screens to routes**, in groups, **preserving visible UI exactly** so the
      text-based suites survive. *Exit:* all 13 reachable by route.
- [ ] **1.2.0.5 — Route guards.** Onboarding gate + lock screen. ⚠️ Must **admit** the not-yet-onboarded
      user (Debt's `3.5.4.3`: a blanket guard locked out the demo's own audience). *Exit:* guards hold
      and don't over-block.
- [ ] **1.2.0.6 — Delete `paywallOrigin`**, replace with real back-navigation. *Exit:* paywall returns
      correctly from every entry point.
- [ ] **1.2.0.7 — Verify + after-scan.** 12 Playwright specs green · typecheck · 245 unit tests · both
      themes · **look at every route** — ⚠️ Debt's cautionary case: a root-layout change broke
      navigation app-wide while the e2e stayed green, because a reload lands on the right URL anyway.

**Exit line:** all 13 screens reachable by route · providers above the `Stack` · app state lifted out
of `App.tsx` · `paywallOrigin` gone · e2e + unit + typecheck green · **every route verified by looking,
in both themes.**

---

## 📋 Queue — everything else _(terse rows; decomposed only on promotion)_

| # | item | notes |
|---|---|---|
| 1.2.1 | **Demo mode** | Reversible sample persona. Isolation enforced at `repository.ts` (one flat module, 15 fns — the whole guarantee is checkable in one file). Consumes 1.2.0.3's seam. |
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

_(none yet)_

---

## Decisions settled — do not re-open without new information

| # | decision | when |
|---|---|---|
| **[D1]** | **Adopt `expo-router` first**, then build iPad on it. | Jason 2026-08-07 |
| **[D2]** | **The iOS widget folds into v1.2**; Android's rides v1.3. | Jason 2026-08-07 |
| **[D3]** | **A premium slice joins v1.2** ("Both"). **Standing: every version carries a premium line.** | Jason 2026-08-07 |
| **[D4]** | **v1.2 stays INTACT, targets August.** | Jason 2026-08-07 |
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
  provenance.)_
- **🔴 Clear-all-data, restore-from-backup and app-lock have NO automated coverage → 1.2.9 (device QA),
  + a Maestro flow.** No Playwright spec and no `.maestro` flow touches any of them. They're
  `Alert`-driven, and RN-Web doesn't render Alerts, so they **cannot** be covered on web — Maestro is
  the only instrument that can see them. **Two of the three are data-loss paths**, and 1.2.0.3 rewired
  all three (clear + restore now run through `AppDataProvider`; `isLocked` is derived rather than
  stored). **Owed: an explicit device check at 1.2.9, and a Maestro flow so it isn't manual forever.**
  _(Found 2026-08-08 at 1.2.0.3 — the suite went 19/19 across the rewiring without touching them once.)_

## ⏳ Open

- **[D3-ASA] the ASA read** — impressions, CPT, tap→install, `paywall_viewed`. Still outstanding.
- **Conversion numbers** — Jason reports conversions started; count + install base still needed.
- **Differentiation repositioning** — owed at the v1.2 switch-in, not yet done; store/ASO work that fits
  a wait-window. Promotion is first-class work, not filler.
- **Deferred, unchanged:** repo → private (⚠️ check Pages first) · "More" hub IA reframe.

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
> **▶ NEXT = 1.2.1 (demo mode).** It is in the active slot **undecomposed on purpose** — its sub-steps
> get written *after* its before-scan, because a decomposition authored before the scan is a guess.
> Start with the scan. Its spec is in [V1_2_LOG.md](V1_2_LOG.md) → "Queued item specs", retrieved at
> switch-in.
>
> **✅ Just finished: 1.2.0 (routing migration), 8 sub-steps, closed.** The app went from a
> `useState<Screen>` machine in a 593-line `App.tsx` to real `expo-router` routes. `App.tsx` deleted.
>
> **✅ TestFlight build SUCCEEDED 2026-08-08** — `1.2.0` built, signed, uploaded and is installable.
> The whole `expo-router` + `react-native-screens` stack packages correctly. **There is now a real
> device build of the migration**, which is what unblocks everything in
> [V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md) §A — the checks no harness can perform.
>
> **🔄 DISPATCHED 2026-08-08 — `SetAsideTracker — iOS Maestro (native flows)` on `v1.2`, result pending.**
> ⚠️ **Treat it as a validation pass, not a regression check**, for two independent reasons: five flows
> had selectors rewritten and one is new (**none has executed once**), *and* the build recipe itself
> may never have completed — its own header warns it will "need a round of tuning on a real Codemagic
> mac runner (simulator name/runtime, build-products path)".
>
> **Triage by which step fails — the two cases have different fixes:**
> - install · prebuild · xcodebuild · **`simctl boot`/`install`** → **infrastructure**, fix
>   `codemagic.yaml`. ⚠️ Top candidate: the recipe boots **`"iPhone 15"`** with `|| true`, and the
>   runner showed **Xcode 26.4** — if that image has no iPhone 15, the boot failure is swallowed and
>   the *install* fails instead, which misreads as an app problem.
> - **`Run Maestro native flows`** → **real signal**: either the rewritten selectors or the
>   stacked-route accessibility hierarchy, which could not be verified from here.
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

### ▶ **1.2.1 — Demo mode** · ⬜ before-scan not yet run · ⬜ not started

**Why it is next:** it is the bundle's lead item by design — reusable seed-data infrastructure the
others consume. The premium optimizer (1.2.2) is unshowable on an empty account, the onboarding tour
(1.2.4) needs populated views to teach over, and the iPad pass (1.2.3) needs realistic content to lay
out. Building it first is what makes those three demonstrable rather than theoretical.

**Carried in from 1.2.0, already true:**
- `AppDataProvider` is the seam. Every read and write funnels through `src/storage/repository.ts`
  (one flat module, 15 functions, no other persistence path), so isolation is enforceable at a single
  file and checkable by inspection — the audit's F2 finding, now built.
- `RequireTaxProfile` is **the one place** the guards widen to admit a not-yet-onboarded visitor.
  Debt's `3.5.4.3` is the cautionary case: a blanket onboarding guard locked out the demo's own audience.
- `reload()` exists on the provider precisely so entering and leaving demo re-reads without a remount.

**Sub-steps — to be decomposed at switch-in, after its before-scan.** _(Not written ahead: a
decomposition authored before the scan is a guess. The scan verifies premises against current code
first — that is what caught the `Stack`-keeps-routes-mounted cost in 1.2.0.4, and what corrected the
"demo isolation is the hard part" claim before that.)_

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

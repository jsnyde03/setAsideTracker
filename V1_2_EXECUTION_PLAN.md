# v1.2 — Free-Tier UX Bundle · Execution Plan

_Authored 2026-08-07 at the v1.2 switch-in. Companion to [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
(which owns the version ladder) — this doc owns **sequence, dependencies, and external prerequisites**
for v1.2 only, the same job [V1.1_EXECUTION_PLAN.md](V1.1_EXECUTION_PLAN.md) did for v1.1._

**Status: ⬜ planned, not started.** v1.2 is decomposed and gated but **has not been promoted to the
active build slot** — that happens at the next slot boundary (Jason 2026-08-07: plan now, promote later).

**Branch:** `v1.2`, off `master` @ `efb7c51` (per the standing rule: v1.1+ work starts on a new branch).

---

## What v1.2 is

The **free-tier UX bundle** — settled 2026-06-30, re-confirmed 2026-08-07. Everything here is free;
none of it is paywalled, per the tier-gating principle (gate on automation and scale, never on
financial safety).

It exists because of one diagnosis: **this app's value is invisible until you have logged data.** A new
user completes a tax-profile wizard and lands on a dashboard reading $0.00. Demo mode and the guided
tour attack exactly that.

**Honest scope note (audit F4):** this bundle improves **activation** — turning an install into a user
who logs a first entry. It does **not** address manual-entry retention decay, the week-3 drop-off that
`DIFFERENTIATION_STRATEGY.md` names as the more urgent problem. The widget (1.2.5) is the one item here
that does, which is why it was folded in ([D2], Jason 2026-08-07). Passive capture (GPS auto-mileage) is
the other lever and stays in v1.4.

**Prior art:** the 2026-08-07 structural audit →
[`docs/audits/2026-08-07-v1.2-structural/SYNTHESIS.md`](docs/audits/2026-08-07-v1.2-structural/SYNTHESIS.md).
Read F1 and F2 before starting 1.2.0 or 1.2.1 — both correct estimates that are still on record elsewhere.

---

## Decisions already settled (do not re-open without new information)

| # | Decision | When |
|---|---|---|
| **[D1]** | **Adopt `expo-router` first**, then build iPad on it. The app has no router at all today; split-view is architecturally impossible without one. | Jason 2026-08-07 |
| **[D2]** | **The iOS home-screen widget folds into v1.2** (not deferred to v1.3). Accepts a native build + signing cycle inside an otherwise pure-JS bundle, to get the retention lever shipping a version earlier. Android's widget rides v1.3. | Jason 2026-08-07 |
| — | v1.2 = this bundle; **Android becomes v1.3** and the ladder renumbers. | Jason 2026-08-07 |
| — | Guided onboarding is the **full coachmark tour**, not a lightweight intro. | Jason 2026-06-30 |
| — | Demo mode is **isolated and fully reversible** — never touches real data, exits clean. | Jason 2026-06-30 |
| — | All of v1.2 is **free**. iPad layout is basic core, not a premium axis. | Jason 2026-06-30 |

---

## ⚠️ External prerequisites — Jason-side, and 1.2.5 is blocked until they're done

**These gate the widget, and one of them is a hard signing rule.** Start them before 1.2.5 becomes
active; nothing before 1.2.5 depends on them.

1. **App Group capability** — a widget shares data with the app through an App Group
   (`group.com.gigtaxtracker.app` or similar). Adding it in the Apple Developer portal is not enough:
   **the provisioning profiles must be regenerated afterward or signing fails in CI.** This has bitten
   before and is a standing rule, not a caution.
2. **Mirror Freedom v1's widget template rather than building from scratch** — Freedom shipped this
   exact stack (Expo 56 + Codemagic + a widget target, Team `CVCY985YCD`) and its `codemagic.yaml`,
   target layout, and signing docs are the proven reference.
3. **Watch the Codemagic `xcodeproj` glob gotcha** — adding a native target has broken iOS CI before,
   via xcodeproj globbing or a config-plugin phase needing credentials. Run a native build early in
   1.2.5, not at the end.

**Also parallel, and unrelated to v1.2 — start now so v1.3 isn't three weeks of waiting** (per the
2026-08-07 scope decision). Both are in [GIG_ANDROID_PLAN.md](GIG_ANDROID_PLAN.md):
- **Play Console account type** — personal or organization? Personal means a **≥12 tester / 14
  continuous day** closed-testing gate before production access. That is dead wall-clock, so its clock
  should start during v1.2, not after it. (`GIG_ANDROID_PLAN.md` §0.)
- **Google Play Billing products + RevenueCat Android key** — the Android twin of the iOS setup.

---

## The sequence

_Ordered, and the order is load-bearing. Each sub-step gets its own before-scan and after-scan._

### 1.2.0 — Routing migration to `expo-router` ⚠️ **foundational; everything sits on it**

Replace the hand-rolled `useState<Screen>` machine in the 593-line `App.tsx` — 13 screens dispatched as
sequential early returns — with real routes. **This is a prerequisite, not a refactor for its own sake:**
split-view (1.2.2) needs two screens rendered at once, and the tour (1.2.3) and demo (1.2.1) both need
real entry points.

- Also delivers: deep links, a route-guard concept, and **Android's hardware back button** — which v1.3
  requires and this architecture currently has no answer for.
- **Reference:** Debt v1.7 did this migration and paid for the lessons. Two are directly transferable:
  the provider must be hoisted **above** the `Stack` (or sibling tabs show unrelated state one tap
  away), and a `Stack.Protected` onboarding guard will lock the demo's own not-yet-onboarded audience
  out unless it explicitly admits them.
- ⚠️ **Highest-blast-radius change in v1.2.** Debt's cautionary case: a root-layout change kept the e2e
  suite green while breaking navigation app-wide, because a reload lands on the right URL anyway.
  **Verify every route by looking, not by trusting the suite.**
- **Exit:** all 13 screens reachable by route, both themes, Playwright green, `App.tsx` no longer owns
  routing.

### 1.2.1 — Demo mode ⚠️ **leads the feature work; the others consume it**

A reversible sample persona so a first-run user (and an App Store reviewer) sees the full app instantly.

- **Enforce isolation at `src/storage/repository.ts`.** Audit F2: every read and write funnels through
  that one flat module (15 functions, no other persistence path), so the isolation guarantee is
  enforceable at a single file and checkable by inspection. **This is easier than the 2026-06-30 memory
  claims** — that estimate predates the current seam.
- Seeds the believable multi-platform persona `SCREENSHOT_PLAN.md` currently builds **by hand** — this
  productionizes the screenshot seed and eases App Store/IAP review.
- **Premium screens preview populated, but `subscribe`/`export` still route to the real paywall** —
  show the value, never grant the entitlement. The seam exists: `setPurchasesClient()`.
- **Cross-app reusable** (Debt + Freedom) — build it that way.
- **Exit:** demo enters and exits clean with the real data provably untouched; every surface showing
  demo money is marked as such **on screen and in the accessibility tree**.

### 1.2.2 — Native iPad

Genuinely adaptive, not a wrapper (Jason 2026-06-30: *"Not just a wrapper. Time spent to make it native
iPad."*).

- Flip `ios.supportsTablet` (currently `false`) and unlock `orientation` (currently `portrait`).
- Adaptive **split-view / sidebar** — entry list beside detail pane; a dashboard that uses the larger
  canvas; regular-vs-compact size classes; landscape + Split View / Stage Manager; hardware-keyboard
  niceties; native-layout iPad screenshots.
- `src/components/Screen.tsx` is the single wrapper for every screen — the natural size-class seam.
- ⚠️ **~2× the scoped size** (audit F3): sized against a 6-screen app, now 13.

### 1.2.3 — Guided onboarding (full coachmark tour)

- Value-prop intro + interactive first-run tour over **populated** views (hence demo mode first).
- Build the overlay/tooltip system **reusable across the three finance apps**.
- Render coach-marks **outside** gesture handlers — a `GestureDetector` swallows taps on native, and a
  tour whose tooltips don't respond on device is the failure mode.
- Calm, one-at-a-time, replayable, skippable.

### 1.2.4 — Accessibility depth audit

Dynamic Type · VoiceOver order and labels · touch-target sizes (44pt) · high-contrast · reduce-motion.

- ⚠️ **~2× the scoped size** (audit F3) — this scales purely with screen count, 6 → 13.
- Runs **after** the layout work so it sweeps the final surface, not one that's about to change.
- VoiceOver end-to-end is **device-owed** — the simulator and browser cannot fully stand in.

### 1.2.5 — iOS home-screen widget 🔒 **blocked on the external prerequisites above**

Today's earnings + the running set-aside total, glanceable without opening the app. Folded in per [D2].

- WidgetKit target mirroring Freedom v1's proven layout; App Group for data sharing.
- **The only native item in v1.2** — it is what drags a build + signing cycle into this version.
- Android's App Widget rides v1.3 alongside the Android launch.

### 1.2.6 — The filed v1.2 backlog (correctness + privacy polish)

Already filed against v1.2 in the portfolio backlog; folded in here so they don't go orphaned:

- 🔴 **IRS due dates don't shift for weekends/holidays** *(real correctness bug)* — Apr 15 / Jun 15 /
  Sep 15 / Jan 15 shift to the next business day, but `quarterlyDueDates.ts` uses the fixed rule, so
  **quarterly reminders can fire on the wrong day.**
- **Tax-profile completeness prompt** — a nudge for accuracy-affecting fields left empty (W2 YTD
  withholding, county for local tax), with a completeness score and deep-link.
- **Analytics/crash-reporting opt-out toggle** — a Settings switch gating `initAnalytics` /
  `initErrorReporting`. If added, restore the "opt out in Settings" line in the privacy policy.
- **Privacy/support pages: single source of truth** — point GitHub Pages at this repo's `docs/` (or add
  a sync step) so the hosted pages can't drift from the repo. This is the exact gap that caused the v1.1
  privacy mismatch. ⚠️ Interacts with the deferred "make the repo private" item: **Pages-on-private
  needs a paid plan, and a dead privacy URL is an App Store compliance issue.** Resolve together.

### 1.2.7 — Clear the lint ledger, then make lint a CI gate

The 14 findings surfaced when lint was wired up at the switch-in (audit F7). **Runs here, not earlier:**
`Screen.tsx` and the screens are rewritten by 1.2.0–1.2.2, so fixing them first is wasted work.

- 1 dead export (`totalCustomExpenses`) · 4 `setState`-in-effect sites · the
  `useRef(new Animated.Value()).current` idiom in `Screen.tsx`.
- **Calibration:** rules-of-React violations, **not observed defects** — nothing misbehaves today. They
  block the React Compiler and sit in the files this version rewrites anyway.
- Then add `npm run lint` to the `web-e2e` workflow. It was deliberately left out at the switch-in so
  the pipeline would not land red on a pre-existing ledger.

### 1.2.8 — Verify, device QA, and the whole-phase after-scan

- Playwright (web) + Maestro (native) green; both themes at parity — **light mode is held to the same
  bar as dark, not a back seat.**
- **Real-device TestFlight QA pass against a per-version full-surface checklist, native paths first.**
  Hard gate: no submission without it. This pass also owes: VoiceOver end-to-end (1.2.4), the widget on
  a real home screen (1.2.5), and iPad split-view on real hardware.
- **Pre-submit functional-correctness audit** — whole-surface, real-user lens.
- **Apple guideline compliance pass**, paywall findability included.
- **Whole-phase after-scan** across all of v1.2 — cross-item inconsistencies, coherence gaps, and
  lessons that apply retroactively to earlier items in the phase.
- Update `RELEASE_NOTES.md` per-item as work lands, not at submission time.

---

## Exit criteria for v1.2

A brand-new user can see the whole app working before logging anything; a guided tour teaches the core
loop over real-looking data; the app is genuinely native on iPad; the full surface passes an
accessibility depth audit; a home-screen widget shows today's set-aside; and the real data is provably
untouched by any of it.

---

## Open, and deliberately not resolved here

- **⏳ [D3] the ASA read** (~2026-08-06 exhaustion) and PostHog activation/retention numbers are still
  outstanding — see the audit's data-gated section. They don't change *whether* this block is right;
  they bear on whether retention work should overtake iPad within it.
- **⏳ The differentiation repositioning is owed and was NOT done at this switch-in.** The portfolio
  plan marks it "action at v1.2 switch-in": lead the store listing and in-app framing with the free
  live set-aside + multi-state/local correctness + W2 offset bundle and the "no bank switch, no 30%
  rule" line; reframe tax data as *earning optimization*. Only the plan and audit were produced on
  2026-08-07. It is store/ASO work rather than build work, so it fits a v1.2 wait-window — but
  promotion is first-class work, not filler, and this should not fall off.
- **Deferred, unchanged:** make the GitHub repo private (⚠️ check Pages first — see 1.2.6) · the "More"
  hub IA reframe. Both are marked "do when next active" and are candidates to fold into 1.2.6 if they
  prove cheap.

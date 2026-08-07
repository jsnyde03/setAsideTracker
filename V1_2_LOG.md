# v1.2 — Log

_The detail store for [V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md), which stays lean. Two things
live here: **scan records** (every before/after scan, at every level) and **completed-item detail**
(what shipped, how it was verified, what it surfaced). Newest on top within each section._

_It also holds **item specs for queued-but-not-active items** — decomposition belongs to the active
item only, so a queued item's spec waits here and is retrieved at its switch-in._

---

## Scan records

### 🔎 1.2.0.1 Install + entry point — SUB-TASK after-scan · 2026-08-07

**Result: done, exit criteria met.** `expo-router@56.2.18` + `react-native-screens@4.27.0` installed;
`"main"` → `expo-router/entry`; `scheme: "setasidetracker"` added; polyfill rehomed to
`app/_layout.tsx`; `index.ts` deleted (both its jobs rehomed). **17/17 Playwright green with zero test
edits · 245 unit tests · typecheck clean.**

⭐ **The version's one open viability risk is closed.** expo-router resolves cleanly against Expo SDK 56
/ RN 0.85 / React 19.2.3. **[D1] holds**; the audit's fallback option B is not needed.

**Design decision made during the step — strangler-fig, not big-bang.** `"main"` cannot flip to
`expo-router/entry` without a route tree to boot into, so rather than port 13 screens at once,
`app/index.tsx` re-exports the existing `App` and the whole app runs as a single route. **The app is
fully working after every sub-step**, and 1.2.0.4 extracts screens progressively. Recorded because it
changes what "done" looks like for the sub-steps that follow.

**What only surfaced by doing it:**
1. ⚠️ **The 1.2.0.1 / 1.2.0.2 boundary was wrong.** `app/_layout.tsx` had to exist for the entry point
   to flip at all, so it was created here. 1.2.0.2 is now *hoist providers into it*, not *create it*.
   Plan corrected in the same edit.
2. 🔴 **`react-native-screens` is a new NATIVE module and the native build is unvalidated.** Web green
   proves nothing about autolinking or the xcodeproj glob, both of which have broken this repo's iOS CI
   before. Filed as an **owed build pass on 1.2.0** rather than deferred to 1.2.9 — a three-week-late
   discovery here would invalidate work built on top of it. Admitted under queue category 2 (deferring
   makes later items unsafe).
3. ⚙️ **npm in this environment fails without `NODE_OPTIONS=--use-system-ca`** — the first
   `expo install` died on `ERR_SSL_WRONG_VERSION_NUMBER`; the identical command with that flag added 91
   packages. **This will recur on every install** (1.2.3, 1.2.6), and Playwright needs it too. Recorded
   so it is not rediscovered each time. _(Same root cause as the known Playwright CA quirk.)_
4. ⚙️ Windows `EPERM ... rmdir` warnings during npm's cleanup — non-fatal, file locks in `node_modules`.
   Noted only because a clean CI install may behave differently.
5. ❓ `react-native-screens` arrived **transitively** and is not declared in `apps/mobile/package.json`.
   Expo autolinking handles that, but it is worth an `expo-doctor` check when the native build runs.

**Enhancements surfaced → routed:** nothing folded in beyond the two corrections above; nothing new
deferred to the backlog. The step stayed scope-locked.


### 🔎 v1.2 — VERSION-LEVEL before-scan (viability + enhancement) · 2026-08-07

**Viability: GO.** The version is worth building and can be built. Its premise — *this app's value is
invisible until you've logged data* — was re-verified against the current code and holds: onboarding
collects a tax profile and hands the user a dashboard reading $0.00, and there is **zero** demo/seed
code anywhere in `apps/mobile/src`.

Standing on the 2026-08-07 structural audit (verdict **KEEP, no pivot**), plus:

- **Premium gap caught by Jason, now closed.** The version was 100% free-tier work, meaning existing
  subscribers would have received nothing — churn risk on the newly-converting cohort. Closed by [D3].
  **Root cause worth keeping: nothing in the process required a premium line per version.** Now it does.
- **One open viability risk, and it is genuinely open:** `expo-router`'s compatibility with Expo SDK 56
  / RN 0.85 / React 19.2.3 is **unverified** — it can't be confirmed without resolving the package.
  Deliberately front-loaded into the very first sub-step (1.2.0.1) so it fails fast and cheap rather
  than after screens have been ported. **If it fails, [D1] re-opens** and the fallback is the audit's
  option B (keep hand-rolled routing, ship a narrower iPad).
- **Schedule risk is real and is not build time.** ~13 build days to feature-complete. The binding
  constraint is 1.2.6's external chain (App Group → profile regeneration → CI signing → a native
  target that has broken iOS CI before). **Recommendation on record: cut the widget before cutting the
  date.**
- **Estimate corrections carried in** (audit F2/F3): iPad + a11y are ~2× their original sizing (scoped
  against 6 screens, now 13); demo mode is *cheaper* than its memory claims, because all persistence
  funnels through one flat `repository.ts`.

**Enhancements surfaced → routed.** Nothing folded in beyond what [D2]/[D3] already added; nothing new
deferred. The version's scope is considered closed at this scan.

---

### 🔎 1.2.0 Routing migration — TASK before-scan · 2026-08-07

**Method:** treated the plan as a hypothesis and checked each premise against the code at `db4a9a7`.

**Verified true**
- No navigation library of any kind. `App.tsx` is 593 lines; `type Screen` is a 13-member union;
  dispatch is sequential `if (screen === "x") return <X/>` early returns.
- All app state — `entries`, `taxProfile`, `localUserProfile`, `editingEntry`, `paywallOrigin`,
  `appLockEnabled`, `remindersEnabled`, `isLocked`, `lockAvailable` — lives inside `AppContent`.
- Providers already nest correctly (`SafeAreaProvider → ThemeProvider → PremiumProvider →
  ErrorBoundary`) but sit *inside* the single rendered component, not above a router.

**Corrected a premise I had asserted** ⚠️
- I flagged that swapping the entry point to `expo-router/entry` would silently drop the
  `react-native-get-random-values` polyfill that `index.ts` loads first, breaking encryption on Hermes
  while web tests still passed. **This is already defended:** `src/storage/encryption.ts:3` imports the
  polyfill itself as a side-effect, with a comment noting it is "also imported at the app entry point."
  Downgraded from landmine to migration check. *Recorded because the corrected version is the useful one.*

**The finding that most changes the estimate** ⭐
- **The 12 Playwright specs contain zero `getByTestId`.** They call `page.goto("/")` once in
  `helpers.ts` and then drive the app by visible text, exactly as a user would. The 11 Maestro flows do
  the same on native. **Consequence: the suites are coupled to the UI, not to the routing mechanism**,
  so a migration that preserves what's on screen leaves them essentially intact. This is the difference
  between a 1-file change and a 24-file change, and it is the main reason 1.2.0 is viable inside a
  13-day version.
- **Corollary constraint, now binding on 1.2.0.4:** preserve visible text and layout during the port.
  Any copy change made "while we're in there" costs a test fix. Copy changes belong in a later pass.

**New work the scan added to the sub-steps**
- `app.json` has **no `scheme`** — deep links need one (1.2.0.1).
- `paywallOrigin` exists only to emulate back-navigation. Real routing makes it meaningless: **delete
  rather than port** (1.2.0.6).
- Route guards must **admit** the not-yet-onboarded user, or they lock out the audience demo mode
  exists for — Debt's `3.5.4.3`, imported rather than rediscovered (1.2.0.5).

**Transferable lessons pulled from Debt's equivalent migration**
- Hoist the provider **above** the `Stack`, or sibling routes render unrelated state one tap away.
- **Do not trust a green e2e suite on a root-layout change.** Debt broke navigation app-wide while the
  suite stayed green, because a reload lands on the right URL regardless. Verify by looking (1.2.0.7).

**Enhancements surfaced → routed:** none folded in beyond the three sub-step additions above; nothing
deferred to the backlog. The migration is deliberately scope-locked to "same app, real routes" — every
adjacent improvement it makes *possible* (deep links, split-view, tour entry points) is owned by a
later item, not by this one.

---

## Queued item specs — retrieved at switch-in

### 1.2.1 — Demo mode
Reversible sample persona; never touches real data; exits clean. **Enforce isolation at
`src/storage/repository.ts`** — every read and write funnels through that one flat module (15 exported
async functions, no other persistence path), so the guarantee is checkable by inspecting one file.
Seeds the believable multi-platform persona `SCREENSHOT_PLAN.md` currently builds by hand, which
productionizes the screenshot seed and eases App Store/IAP review. Premium screens preview **populated**
but `subscribe`/`export` still route to the real paywall — show value, never grant entitlement; the seam
is `setPurchasesClient()`. Build cross-app reusable (Debt + Freedom). *Exit:* enters and exits clean
with real data provably untouched; every demo surface marked on screen **and in the a11y tree**.

### 1.2.2 — Premium slice
**Shift/earnings optimizer** (headline; pulled from v1.3; also delivers the owed earning-optimization
repositioning; soft-gate below ~30 entries — demo mode is what makes it demoable) · **safe-harbor
payment tracker** (payments made vs. required; completes what v1.1 half-built; needs a per-year
payments-made model following `amountSetAsideByYear`'s shape) · **per-quarter amount in reminders +
dashboard** (⚠️ `perQuarter` is *already* on `SafeHarborScreen.tsx:221` and in the PDF — this is a
surfacing fix; amount is premium, date stays free) · **expense-breakdown drill-down**. Gating check: all
four sit on the tax-time/complexity axis, never on the core set-aside job; additive, never blurring an
already-free section.

### 1.2.3 — Native iPad
Flip `ios.supportsTablet` (`false` today), unlock `orientation` (`portrait` today). Adaptive
split-view/sidebar, multi-column dashboard, size classes, Split View / Stage Manager, hardware-keyboard
niceties, native-layout screenshots. `src/components/Screen.tsx` is the single wrapper for every screen
— the natural size-class seam. ~2× the original estimate.

### 1.2.4 — Guided onboarding (full coachmark tour)
Value-prop intro + interactive first-run tour over **populated** views (hence demo mode first). Overlay/
tooltip system built **reusable across the three finance apps**. ⚠️ Render coach-marks **outside**
gesture handlers — a `GestureDetector` swallows taps on native, and a tour whose tooltips don't respond
on device is the failure mode. Calm, one-at-a-time, replayable, skippable.

### 1.2.5 — Accessibility depth audit
Dynamic Type · VoiceOver order and labels · 44pt touch targets · high-contrast · reduce-motion. Runs
**after** the layout work so it sweeps the final surface. ~2× original estimate. VoiceOver end-to-end is
device-owed (1.2.9).

### 1.2.6 — iOS home-screen widget 🔒
Today's earnings + running set-aside. WidgetKit target mirroring Freedom v1. **The only native item in
v1.2** and the #1 risk to the August date — its cost is external (capability → profile regeneration →
CI), not build time.

### 1.2.7 — Filed correctness backlog
🔴 **IRS due dates don't shift for weekends/holidays** — `quarterlyDueDates.ts` uses the fixed
Apr15/Jun15/Sep15/Jan15 rule, so reminders can fire on the wrong day. ⚠️ **Higher-stakes now that 1.2.2
puts a dollar amount in those reminders** — a wrong date carries a wrong payment instruction; consider
pulling into 1.2.2. Plus: tax-profile completeness prompt · analytics/crash opt-out toggle (restore the
privacy-policy line if added) · privacy/support pages single source of truth (⚠️ interacts with
repo→private: Pages-on-private needs a paid plan, and a dead privacy URL is a compliance issue).

### 1.2.8 — Lint ledger → CI gate
14 findings: 1 dead export (`totalCustomExpenses`), 4 `setState`-in-effect, and the
`useRef(new Animated.Value()).current` idiom in `Screen.tsx`. **Rules-of-React violations, not observed
defects** — nothing misbehaves today. Runs late because 1.2.0–1.2.3 rewrite these files. Then add
`npm run lint` to `web-e2e`.

### 1.2.9 — Verify · device QA · phase after-scan
Playwright + Maestro green, both themes at parity (**light held to the same bar as dark**) ·
**real-device TestFlight QA against a per-version full-surface checklist, native paths first — hard
gate** · pre-submit functional-correctness audit · Apple guideline pass incl. paywall findability ·
**whole-phase after-scan across all of v1.2** · `RELEASE_NOTES.md` updated per-item as work lands.

---

## Completed-item detail

_(none yet)_

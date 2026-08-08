# v1.2 — Log

_The detail store for [V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md), which stays lean. Two things
live here: **scan records** (every before/after scan, at every level) and **completed-item detail**
(what shipped, how it was verified, what it surfaced). Newest on top within each section._

_It also holds **item specs for queued-but-not-active items** — decomposition belongs to the active
item only, so a queued item's spec waits here and is retrieved at its switch-in._

---

## Scan records

### 🔎 1.2.0 Routing migration — WHOLE-ITEM after-scan · 2026-08-08

**Closed.** 23/23 e2e (4 new) · 245 unit · typecheck + lint clean (still exactly 14, none introduced) ·
every route looked at in both themes · iOS build validated on Codemagic. `App.tsx` — 593 lines, 13
sequential `if (screen === …)` branches — is deleted.

**What the item actually bought, beyond "it has routes now":** three pieces of state stopped existing.
`editingEntry` became a URL param, `paywallOrigin` became nothing (history already knew), and the boot
screen and lock became derivations. **Deleted state can't drift**, which is worth more than the routes.

**The pattern across all seven sub-steps — and the one thing to carry into 1.2.1:**
**every sub-step's real cost was found by the scan, not by the plan, and twice the green suite was
actively misleading.**
- 1.2.0.1: the suites drive by visible text → a 1-file change, not 24. *(De-risked the whole item.)*
- 1.2.0.2: 17 specs passed a provider rewrite **without exercising it once**.
- 1.2.0.3: 19 specs passed a rewiring of clear-data, restore **and** lock **without touching any**.
- 1.2.0.4: "same pixels" ≠ "same DOM" — a `Stack` keeps routes mounted, breaking 12 selectors.
- 1.2.0.7: **`router.back()` on a deep-linked route did nothing**, leaving a dead close button and
  force-quit as the only exit. No assertion could have caught it: every test reaches those screens by
  tapping through, the one path where plain `back()` was always fine. **Found by walking the routes
  with `goto()` and looking** — which is exactly what the "look at every route" exit condition is for.

**Three defects fixed that predate this item or were introduced by it:**
1. **Restore-from-backup applied only `appLockEnabled`** — a backup saved in dark mode rendered light
   until a cold start, and restored reminders were never rescheduled. *(Pre-existing.)*
2. **`saveAppSettings` clobbered neighbouring settings** on any independent write. *(Latent; would have
   become live the moment the theme moved.)*
3. **Dead close button on any deep-linked route.** *(Introduced by 1.2.0.4, fixed at 1.2.0.7.)*

**⚠️ Standing caveat, unchanged and important: all of this is web-verified.** The Maestro flows have not
run since the migration began, and `react-native-screens` is now doing real work under every screen.
The iOS build compiles — that is not the same as the app behaving. **1.2.9's device pass is carrying
more weight than it was three days ago**, and the untested clear-data / restore / lock paths are still
owed a Maestro flow.

**Replenishment:** 1.2.1 (demo mode) promoted to the active slot. **Recommended because it is the
bundle's designed lead** — reusable seed-data infrastructure that the premium optimizer, the onboarding
tour and the iPad pass all consume; each of those is unshowable or untestable on an empty account.

---

### 🔎 1.2.0.5 Route guards + 1.2.0.7 Verify — SUB-TASK after-scans · 2026-08-08

**1.2.0.5.** `RequireTaxProfile` on the 9 data-dependent routes, plus the reverse guard on
`/onboarding`. **Both close holes that 1.2.0.4 opened rather than pre-existing bugs:** the old dispatch
only rendered a screen when its data existed — which is why 8 routes still cast `taxProfile as
TaxProfile` — and real routing plus a declared `scheme` made those states addressable by URL and by
deep link. Without the reverse guard, a link to `/onboarding` would walk an existing user back through
setup and overwrite what they had. New `route-guards.spec.ts` pins all of it, including a loop over
every guarded route. **`RequireTaxProfile` is deliberately one component** so 1.2.1 widens it in one
line rather than nine.

**1.2.0.7.** Verification, and it earned its place: the visual sweep found the dead-close-button defect
that 23 green assertions did not. A temporary sweep spec walked all 11 routes in both themes; the
screenshots were **looked at**, not just captured. Deleted afterwards rather than left in the standing
suite, where it would slow every run without anyone diffing its output.

**Also recorded:** my test assertions were wrong twice more — `"What if I earned more?"` is the
*dashboard's button*, not the What-If screen's heading (`"What if…"`), and the reminders switch label
was invented. Both fixed by reading the source instead of guessing again. That is now four wrong
guesses about UI strings across this item; **read the component, don't recall it.**

### 🔎 1.2.0.4 Port the screens to routes — SUB-TASK after-scan · 2026-08-08

**Result: done, and it absorbed 1.2.0.6.** 12 route files under `app/`, plus `AppGate` (loading + lock)
and `ScreenFrame` (the themed background + status bar repeated verbatim in all thirteen dispatch
branches). **`App.tsx` is deleted** — the 593-line screen machine is gone. 19/19 e2e · 245 unit ·
typecheck + lint clean (still 14).

**Two pieces of state died rather than moved**, which is the real measure of the migration:
- **`editingEntry`** → an `?id=` param. Which entry you're editing is a property of *where you are*, so
  it belongs in the URL. Side effect: an edit screen now survives a reload, which the old state never did.
- **`paywallOrigin`** → nothing. It existed only to remember which of three screens to return to, and
  history knows that already. **1.2.0.6 is therefore closed here** — there was nothing left to delete
  separately.

**⚠️ The cost the before-scan missed, and the lesson in it.** The scan established that the suites drive
by visible text and concluded they'd survive "if the visible UI is preserved". The visible UI *was*
preserved — and 12 selectors broke anyway. **A `Stack` keeps the previous route MOUNTED as
`display:none` instead of unmounting it.** So while the entry form is open the dashboard is still in
the DOM, and the two share text: `DoorDash` is both a platform chip and an entry row; `0.00` is both
the gross-pay field and the dashboard's set-aside input. Selectors that were unambiguous only because
the old dispatch unmounted everything else became ambiguous or resolved to hidden elements.

**The premise was right and the conclusion was still incomplete** — "same pixels" is not "same DOM".
Worth carrying: the before-scan reasoned about what the user sees, and the tests query what exists.

Fixed with visibility-scoped helpers in `e2e/helpers.ts` (`visible`, `grossPayField`, `platformChip`)
rather than 12 ad-hoc patches, so the reason is documented once. **This is not a workaround** — the
helpers state what the tests always meant: the thing the user can see and could tap. Several were
weak before (`.first()` on a placeholder used eight times in one screen).

**Diagnostic note worth keeping: a failing suite is a SLOW suite.** Runs went from ~1.4 min green to
600s+ timing out, because each broken selector waits out a 30s visibility timeout. I initially read
that as a hang and waited on it twice; **Jason called it frozen, correctly.** The right move on a
suddenly-slow suite is `--retries=0 --reporter=line` to a file immediately, not patience.

**And I corrected a wrong guess by reading rather than guessing again:** I assumed "DoorDash leads
with…" was on the comparison screen and asserted against it; the failure showed it hidden, because it
is on the *dashboard teaser card* that opens that screen.

**Boundary shift, recorded:** `AppGate` had to move the loading + lock gate here — a gate wrapping every
screen can't live inside one of them once they're separate routes. **1.2.0.5 is now "harden the guards"
(admit the demo's not-yet-onboarded audience), not "build them."**

**Enhancements surfaced → routed:** `ScreenFrame` and the e2e helpers folded in (both required). Nothing
deferred. ⚠️ **Untouched and still owed:** the native surface — every route change here is web-verified
only, and the Maestro flows have not run since. That is 1.2.0.7's and 1.2.9's.


### 🔎 1.2.0.3 Lift app state above the router — SUB-TASK after-scan · 2026-08-08

**Result: done.** New `src/state/AppDataContext.tsx`, mounted above the `Stack`, owns
`localUserProfile` / `taxProfile` / `entries` plus `appLockEnabled` / `remindersEnabled`. **`App.tsx`
now imports nothing from `storage/`** — 591 → 577 lines, and, more to the point, it talks to data
through one hook instead of to persistence directly. **That is the seam demo mode (1.2.1) redirects.**
19/19 e2e · 245 unit · typecheck + lint clean (still exactly 14).

**Before-scan sorted the state into four groups, and only two moved.** App data and the two non-theme
settings lifted; **session/lock state stays** (it belongs with the route guards at 1.2.0.5) and
**navigation state stays** (it dissolves at 1.2.0.4). Lifting all of it at once would have dragged two
later sub-steps into this one.

**Design decision: the data layer throws; the caller owns the response.** Each of the nine handlers was
persist → set state → navigate → track, with `Alert` + `reportError` on failure. Only the first two
halves moved. Moving the rest would have put `Alert.alert` and navigation inside a data provider,
which is how a data layer stops being one.

**Two things became derived rather than stored, and both are strictly better:**
- **The boot screen.** It used to be decided inside the load effect, which made "which screen opens" a
  side effect of loading — the reason a failed load could strand the app on the spinner. Now
  `screen = navScreen ?? (settled ? (profile ? dashboard : onboarding) : loading)`, so navigation is an
  explicit override over a derivation.
- **`isLocked` → `unlocked`.** Tracking the *unlock* instead of the lock means the lock can't be left
  stale by a settings change: turning it off releases the screen immediately, and clearing all data
  (which turns it off) can't strand the user behind a lock guarding an app with no data in it.
- Bonus: both avoided `setState`-in-effect, so the lint ledger stayed at 14 rather than growing.

**What only surfaced by doing it:**
1. 🔴 **Clear-all-data, restore-from-backup and app-lock have no automated coverage at all** — no
   Playwright spec, no Maestro flow. **The suite went 19/19 across a rewiring of all three without
   exercising any of them.** They're `Alert`-driven and RN-Web doesn't render Alerts, so they can't be
   covered on web; Maestro is the only instrument that can see them. **Two are data-loss paths.**
   Filed to the backlog for 1.2.9 device QA + a Maestro flow. *This is the second time in three
   sub-steps that a green suite meant "nothing else broke" rather than "this works."*
2. ⚠️ **Ordering trap:** the derived `screen` referenced `lockAvailable` above its own declaration —
   caught by typecheck, but a reminder that derivations are order-sensitive in a way `useState` isn't.
3. ⚙️ `node -e` silently no-op'd a file write again (third time this session). Used Edit instead.
   The rule already exists in memory; recording that it recurred, not re-learning it.

**Enhancements surfaced → routed:** the two derivations folded in (both required by the move and both
reduce risk). The coverage gap deferred to 1.2.9 + backlog — it needs a device, so it can't close here.
Nothing else.


### 🔎 1.2.0.2 Hoist the provider stack — SUB-TASK after-scan · 2026-08-07

**Result: done.** Providers (`SafeAreaProvider → ThemeProvider → PremiumProvider → ErrorBoundary`) and
the three `init*` calls moved into `app/_layout.tsx` above the `Stack`; `App.tsx` is now a plain route
component. **19/19 e2e (2 new) · 245 unit · typecheck + lint clean · ports closed.**

**The knot the before-scan found, and how it was cut.** `colorScheme` lived in `App()` for exactly one
reason: `ThemeProvider` took it as a prop while `AppContent` needed to set it, and a component can't
consume a context it renders itself. That entangled 1.2.0.2 with 1.2.0.3 through a single value.
Resolved by **giving `ThemeProvider` the preference outright** — it loads and persists it, and exposes
`scheme` + `setScheme`. The lifted state disappears, and any route can now change the theme without
being prop-drilled from `App`, which is a precondition for screens becoming independent routes.

**Prerequisite it forced — and a latent bug it closed.** `saveAppSettings` did a wholesale write, and
three separate call sites each rebuilt the whole object from their own closure. Safe only while all
three lived in one component; the moment `ThemeProvider` wrote independently it would have clobbered
the other two. Added **`updateAppSettings`** (read-then-merge) alongside the existing full-write, so
restore keeps its overwrite semantics unchanged. Covered by a new regression test.

**⭐ Pre-existing bug found and fixed:** `handleRestoreBackup` applied only `appLockEnabled`, though
`restoreBackupSnapshot` writes all three settings to storage and its own comment says the caller should
sync in-memory state. So **restoring a backup saved in dark mode kept rendering light until a cold
start**, and a restored `remindersEnabled` was persisted but never acted on — the notification schedule
stayed whatever it had been. Now applies all three and re-runs schedule/cancel.

**What only surfaced by doing it:**
1. ⚠️ **A bug I introduced and caught before committing:** the `init*` calls were added to
   `_layout.tsx` while still present in `App.tsx` — double-initialising Sentry, analytics and
   RevenueCat. Found by checking imports after typecheck passed. *Typecheck does not flag this class;
   only reading the diff does.*
2. ⚠️ **The 17-spec suite passed the entire change without exercising it once.** There was no test over
   theme switching or restore. Green meant "nothing else broke", not "this works" — exactly the trap
   this plan quotes from Debt. Two specs added.
3. ⚠️ **My first two test attempts asserted against invented selectors and an over-specified artifact.**
   `getByLabel("Quarterly tax reminders")` didn't exist (the label is "Quarterly Due Date Reminders",
   and the `Switch` has no `accessibilityLabel` at all), and a cross-reload **screenshot equality**
   check passed only on retry. Replaced with property assertions. *Pin the intent, not the artifact.*
4. ⚠️ **A reload lands on the dashboard, not the screen you were on** — screen position is still React
   state at the strangler-fig stage. My test assumed otherwise. Documented in the spec, with a pointer
   to revisit at 1.2.0.4, which is what makes routes survive a reload.
5. 🔴 **Two real a11y defects → filed to 1.2.5** (backlog, not folded — both touch shared primitives
   used on every screen): `Chip` announces **no selected state** because RN-Web drops
   `accessibilityState={{ selected }}` on `role="button"`, and `Chip` is the app's selection primitive
   everywhere; the Settings `Switch`es carry no `accessibilityLabel`.
6. ⚙️ **Version-bump lesson** (from the parallel Codemagic run): bump `app.json`'s version at the START
   of a version's work. `1.1.1` was already approved, so the interim TestFlight upload was rejected —
   at precisely the moment an interim build was most useful. Bumped to `1.2.0`.

**Native build validated by that same run** — it compiled, signed and produced a valid `.ipa`, which
closes 1.2.0.1's owed native pass: `expo prebuild` survives the entry-point swap, `react-native-screens`
autolinks, and the new `scheme` doesn't disturb signing. Only the ASC upload failed, on the version.

**Enhancements surfaced → routed:** `updateAppSettings` and the restore fix folded in (both required by,
or directly adjacent to, the change). The two a11y defects deferred to 1.2.5. Nothing else.


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

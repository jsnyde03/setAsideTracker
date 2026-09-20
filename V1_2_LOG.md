# v1.2 — Log

_The detail store for [V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md), which stays lean. Two things
live here: **scan records** (every before/after scan, at every level) and **completed-item detail**
(what shipped, how it was verified, what it surfaced). Newest on top within each section._

_It also holds **item specs for queued-but-not-active items** — decomposition belongs to the active
item only, so a queued item's spec waits here and is retrieved at its switch-in._

---

## Scan records

### 🔎 1.2.1.5 Mark every demo surface — SUB-TASK after-scan · 2026-08-08

**Shipped.** `src/demo/DemoBanner.tsx`, rendered by `src/components/Screen.tsx`. Both candidate seams
were complete (13/13 screens use `Screen`, 12/12 routes use `ScreenFrame`); `Screen` won because it
is **inside** the `SafeAreaView`, so the bar clears the notch, and it is the same wrapper 1.2.3 will
use for size classes. No screen opts in and none can forget.

**A banner, not per-figure badges.** The confusing state isn't a number, it's a whole app — someone
entering from their own account sees a dashboard, a safe-harbor screen and a year-over-year chart all
showing a stranger's finances. Badging figures would be noise where it's least needed and would still
miss the charts. **Rendered first inside `Screen`**, which is the accessibility half of the exit line:
a VoiceOver user reaches it before any figure it qualifies. A marker placed after the content would
be technically "in the tree" and useless. **Tappable to exit** — a permanent bar announcing a state
with no way out of it sends people hunting through Settings. `primarySoft`, not `danger`: nothing is
wrong, and a red bar on every screen would read as an error for a healthy way to use the app.

---

### ⚠️ ⭐ The screenshot caught a defect four suites could not — and it was mine

The banner render looked right. The rest of the screen did not: the demo opened on
**"You're $85.63 behind — set aside an extra $14.27/week until Sep 15, 2026 to catch up."** Red
warning state, where `SCREENSHOT_PLAN.md` deliberately specifies green "on track" because a
reassurance sells better than a deficit — and because a demo opening on a warning misrepresents the
app's normal state.

**Mechanism.** `netAmountToSetAside = totalEstimatedTax − w2WithholdingYtdEstimate`, and that second
term is computed from **today** via `w2WithholdingYearFraction`. The target therefore moves through
the year while the entries do not. `SCREENSHOT_PLAN.md`'s literal **$1,400** was measured against a
≈ $1,384 target on one day in early July; by August the target was **$1,485.63** and the same
constant was $85 short.

⚡ **This is a correction to my own 1.2.1.2 after-scan.** It claimed *"Totals are unaffected … so the
green 'on track' state and every headline figure hold whenever the demo is entered."* The earnings
half is true and tested. The "on track" half was **false**, and asserting it is what let the defect
ship past a mutation-verified suite: the test I wrote checked earnings totals, which never moved, so
it could not fail. That test has been renamed to claim only what it proves.

**Fix.** The amount-set-aside is now **derived, not stated**: `buildDemoSeed` runs the app's own
`computeTaxEstimate` over the seeded entries and lands just above the result. Not circular —
`amountSetAsideByYear` is self-reported savings the estimate never reads. Regression test added and
**mutation-verified**: restoring the literal 1400 fails it and nothing else.

**The transferable lesson:** *a number copied from a document is a measurement, and measurements
have a date on them.* Both defects in this item came from the same place — absolute dates in the
persona (caught at 1.2.1.2) and an absolute dollar figure calibrated against them (caught only by
looking). The second was invisible to every automated check because the suites asserted the inputs,
which were faithful, rather than the rendered outcome, which was wrong.

---

**Health:** 30/30 Playwright (2 new) · 191 unit · typecheck clean · lint 14, none introduced.

### 🔎 1.2.1.4 EXTENDED — demo entry for onboarded users ([D6]) · 2026-08-08

**Jason, 2026-08-08:** *"There should be a way to access the demo for already onboarded users."*
Settled as **[D6]**; the backlog question raised at the after-scan is closed and removed from it.

**Shipped.** One Settings section with two states rather than two sections — the same row enters or
exits depending on `isDemo`. Entering from Settings routes to the dashboard rather than staying put:
a Settings screen whose profile name has quietly become someone else's reads as a bug, not as "you
are now in a demo". No confirmation Alert: real data is genuinely safe, so a warning would be
dishonest — and `Alert` doesn't render under react-native-web, so it would also be untestable here.

⭐ **This is what made the item's exit line testable.** "Real data provably untouched" could only be
asserted at the unit level while the demo was reachable solely from onboarding — a real account had
no way in, so no test could round-trip. There is now an e2e that onboards, logs a real entry, enters
the demo from Settings, adds a $999 entry inside it, exits, and finds the real entry back and the
demo's gone — **through the UI only, never touching storage to set up or to assert** — then reloads
to prove it is persisted state rather than a lucky in-memory render. **28/28.**

**Two test-authoring corrections, both mine, both worth recording:**

1. **The persona uses Instacart.** The first version had the "real" entry on Instacart and asserted it
   was absent inside the demo — but the demo has three Instacart entries, so the locator resolved to
   4 elements. The real entry is now **Spark**, which the persona deliberately does not use. A test
   distinguishing two data sets has to pick a value only one of them can produce.
2. **A `sed` left a `/g` flag** on the label regexes. A global regex carries `lastIndex` between
   calls, so it matches inconsistently across repeated locator evaluations — a flake generator.
   Removed. Bulk-editing test selectors by regex is how that gets introduced silently.

### 🔎 1.2.1.4 Enter/exit wiring — SUB-TASK after-scan · 2026-08-08

**Shipped.** `src/demo/DemoContext.tsx` — a provider inside `AppDataProvider` (both transitions must
re-read through it) exposing `isDemo` / `enterDemo` / `exitDemo`. Entry affordance on onboarding
("Explore with sample data", secondary to Continue by design); exit as the **first** section in
Settings, above Premium, because once someone is in a demo the most important thing that screen
offers is the way out. 4 new Playwright specs → **27/27**.

⭐ **`RequireTaxProfile` did NOT need widening, and the plan said it would.** The item spec carried
that over from Debt's `3.5.4.3`, where a blanket onboarding guard locked out the demo's own audience.
It does not transfer: **this demo seeds a profile**, so `localUserProfile` and `taxProfile` are both
non-null the moment `reload()` completes, and every guard passes untouched. A planned change to a
security-shaped guard was deleted rather than made — the better outcome, and only visible because the
premise was checked against the code instead of implemented on faith.

**Three ordering decisions, each with a failure mode behind it:**

1. **Entering rolls back.** If `reload()` throws after the store swap, the app would show real data
   while every write lands in the demo store — indistinguishable, to the user, from their edits
   silently not saving. On failure it now exits demo, re-reads, and rethrows.
2. **Leaving flips `isDemo` *before* the re-read.** The demo store is already gone at that point, so
   no render in between may still be claiming demo. There is nothing to roll back to; leaving is
   always safe.
3. **Exit routes to `/` unconditionally, never conditionally to `/onboarding`** the way
   `handleRestoreBackup` does. That handler can decide, because `restored` is a fresh snapshot; the
   exit handler's closure holds the **demo's** values, which cannot answer "does the real account
   have a profile?". The dashboard route already derives that redirect from freshly-loaded data.

**`useDemo()` returns a safe default rather than throwing**, unlike `useAppData`. Demo is an additive
overlay — a screen rendered without the provider should behave as the normal app, not crash.

**⚠️ e2e lesson, and it cost a red run.** `page.reload()` does not return to the dashboard:
expo-router keeps the URL on web, so reloading from Settings lands back on **/settings**. The failing
assertion had nothing to do with demo mode, and the failure screenshot showed the app behaving
correctly — including, usefully, that Settings rendered **no "Sample data" section** for a real
account. Looking at the artifact separated "my test is wrong" from "the app is wrong" immediately.

**Confirmed still owed:** demo money currently appears on the dashboard with **no marking at all**.
1.2.1.5 is doing necessary work, not polish.

### 🔎 Maestro dispatch #1 — TRIAGED · 2026-08-08

**Verdict: INFRASTRUCTURE. Not signal.** It died at **step 7, `Build the app for the iOS Simulator`**
— so `simctl`, Maestro and the flows themselves never ran. **The rewritten selectors and the
stacked-route accessibility hierarchy remain completely unvalidated**, exactly as before the
dispatch. The pre-registered triage rule called this correctly: a failure at or before `xcodebuild`
is a `codemagic.yaml` problem.

**Root cause, from the trace:** `error: Auth token is required for this request` out of `sentry-cli`,
then `+ exit 1` and `PhaseScriptExecution Bundle React Native code and images` failing the build.
The Maestro workflow's `environment:` was only `node: 22` — it deliberately omits the `AppleConnect`
group (a simulator build needs no signing), **and that group is also where `SENTRY_AUTH_TOKEN` comes
from.** With no token and `SENTRY_DISABLE_AUTO_UPLOAD` unset rather than `"true"`, the upload step
ran, failed, and took the phase with it.

⚡ **This was predicted in writing and still happened.** The TestFlight workflow's own comment records
that in `@sentry/react-native` 7.11.0 an upload failure fails the entire build and
`SENTRY_ALLOW_FAILURE` is *not* honored, with the stated recovery being to set
`SENTRY_DISABLE_AUTO_UPLOAD` back to `"true"`. The note was written about the release workflow; the
failure landed on the simulator workflow, which was created later and never inherited the warning.

**Fixed:** `SENTRY_DISABLE_AUTO_UPLOAD: "true"` added to the Maestro workflow. Disabling the upload
beats adding the token — a throwaway simulator binary's source maps have no business in Sentry, and
this keeps a secret and a network round-trip out of the test workflow.

**Predicted next false-failure, checked and RULED OUT.** The Maestro workflow also lacks
`EXPO_PUBLIC_RC_IOS_KEY`, which looked like it could leave `premium-paywall.yaml` asserting against a
paywall with no products. It can't: `PaywallScreen.tsx:277` renders `accessibilityLabel="Subscribe"`
unconditionally, and the flow asserts only static copy, never a price. No change needed.

**⚠️ Still untested downstream of the build:** the `xcrun simctl boot "iPhone 15" || true` line. The
runner reported **Xcode 26.4**; if that image has no iPhone 15, the swallowed boot failure surfaces as
an *install* failure and misreads as an app problem. Unchanged and unverified — the build never got
that far. Keep it in the triage rule for dispatch #2.

### 🔎 1.2.1.3 Plug the non-repository leaks — SUB-TASK after-scan · 2026-08-08

**Shipped.** Three guards, each at a single choke point: `maybeRequestReview` (`appReview.ts`),
`scheduleQuarterlyReminders` **and** `cancelQuarterlyReminders` (`notifications/scheduleReminders.ts`),
and `trackEvent` (`analytics.ts`). 9 tests, each written as a **pair** — guarded behaviour *and* the
unguarded behaviour — so a guard that simply always returned false would fail the other half.

**The flag moved to its own module, and the store reference went with it.** `src/demo/demoMode.ts`,
pure, no react-native. Two of the three guarded modules are deliberately import-light so their unit
tests run in plain Node; importing `repository.ts` for the flag would have dragged AsyncStorage and
`react-native` into all of them. The **store reference itself** lives there too rather than a
mirrored boolean — two things that must agree eventually don't. `repository.ts`'s `backend()` now
reads `getDemoStore() ?? AsyncStorage` and is still a one-expression, inspectable guarantee.

**Found during implementation, and the before-scan could not have seen it:**

1. 🔴 **`cancelQuarterlyReminders` needed guarding for the *opposite* reason to the scheduler, and
   this is the one that was nearly missed.** The before-scan flagged demo *scheduling* real
   reminders. But cancel calls `cancelAllScheduledNotificationsAsync()` — **every** scheduled
   notification on the device, demo's or not. A visitor flicking the reminders toggle inside the demo
   would have silently deleted the real user's genuine quarterly reminders. Data loss, disguised as a
   no-op, on the tax dates the app exists to protect. Guarded and tested.
2. **The scheduler guard had to sit ABOVE `requestPermissionsAsync`.** Otherwise a demo raises the
   notifications permission dialog — a one-shot system prompt the real app wants to ask for on its
   own terms, at a moment that means something.
3. **Analytics drops rather than tags.** A `demo: true` property still puts the event in the funnel,
   where every query would need to remember to exclude it forever, and the first that forgets reports
   a number that isn't true. Demo traffic is exactly what would distort the **[D3-ASA]** read. Dev
   console logging still fires, so demo behaviour stays visible while working on it.

**⚠️ Test-infrastructure trap, worth remembering.** The first run of these tests failed 3/9, and the
failure was in the *test*, not the guards: `vi.resetModules()` gives every dynamic `import()` a fresh
module graph, including a fresh `demoMode`. Toggling the demo flag on a **statically**-imported
`demoMode` therefore toggled a different instance than the module under test, and every guard read
`false`. The dangerous version of this mistake is the inverse — a guard test that passes because the
flag was never actually set — which would have looked exactly like proof. Loaders now return
`demoMode` from the same graph.

**Health:** 190 mobile unit tests (was 181) · typecheck clean · lint 14, none introduced.

### 🔎 1.2.1.2 Seed generator — SUB-TASK after-scan · 2026-08-08

**Shipped.** `src/demo/demoSeed.ts` — `buildDemoSeed(now = new Date())`, the Maya persona ported from
`SCREENSHOT_PLAN.md` with every date expressed as **days before today** and materialised at seed
time. 29 tests, `now` injected so the calendar behaviour is testable without touching the clock.

**The staleness risk was measured, not assumed.** `calculations.ts:177` — `entriesForYear` filters by
`entry.date.startsWith("2026-")`. So the absolute-dated persona wouldn't merely look old on 1
January, it would **vanish from the dashboard entirely**. That is what made relative dates a
requirement rather than a nicety.

**The January case, and why it compresses rather than shifts.** The persona spans 52 days; early in a
calendar year there isn't that much room before the tax year begins. Spilling into December would
re-create the exact defect above, so the span is **compressed proportionally** into whatever room
exists. Entries stay ordered, stay in the past, stay in-year. **Totals are unaffected** — all 20
entries always present at their original amounts — so the green "on track" state and every headline
figure hold whenever the demo is entered. Tested at seven dates including a leap day, 31 December,
and 1 January (the degenerate no-room edge).

**The port is faithful, and that is verified rather than eyeballed.** The test asserts gross + tips
**= $6,213**, which matches the sanity-check figure `SCREENSHOT_PLAN.md` states independently. A
transcription slip in any of the 20 rows breaks it.

**Surfaced during implementation:**

1. **The theme had to be deliberately excluded from the seed.** The persona's backup file carries
   `colorScheme: "dark"`, and seeding it would flip the visitor's app to dark — the most visible
   possible reach outside the sandbox, and on a preference the demo has no business touching. The
   seed omits it; the theme has lived outside this data since 1.2.0.2 anyway.
2. **`remindersEnabled: false` is in the seed, and it is a coupling 1.2.1.3 must honour.** The seed
   supplies the *state*; 1.2.1.3 prevents the scheduling *call*. Either alone leaves demo and reality
   disagreeing — a toggle reading "on" with nothing scheduled, or reminders scheduled from demo data.
3. **A demo entered on 1–2 January shows the entries bunched onto ~one day.** Correct, and harmless
   for the demo's job, but bad for store screenshots. Documented in the module; belongs with the
   already-filed `SCREENSHOT_PLAN.md` backlog item.

### 🔎 1.2.1.1 Demo store — SUB-TASK after-scan · 2026-08-08

**Shipped.** `src/storage/demoStore.ts` (pure, no imports — same reason `appReviewPolicy.ts` was
split out of `appReview.ts`: it stays testable in plain Node) exposing `KeyValueStore` +
`createDemoStore()`. `repository.ts` gained one variable and one function — `demoStore` and
`backend()` — plus `enterDemoMode(seed)` / `exitDemoMode()` / `isDemoModeActive()`. Every read and
write now routes through `backend()`; **`grep "AsyncStorage\." repository.ts` returns nothing**, which
is the inspectable form of the guarantee.

**Design property, deliberate: the demo store is in-memory and NOTHING is persisted** — not the seed,
not what a visitor adds, not a "was in demo" flag. That makes isolation structural rather than
careful: there is no demo artifact a later bug could fail to clean up, and `exitDemoMode()` is a
one-line reference drop because releasing it *is* the cleanup.

**Green was verified, not assumed.** Mutating `backend()` to `return AsyncStorage` failed exactly the
two isolation tests and nothing else — so those tests depend on the mechanism rather than restating
it. 8 new tests · 152 mobile unit (was 144) · typecheck clean · lint still 14, none introduced.

**Surfaced during implementation (the before-scan structurally could not have caught these):**

1. **The premium cache had to be exempted.** Routing `cachedPremium` into the demo store would mean a
   renewal or purchase landing while someone explores the demo gets cached nowhere and is lost on
   exit. Premium is Apple-ID-scoped, not local-data-scoped — the same reasoning `clearAllLocalData`
   already used. **Resolved in-item:** `readJson`/`writeJson` take an optional `store`, and the two
   premium functions pass `AsyncStorage` explicitly. It is the only override, and it is tested.
2. **Demo state does not survive a relaunch.** Correct and intended, but it has a *product*
   consequence 1.2.1.4 now owns: if iOS kills the app mid-demo, the visitor returns to onboarding
   rather than the demo. Noted on that sub-step.
3. **Callers must pair both transitions with `reload()`** or the provider shows demo data it can no
   longer write to. Documented on both functions; 1.2.1.4 wires it.
4. **Nothing stops future code importing AsyncStorage directly** and bypassing the guarantee — the
   comment asks, but nothing enforces. → **filed to the backlog for 1.2.8**, which is already the
   lint-rule/CI item.

### 🔎 1.2.1 Demo mode — TASK before-scan · 2026-08-08

**Premises verified against current code, not assumed.** Four held, one did not, and the one that
did not is the item's central claim.

**Held.** `src/storage/repository.ts` is one flat module (**16** exports, not the spec's 15) and
`AppDataProvider` reaches storage only through it · `reload()` exists, aliased to `load` ·
`RequireTaxProfile` is genuinely a one-line widen · the `setPurchasesClient()` seam is real.

**Better than the spec knew.** The persona is already authored as a **valid backup file** —
`store-assets/reference-screenshots/maya-persona-backup.json`, version 1, 20 entries, W2 +
prior-year filed tax + amount-set-aside. `parseBackupSnapshot` already validates that exact shape,
so the seed is a port, not an invention.

**Did NOT hold — "no other persistence path."** Three writes bypass the repository:

| path | where | consequence in demo |
|---|---|---|
| 🔴 review prompt | `appReview.ts` → `gigTaxTracker:reviewRequested`, raw AsyncStorage | `maybeRequestReview` fires on every entry save (`app/entry.tsx:38`); threshold is **5** and demo seeds **20**. The flag is **one-shot** — a visitor poking at sample data permanently burns the real user's single App Store review request. Irreversible. |
| 🔴 OS notifications | `scheduleQuarterlyReminders()` from `app/onboarding.tsx:28` + two sites in `app/settings.tsx` | demo data schedules **real** quarterly reminders if demo entry routes through onboarding-complete |
| 🟠 analytics | `trackEvent` at `entry_logged`, `onboarding_completed`, **`paywall_viewed`** | demo exploration pollutes the exact funnel the outstanding **[D3-ASA]** read depends on |

So isolation is checkable at **three** files, not one. Cheap to plug, but only if it is a named
sub-step — hence 1.2.1.3.

**Two more surfaced.** (a) The persona's dates are **absolute** (May–Jun 2026,
`amountSetAsideByYear: {"2026": …}`) — a demo that imports that file **goes stale in January**, so
the seed must generate dates relative to today. Hence 1.2.1.2. (b) `AsyncStorage.removeMany` in
`clearAllLocalData` looked wrong; checked against the v3 type defs (`async-storage@3.1.1` — v3
renamed `multiRemove` → `removeMany`) and it is **correct**. No defect. Recorded because the next
reader will have the same suspicion.

**Design tension found — resolved by [D5].** The exit line wants premium screens to preview
populated while `subscribe`/`export` still hit the real paywall, but `isPremium` is a **single
boolean** read at 4 sites (`AddEntryScreen`, `DashboardScreen`, `PaywallScreen`, `SettingsScreen`)
and no "preview" concept exists anywhere. Options put to Jason: **(A)** a separate `isDemoPreview`
consumed alongside `isPremium` at the gate sites, with the two *action* paths (purchase, PDF
export) still checking `isPremium` alone; **(B)** make `usePremium()` return true in demo and guard
the actions separately; **(C)** no premium preview in demo. **Jason chose A, 2026-08-08** — it keeps
the entitlement boolean honest and un-fakeable, which matters because every future gate site
inherits whatever is decided here. B makes the boolean a lie that later code will trust; C removes
the stated reason 1.2.1 runs before 1.2.2.

**Filed to the backlog, not folded:** consolidating `appReview.ts`'s direct AsyncStorage write into
the repository (architecture, not a demo blocker) · pointing `SCREENSHOT_PLAN.md` at the demo seed
so the persona stops having two sources of truth.

### 🔎 1.2.0.8 Close the native-verification gap — after-scan · 2026-08-08

**Result: closed as far as it can honestly be closed.** 23/23 e2e · typecheck + lint clean (still 14).

**The before-scan found the root cause, and it wasn't the tests.** The audit assumed the fix was
"write more Maestro flows". Reading the code first showed the actual problem: **`TextField` renders a
visible label but never associates it with its input** — no `accessibilityLabel`, no association at
all. So every text field in the app is an unnamed box to a screen reader, and the *only* handle a test
ever had was the placeholder plus an index. **The fragility was a symptom of an accessibility bug.**

Fixing it (label → `accessibilityLabel`, hint → `accessibilityHint`, and the visible `Text` hidden
from assistive tech so it isn't announced twice and doesn't put a duplicate in the hierarchy) did four
things at once: named every field for VoiceOver, removed 7 index-based Maestro selectors, let the
Playwright helper target by name, and pre-emptively cleared part of what 1.2.5's a11y audit would have
found anyway.

**Proof the fix is real, not just non-breaking:** the Playwright helper was switched from
`getByPlaceholder("0.00")` to `getByLabel("Gross pay")`. It passes — which it could not do if the
accessible name hadn't landed. A "23/23 still green" on its own would have proven nothing.

**Coverage, honestly split:**
- **Automatable → automated.** `clear-all-data.yaml` drives the full path: destructive Alert →
  confirm → land on onboarding → re-onboard → the logged entry is provably gone. Runs **last** in the
  config, since it destroys the data every other flow depends on.
- **Not automatable → written down.** Restore needs the native document picker; app-lock needs a
  biometric prompt. Neither can be driven by any harness. They are now explicit gates in
  `V1_2_TESTFLIGHT_CHECKLIST.md` §A with what specifically to watch — including that a restore from a
  differently-themed backup must change the theme, the bug 1.2.0.2 fixed.

**⚠️ The honest limit of this step: I cannot run Maestro here.** No macOS, no simulator. Five flows had
their selectors rewritten and one flow is brand new, and **none of it has executed once.** The
`maestro-ios` workflow comment and the checklist both now say so plainly: **the first dispatch is the
validation pass, not a regression check.** Writing flows I can't run is worth doing — but claiming
they work would not be.

**Fifth wrong UI-string guess, caught by reading:** the destructive confirm button is
**"Clear Everything"**, not "Clear". Had it shipped, the flow would have failed as *"the dialog never
appeared"* — which reads like an app bug rather than a flow bug, and would have cost a whole mac CI
cycle to diagnose. **Read the component; don't recall it.**

**Enhancements surfaced → routed:** the `TextField` a11y fix folded in (it *is* the root cause). The
`Chip` and `Switch` a11y defects stay filed for 1.2.5 — same class, but they need decisions about
roles that belong in the audit that sweeps every screen.

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

> ### ⚠️ Renumber map — 2026-09-20
>
> Two items were admitted ([D7]/[D8]) and the widget was cut, which shifted everything after 1.2.1.
> **Any reference dated before 2026-09-20 — in this log, in a scan record, in a commit message — uses
> the OLD numbering.** Read it through this map:
>
> _This is the **single** map for 2026-09-20 — old number → **final** number. The queue was edited
> twice today (Jason's two items, then the gap-scan restructure); only the end state is recorded, so
> there is one mapping to apply rather than a chain._
>
> | old | final | item |
> |---|---|---|
> | — | **1.2.2** | 🔴 Tax-correctness block _(new — gap scan)_ |
> | — | **1.2.3** | 🔴 Data-safety block _(new — gap scan)_ |
> | — | **1.2.4** | ⭐ Set-aside split by date and week _(new — [D7])_ |
> | — | **1.2.5** | ⭐ Mileage trip toggle _(new — [D8])_ |
> | 1.2.2 | 1.2.6 | Premium slice |
> | 1.2.3 | 1.2.7 | Native iPad |
> | 1.2.4 | 1.2.8 | Guided onboarding tour |
> | 1.2.5 | 1.2.9 | Accessibility depth audit |
> | 1.2.6 | — | iOS widget → **cut to v1.3** |
> | 1.2.7 | 1.2.10 | Filed correctness + submission-compliance backlog |
> | 1.2.8 | 1.2.11 | Lint ledger → CI gate |
> | 1.2.9 | 1.2.12 | Verify · device QA · phase after-scan |

### 1.2.1 — Demo mode
⬆️ **Retrieved and superseded 2026-08-08.** It is the active item; its decomposition lives in
[V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md) and its before-scan record is above. _(The spec's
"no other persistence path" claim was measured false at switch-in — do not re-import it from here.)_

### 1.2.2 — 🔴 Tax-correctness block _(new 2026-09-20, gap scan)_

**Four findings, every one understating what the user owes. All live in v1.1.1.** Each was
re-verified by this session against the code before admission — the agents' stated mechanisms are
recorded as hypotheses that happened to hold, not as authority.

**(a) Safe harbor compares a partial-year tax to a full-year withholding. ✅ VERIFIED.**
`estimatedPaymentsNeeded = Math.max(0, requiredAnnualPayment - federalWithholding)`
(`calculations.ts:511`). The required payment is 90% of a tax built from `computeTaxEstimate(entries,
…)` — entries logged **so far** (`SafeHarborScreen.tsx:60`). `federalWithholding` is
`w2FederalWithholdingYtdEstimate`, which in the no-pay-stub path is assigned `annualFederalEstimate`,
the **whole year's** (`calculations.ts:312`). ⚠️ **The variable says Ytd; the value is annual.** In
March a W2+gig user gets `estimatedPaymentsNeeded = 0` and `noPenaltyExpected = true` (`:515`) — and
`underDeMinimis` on the line above fires independently, so both routes to "you're fine" are open.
Through both spring deadlines, on the one premium screen whose whole job is penalty avoidance.
⭐ **Blast radius checked, not assumed:** the same asymmetry does **not** break the headline
`netAmountToSetAside` — there full-year W2 tax and full-year W2 withholding sit on opposite sides of
one subtraction and cancel to gig-only tax, which is correct. Confined to safe harbor.

**(b) Married Filing Jointly collects no spouse income. ✅ VERIFIED.** `grep -ri spouse` across
`apps/` and `services/` returns **nothing**. MFJ is offered (`OnboardingScreen.tsx:33`) and
`TaxProfile` (`types.ts:12-46`) carries one set of W2 fields — the user's own. A married gig worker's
profit is taxed from the bottom of the MFJ brackets instead of stacking on the spouse's income.
Systematically low, silently, for most married users.

**(c) GA, SC and MN dependent exemptions are modelled as dollar-for-dollar tax CREDITS. ✅ VERIFIED
ON BOTH HALVES.** `calculateAvailableStateCredit` computes `perDependent × numberOfChildren`
(`stateTax.ts:34`) and it lands as `creditApplied = Math.min(availableCredit, stateLevelTax)`
(`:171`) — a direct reduction of **tax owed**. Configured GA `4000` (`stateTaxConfigs/2026.ts:191`),
MN `5300` (`:749`), SC `4930` (`:1081`). ⚠️ **The agent cited `taxYears/2026.ts`; the file is
`stateTaxConfigs/2026.ts` — line numbers exactly right, directory wrong.** Internal evidence: the
genuine credits in the same file are AR 29, DE 110, NE 176, OR 256, two orders of magnitude smaller;
and VT already models an exemption correctly by folding it into `standardDeduction`. **Tax law
confirmed against sources, not recall:** all three are subtractions from income — GA per O.C.G.A.
§48-7-26 ("allowed as a deduction in computing Georgia taxable income"), MN and SC per their
departments of revenue and SC Code §12-6-1140. **The values are right; the SLOT is wrong.** Effect: a
GA single filer with 2 dependents on $40k profit is told **$0** Georgia tax instead of ~$891.
🔍 **Surfaced while confirming:** GA's exemption is rising $4,000 → $5,000 (then +$125/yr to $6,000
from 2027) and the config still says 4000 — **effective year not yet confirmed; check it with the
fix.** There is no staleness review over the state configs at all.

**(d) Dependents are counted in the tax owed but not in the withholding credited.** `calculations.ts:316`
subtracts a W2-withholding estimate that omits the CTC and state dependent credits
(`w2Withholding.ts:27-33`; `numberOfChildren` defaults to 0 at `stateTax.ts:96`) from a combined total
that includes both (`estimate.ts:65,71-77`). The module's "accurate W-4" assumption omits W-4 Step 3,
which is $2,000/child. Agent's worked example — **not independently re-derived by this session, treat
as indicative**: MFJ, 2 kids, $60k W2 + $20k gig → app says set aside $656, true balance due ~$3,496.

**Exit line:** all four corrected with tests that would have caught them; the GA/SC/MN fix moves those
three to the income-subtraction path VT already uses; no feature item renders a number this block
has not corrected first.

### 1.2.3 — 🔴 Data-safety block _(new 2026-09-20, gap scan)_

**(a) A decryption failure has no recovery path, and the key can be silently replaced.**
`repository.ts:99-106` falls back to `JSON.parse(raw)` on ciphertext, which throws and escapes as a
generic `loadError`. Worse: `getOrCreateEncryptionKey` **mints a fresh key** when SecureStore returns
null (`encryption.ts:44-48`) — so a Keystore reset makes existing data permanently unreadable on the
next write. AES-CBC with no MAC (`cryptoCore.ts:13-19`) means wrong key, truncation and tampering are
indistinguishable from each other.

**(b) No write anywhere is error-handled.** Load is wrapped; no write is (`AppDataContext.tsx:112-160`).
`setAppLockEnabled` and `setRemindersEnabled` set state **before** awaiting the write (`:162-169`), so
a failed write shows the user an app lock they do not have. Entry writes are unguarded
read-modify-write over the whole array — while `updateAppSettings` was explicitly hardened against
exactly that (`repository.ts:170-182`), so the pattern was known and not generalised.

⚠️ **Pairs with the backup-restore validation hole** already filed at 1.2.10: together they are the
whole data-durability story, and the app currently has no automatic backup either (deferred).

### 1.2.4 — ⭐ Set-aside split by date and week _(new 2026-09-20, [D7])_

**The gap, in Jason's words:** *"Having one big lump sum to set aside makes it hard to keep track."*

**Measured at admission — the premises, checked against the code, not assumed:**
- The dashboard renders `netAmountToSetAside` — a **year-to-date cumulative** figure — as one 32pt
  number (`DashboardScreen.tsx:282`). What's been saved is a single hand-typed total,
  `amountSetAsideByYear[year]` (`:158`). One number owed, one number saved, for the whole year.
- **There is no week or period concept anywhere in the app.** Grepped. The sole weekly figure is
  `weeklyCatchUpAmount` (`calculations.ts:152`), and it only renders **when already behind**
  (`DashboardScreen.tsx:412`) — a remediation message, not a rhythm. ⭐ This is the finding that makes
  the item structural rather than a display tweak.
- **The schema cost is small, and this was measured not inferred.** `parseBackupSnapshot` passes
  `candidate.entries` through wholesale after an `Array.isArray` check (`backup.ts:51`, `:60`) — no
  per-field reconstruction — so a new optional `Entry` field round-trips through backup for free,
  exactly as `hoursWorked` / `customExpenses` / `mileageLog` already do. ⚠️ The same read surfaced the
  restore-validation hole now filed against 1.2.10; **the fix there must stay forward-compatible or it
  breaks this property.**

**The design rule that makes it trustworthy — [D7].** Tax is progressive, so a per-period figure
derived from the year's *average* rate **moves retroactively** every time the user earns more: open the
app in November and last July's number has changed. That is the opposite of trackable. So each entry's
set-aside is **frozen at the rate in effect when it was logged**, stored as one optional field; the
weekly row sums its entries; the existing catch-up line reconciles the drift against the true year
total. Stable history, and the reconciliation mechanism already exists.

**Shape:** per-entry figure (by date) → rolls up to a weekly total → weekly sits alongside, not
instead of, the YTD lump. Free tier — this is the core set-aside job, not the tax-time axis.

**Open at switch-in:** which week boundary (ISO Mon–Sun vs. the user's own pay week) · whether a
pre-existing entry with no frozen field back-fills at the current rate or renders as "—" · whether the
weekly row is on the dashboard or a drill-down.

### 1.2.5 — ⭐ Mileage trip toggle 🔧 _(new 2026-09-20, [D8])_

**The gap:** mileage is a **hand-typed number** — a text input at `AddEntryScreen.tsx:61`, parsed at
`:138`. That is the entire mechanism. Free tier.

**Measured at admission:**
- `MileageLog` (purpose / startLocation / endLocation) already exists as Premium free text
  (`types.ts:98-106`), and its own docstring calls itself *"the data-model groundwork for v1.3
  GPS-assisted mileage, which will populate the same shape."* ⚠️ **Flagged as a carried premise, not a
  measurement** — the shape is there; whether it is the right shape for captured trips is a
  switch-in question, not a settled one.
- **Zero implementation groundwork.** No `expo-location`, nothing location-related in `app.json` —
  both grepped. The type is all that exists.

**Scope — [D8]: toggle only.** Start/stop trip capture on **when-in-use** location, populating the
existing `MileageLog` shape. **Auto-detection is v1.3**, because that is where background location,
battery tuning and real-road testing live — and background location is among Apple's most scrutinised
permissions, on a version whose date has already slipped.

⚠️ **This is v1.2's only native item, by deliberate trade.** The widget (old 1.2.6) was cut to v1.3 to
keep it that way — it carried a standing "cut this before cutting the date", and two capability chains
on one slipped version was the thing to avoid. Prerequisites → the plan's External prerequisites §.

⛔ **Untestable in the web harness and barely testable in the simulator** (simulated routes only). This
lands squarely in the standing web-verified-only trap. Device verification is not optional here; it is
the only verification that means anything.

### 1.2.6 — Premium slice
**Shift/earnings optimizer** (headline; pulled from v1.3; also delivers the owed earning-optimization
repositioning; soft-gate below ~30 entries — demo mode is what makes it demoable) · **safe-harbor
payment tracker** (payments made vs. required; completes what v1.1 half-built; needs a per-year
payments-made model following `amountSetAsideByYear`'s shape) · **per-quarter amount in reminders +
dashboard** (⚠️ `perQuarter` is *already* on `SafeHarborScreen.tsx:221` and in the PDF — this is a
surfacing fix; amount is premium, date stays free) · **expense-breakdown drill-down**. Gating check: all
four sit on the tax-time/complexity axis, never on the core set-aside job; additive, never blurring an
already-free section.

### 1.2.7 — Native iPad
Flip `ios.supportsTablet` (`false` today), unlock `orientation` (`portrait` today). Adaptive
split-view/sidebar, multi-column dashboard, size classes, Split View / Stage Manager, hardware-keyboard
niceties, native-layout screenshots. `src/components/Screen.tsx` is the single wrapper for every screen
— the natural size-class seam. ~2× the original estimate.

### 1.2.8 — Guided onboarding (full coachmark tour)
Value-prop intro + interactive first-run tour over **populated** views (hence demo mode first). Overlay/
tooltip system built **reusable across the three finance apps**. ⚠️ Render coach-marks **outside**
gesture handlers — a `GestureDetector` swallows taps on native, and a tour whose tooltips don't respond
on device is the failure mode. Calm, one-at-a-time, replayable, skippable.

### 1.2.9 — Accessibility depth audit
Dynamic Type · VoiceOver order and labels · 44pt touch targets · high-contrast · reduce-motion. Runs
**after** the layout work so it sweeps the final surface. ~2× original estimate. VoiceOver end-to-end is
device-owed (1.2.12).

### ⛔ iOS home-screen widget — CUT TO v1.3 on 2026-09-20 ([D8]) _(was 1.2.6)_
Today's earnings + running set-aside. WidgetKit target mirroring Freedom v1. It was on record as the
#1 risk to the August date, with a standing *"cut this before cutting the date"* — and 1.2.5 made
mileage v1.2's native item, so carrying both meant two capability chains on an already-slipped
version. **The recommendation was standing since 2026-08-07; this is it being taken.** Its external
prerequisites (App Group → profile regeneration → CI signing) move to v1.3 with it. Cost is external,
not build time — so it is no cheaper later, just less concurrent.

### 1.2.10 — Filed correctness + submission-compliance backlog
🔴 **IRS due dates don't shift for weekends/holidays** — `quarterlyDueDates.ts` uses the fixed
Apr15/Jun15/Sep15/Jan15 rule, so reminders can fire on the wrong day. ⚠️ **Higher-stakes now that 1.2.6
puts a dollar amount in those reminders** — a wrong date carries a wrong payment instruction; consider
pulling into 1.2.6. Plus: tax-profile completeness prompt · analytics/crash opt-out toggle (restore the
privacy-policy line if added) · privacy/support pages single source of truth (⚠️ interacts with
repo→private: Pages-on-private needs a paid plan, and a dead privacy URL is a compliance issue).

### 1.2.11 — Lint ledger → CI gate
14 findings: 1 dead export (`totalCustomExpenses`), 4 `setState`-in-effect, and the
`useRef(new Animated.Value()).current` idiom in `Screen.tsx`. **Rules-of-React violations, not observed
defects** — nothing misbehaves today. Runs late because 1.2.0–1.2.7 rewrite these files. Then add
`npm run lint` to `web-e2e`.

### 1.2.12 — Verify · device QA · phase after-scan
Playwright + Maestro green, both themes at parity (**light held to the same bar as dark**) ·
**real-device TestFlight QA against a per-version full-surface checklist, native paths first — hard
gate** · pre-submit functional-correctness audit · Apple guideline pass incl. paywall findability ·
**whole-phase after-scan across all of v1.2** · `RELEASE_NOTES.md` updated per-item as work lands.

---

## Completed-item detail

_(none yet)_

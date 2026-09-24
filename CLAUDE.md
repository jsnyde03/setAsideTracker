# Gig Work Tracker — start here

Tax and earnings tracker for US gig workers (DoorDash, Uber, Instacart, Spark…). Expo / React
Native, iOS first. **LIVE on the App Store as "SetAside" at v1.1.1**; bundle id
`com.gigtaxtracker.app`.

**⚠️ `V1_2_EXECUTION_PLAN.md` is the point of truth.** It carries the one active item, decomposed.
`V1_2_LOG.md` is the detail store — every scan record and the reasoning behind every decision.
Read the plan's `RESUME HERE` block first; it is kept current.

## Status (2026-09-23)

**v1.2 in development on branch `v1.2`.** No ship date — [D9]: work the queue and ship when done.
**Do not reintroduce a target date.**

✅ **CLOSED: 1.2.1–1.2.7, 1.2.9–1.2.11, 1.2.14–1.2.17.** Demo mode · tax correctness · data safety ·
set-aside by week · mileage · the premium slice · native iPad · accessibility · filed correctness ·
lint · Maestro on CI · the `.app` cache · the keypad question · CI visibility.
**Per-item detail is in `V1_2_LOG.md` and belongs there.**

▶ **ACTIVE: 1.2.8 — the guided onboarding tour**, decomposed in the plan.
⛔ **Its first sub-step is a `[DECISION]`, not code.** It is feature/UX work Jason shapes, and the
standing rule is design agreement *before* building. Open with 2–3 shapes and a recommendation.
🔴 **Render coach-marks OUTSIDE any `GestureDetector`** — it swallows taps on device, and that is a
measured lesson. Build the tour over **populated** views (demo mode exists for exactly this).

⚙️ **What changed under your feet, if you are a new session:**
- **Every cheap gate now runs on every push and REPORTS to the commit** —
  `.github/workflows/web-checks.yml`: typecheck · `lint:ci` · 414 mobile unit · 102 engine · both
  tax-config audits · 122 Playwright. Each has been **seen to fail** from CI. Codemagic's copy is
  retired; `ios-testflight` is all that is left there.
- **Lint is a gate at zero, with `--max-warnings=0`.** New code cannot land a warning.
- **Contrast is gated in both themes** on every route, so new UI must pass it. ⚠️ The sweeps cover
  **routes**, not sheets or `AppGate` screens — a green run is not whole-app coverage.
- **Reduce Motion is honoured** (`useReduceMotion` + `motion.ts`); anything the tour animates must
  ask it.
- **The native suite is green at 12/12** and a run is ~13 min on a cache hit:
  `gh workflow run maestro-ios.yml --ref v1.2`.

🔴 **1.2.13 IS AN UNFINISHED SHIP BLOCKER.** `docs/privacy.html` is now served by GitHub Pages from
**this** repo ([D26]) — but Pages serves **`master`**, which still carries the **July** policy that
never mentions location. v1.2 ships location capture. **Merging v1.2 to master at release publishes
it**, and `node tools/check-published-policy.mjs` fails the submission if that is forgotten. _(It is
correct today: live v1.1.1 collects no location.)_

⚡ **Five live v1.1.1 defects were found by BUILDING ON TOP OF THEM, not by any backlog:** three
money-wrong tax bugs · a data-loss path that greeted an unreadable-data user as brand new and
overwrote them · a tax-profile edit that erased the user's filed prior-year tax · reminders that
reached no existing install while their queue silently drained · and "Clear All Data" leaving the
app lock on, so the next launch demanded Face ID for an app with nothing in it. **None reach anyone
until v1.2 ships** — [D10]'s accepted cost, and the reason to keep moving.

⛔ **THE ONE RESERVED BUILD NOW OWES FIVE THINGS.** The agenda is at the head of
`V1_2_TESTFLIGHT_CHECKLIST.md`, ordered most-likely-broken first. **Do not spend a build on less.**
1. **Does it upload?** ITMS-91053 names any required-reason API still undeclared — unknowable here.
2. **Does it install?** ⚠️ **It will land as "Missing Compliance"** until the export questionnaire is
   answered in ASC. **That is [D23] working, not a broken build** — and it is how 1.2.10.2 gets its
   answer: Apple's own classification rather than our reading of the EAR.
3. **1.2.5 (mileage)** — two native modules, a config plugin, a background task, all proven only
   against mocks in Node.
4. **Every iPad layout** — 1.2.7's .1–.4 have landed, so this is owed now. RN-web at 1024px is not
   UIKit at 1024pt; the local iPad Playwright projects catch *breaks*, not fidelity.
5. **1.2.7's device-owed rows** — the hardware keyboard (.6) and the App Store iPad screenshots (.7).

⚠️ **One privacy policy only: `docs/privacy.html`** ([D16]), and **one claim lives in three places** —
the policy, the App Store Connect labels, and `app.json`. ⚡ **That rule is now a GATE**
(`privacyClaimsAgree.test.ts`): it found four disagreements at 1.2.10.3, two of them created an hour
earlier by my own edit. Analytics is gated too — `analyticsPrivacy.test.ts` fails any event property
outside an allow-list, which is what catches the field nobody thought to forbid.

✅ **MAESTRO RUNS FREE ON GITHUB ACTIONS ([D27], 2026-09-22)** — measured, not assumed:
`billable.MACOS.total_ms = 0`, because the repo is **public**. ⛔ **"Maestro resumes ~November" and
"take the repo private" are both RETIRED** — private repos lose free macOS runners, so those two
wishes were mutually exclusive. `gh workflow run maestro-ios.yml --ref v1.2` (add
`-f flow=<name>.yaml` for one flow). **Codemagic's ~20% remainder is reserved for TestFlight alone.**

⛔ **BEFORE EDITING ANY MAESTRO FLOW, read `V1_2_LOG.md`.** Four runs went **2/12 → 1/12** because
flows were changed on guesses at ~45 min a cycle. Two rules survive that and still bind: **a
coordinate is not a neutral point** (`50%,15%` landed in the Date field and opened a picker) ·
**Maestro text selectors are FULL-MATCH regexes** (a selector without `.*` reports "not found" for
an element the dump shows present).

✅ **"The suite is flaky on its own" is RETIRED — it was a silent lost keystroke.** `hideKeyboard`
intermittently left the keyboard covering the state field, so the tap landed on the keyboard, `TX`
was never typed, and it surfaced **ten steps later** as *"Your earnings is not visible"* in a
different flow each run. ⚡ **A defect that moves between flows still has one cause.**

✅ **THE `.app` IS CACHED (1.2.15), so a flow-only change runs in ~13 min instead of ~40.** The key
is derived mechanically from `git ls-files` over everything that reaches the binary — **including
this workflow file**, because its `xcodebuild` flags decide what the binary *is*. `.maestro/` and
`e2e/` are excluded on purpose: neither is bundled, and both change on nearly every flow commit.
⛔ **Every cache hit prints the commit the binary was BUILT from**, because a check that ships
inside an artifact cannot tell you the artifact is stale.

## Rules that cost real time to rediscover

- ⛔ **`onEndEditing` NEVER FIRES ON A WEB BLUR — use `onBlur`.** Three inputs saved on
  `onEndEditing`, so everything typed into them was discarded on web, and **two of them had no Save
  button**, making blur their only path. It works on device, which is why nothing caught it; what it
  cost was the ability to verify any of it here. ⚠️ **Two probes "refuted" this before one confirmed
  it** — see the next rule.
- ⛔ **A COVERED ROUTE STAYS MOUNTED, and it will fool your instrument, not just your test.**
  Pushing Settings over the dashboard does not unmount the dashboard. A probe that typed a value,
  navigated away and back, and found it still there concluded the value had **persisted** — it was
  reading the input's own surviving local state. **Only `page.reload()` forces a real re-read**, and
  only as a real onboarded user, because demo mode's store is **in memory** and a reload drops it
  entirely. The same fact also breaks unscoped `toHaveCount(0)` assertions and makes a sheet's
  "Close" ambiguous with the screen's. ⚡ **A broken instrument that agrees with you is
  indistinguishable from evidence.**
- ⚠️ **This is an npm WORKSPACE: `apps/mobile/node_modules` is EMPTY.** Everything hoists to the repo
  root. A dependency sweep scoped to the package directory returned **zero** privacy manifests and
  read as *"the dependencies are non-compliant"* rather than *"I searched the wrong tree"*. **Search
  from the repo root.** The tell was that the answer came back suspiciously absolute.
- ⚠️ **Anything the demo persona asserts on a DATE is a latent coin flip.** The seed paid each past
  quarter `Math.round(perQuarter)` against an unrounded requirement, so "nothing overdue" was green
  on 2026-09-21 and red on 2026-09-22 — the entries move with today's date and the figure re-rounded.
  **Gate demo invariants over `demoSeed.test.ts`'s sample dates, never over "now"**: planting the old
  rounding reds only **2 of those 7**, which is exactly why it shipped green.

- ⛔ **REACT-NATIVE-WEB IS BLIND TO MOST OF ACCESSIBILITY, and a green web suite says nothing about
  any of it.** All four parts of 1.2.9 hit this independently: **motion** is native-only (`Screen`'s
  entrance and all four sheets pass `"none"` on web, so the browser renders a motionless app whether
  or not Reduce Motion is honoured) · **`hitSlop` is ignored**, so a 22pt icon measures 22pt in a
  browser and 44pt on the device · **there is no text-size setting** to turn up, so Dynamic Type can
  only be approximated by scaling `font-size` and remeasuring · and **there is no VoiceOver**, so
  the accessibility *tree* can be inspected but never heard. ⚡ **What the browser CAN answer
  exactly is contrast** — it is pure computation over colours — which is why that one is a gate and
  the rest are unit-tested rules plus device rows. ⛔ **Never let a browser suite's silence stand in
  for an accessibility check; write down which half it cannot see.**
- ⛔ **CHANGING AN ACCESSIBLE NAME NEEDS BOTH SUITES, because the web one cannot see the break.**
  Playwright's `getByLabel` is a **substring** match; Maestro's text selectors are **full-match**
  regexes. So renaming the Subscribe button to carry its price left five Playwright specs green and
  broke the Maestro flow — and, worse, meant **the fix itself had no test**: every one of those five
  passes whether or not the price is in the label. ⚠️ **When a label changes, assert the NEW fact
  explicitly** (here: the button's `aria-label` must match `/\$\d/`), or the suite is only checking
  that the control still exists.
- ⚠️ **Sweeping for "everything coupled to this rename" undercounts when you grep for the part of
  the change you were thinking about.** 1.2.9.1 renamed eight labels, swept for six, and shipped a
  broken flow — one commit after adding a gate about exactly this. **Grep for the class (every label
  this commit touched), not for the headline.**
- ⛔ **AN `accessibilityLabel` ON A WRAPPER REPLACES EVERY WORD INSIDE IT, so the text a human reads
  is often a string Maestro can NEVER match.** `DemoBanner` renders *"Sample data — not your
  account"* and labels its wrapper *"Sample data. This is an example account, not your own."*;
  every locked premium card renders *"Expense breakdown · Premium"* and labels its `Pressable`
  *"Expense breakdown (Premium)"*. ⚡ **Eleven selectors across six flows were addressing text that
  is not in the tree** — and one of them, an `assertNotVisible` on the banner, **passed for free
  every run**: it asserted the absence of a string that is never present, which is the one thing it
  existed to disprove. ⛔ **Select by the ACCESSIBLE name, and confirm it in a dump before
  believing a flow proves anything.** ⚠️ A selector audit that only checks *"does this string exist
  in the source"* cannot see this — the string does exist, one line under the label that hides it.
- ⚠️ **`canUsePremium` is TRUE in demo mode** (`isPremium || (isDemo && !isPremium)`), so a card's
  accessible name differs between the demo flow and the gating flows. Same card, two selectors.
- ⛔ **NEVER set `centerElement` on a Maestro `scrollUntilVisible` — it cost five runs and read as
  three separate bugs.** `Orchestra.kt`: while it is set the loop accepts **only** a near-centre
  element for five iterations (`maxRetryCenterCount = 4`) and reaches the plain visibility check on
  the **sixth**. A target in the last screenful **cannot be centred** — at scroll 100% a further
  swipe moves nothing — so those five are guaranteed to fail and the step passes **only if a sixth
  fits inside the 20 s timeout.** Each iteration costs a hierarchy fetch, so whether it fits is a
  coin flip. ⚡ **That is why "No visible element found" named elements the dump showed fully on
  screen, why the suite was flaky with nothing edited, and why a step passed four runs and failed a
  fifth.** Nothing needs to replace it: `visibilityPercentage` defaults to **100**, so the element is
  already proven fully on screen before anything taps it.
- ⛔ **A failing assertion tells you what was ABSENT; only the view hierarchy tells you what was
  PRESENT.** Thirteen Maestro dispatches went on diagnosing a *harness* — every app-level hypothesis
  raised along the way was wrong. The build now prints the commit it built, captures the simulator's
  final frame, and **dumps every on-screen text node into the log on failure**. ⚠️ **Read that dump.
  Do not theorise from assertion text** — it cracked the two hardest failures on its first run each,
  and should have existed ten dispatches earlier.
- ⛔ **An unsigned iOS build cannot use the Keychain.** `CODE_SIGNING_ALLOWED=NO` leaves the app with
  no entitlements, so `expo-secure-store` throws and **nothing can be saved at all**. The simulator
  build is ad-hoc signed (`CODE_SIGN_IDENTITY="-"`) for exactly this reason. "Simulator builds don't
  need signing" is true for launching and false for storage.
- ⚠️ **`hideKeyboard` fails on iOS's NUMERIC keypad** — it has no Done key. Entry-form flows tap a
  neutral point instead. It works fine for the text keyboard, which is why onboarding passes and
  entry-form flows did not.
- ⛔ **COMMITTING IS NOT SHIPPING.** Check `git rev-list --count origin/v1.2..HEAD` before asking for
  or believing a build. Eight commits once sat local while the plan asserted the tree was pushed.
- 🔌 **Never leave Expo ports open.** After any Playwright run, verify **8081 / 8082 / 19000 / 19001
  / 19006** are free. ⚠️ Identify a PID before killing it — Adobe Creative Cloud also runs `node.exe`.
- ⚙️ npm and Playwright here need `NODE_OPTIONS=--use-system-ca`, or installs fail with
  `ERR_SSL_WRONG_VERSION_NUMBER`. Recurs on **every** install.
- ⚠️ **`cmd | tail` reports TAIL's exit code, not the command's.** A gate was "verified" as passing
  this way when it was actually failing. Read the error text, not `$?`.

## Verification

```bash
cd services/tax-engine && npm test          # 102 engine tests
cd services/tax-engine && npm run audit     # ⚠️ TAX CONFIG GATES — both exit non-zero
cd apps/mobile && npm run typecheck && npm test   # 378 unit
cd apps/mobile && NODE_OPTIONS=--use-system-ca npx playwright test --config e2e/playwright.config.ts   # 66 e2e
node tools/sweep-hygiene.mjs                 # reports test/gating hygiene; triage, not a gate
```

⚠️ **A green Playwright suite means "nothing else broke", NOT "this works on a phone."**
react-native-web renders no `Alert`, no biometrics, no document picker, no real navigation stack.
That has been demonstrated three times in v1.2 alone. Device gates → `V1_2_TESTFLIGHT_CHECKLIST.md`.

### The two tax-config gates, and why they exist

- **`audit:dependents`** — fails on any per-dependent *credit* ≥ $1,000. No real one is close (the
  genuine ones are $29–$256), so a four-figure value is an exemption filed in the wrong slot. That
  defect told a Georgia filer with two dependents they owed **$0** state tax instead of ~$891.
- **`audit:staleness`** — fails when a live tax year's `reviewedOn` is over **6 months** old, or when
  the current calendar year has no config (the engine would silently fall back to another year's
  brackets). ⚠️ **Bump `reviewedOn` only after actually re-checking figures** — a date newer than the
  last real review converts a correct failure into false confidence. Runbook: `TAX_CONFIG_REVIEW.md`.

## How this goes best

Jason directs; execution is delegated, and he asks to be pushed back on when there's a real
disagreement. The record backs that up. **Every sub-step's before-scan in 1.2.2 found something the
plan did not know, and twice it found a defect in the sub-step before it** — including one shipped
the previous day, invisible to its own tests because every fixture shared the same blind spot.

⭐ **Plant against every fix, and treat a plant that PASSES as information about the test.** Two
tests written during 1.2.2 were vacuous and both looked like coverage: one compared two baselines
that shared the defect, another used a fixture too weak to move the number past its threshold.

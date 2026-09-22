# Gig Work Tracker — start here

Tax and earnings tracker for US gig workers (DoorDash, Uber, Instacart, Spark…). Expo / React
Native, iOS first. **LIVE on the App Store as "SetAside" at v1.1.1**; bundle id
`com.gigtaxtracker.app`.

**⚠️ `V1_2_EXECUTION_PLAN.md` is the point of truth.** It carries the one active item, decomposed.
`V1_2_LOG.md` is the detail store — every scan record and the reasoning behind every decision.
Read the plan's `RESUME HERE` block first; it is kept current.

## Status (2026-09-22)

**v1.2 in development on branch `v1.2`.** No ship date — [D9]: work the queue and ship when done.
**Do not reintroduce a target date.**

✅ **1.2.2–1.2.6 and 1.2.10 are CLOSED.** Tax correctness · data safety · set-aside by week · the
mileage trip toggle · the premium slice (four surfaces) · filed correctness + submission compliance.
**Per-item detail is in `V1_2_LOG.md` and belongs there, not here.**

⏸ **1.2.1 (demo mode) is 7/7 built and cannot close** — Maestro resumes ~November.
▶ **ACTIVE: 1.2.7, native iPad**, decomposed in the plan. ⚠️ **Its verification is almost entirely
visual and device-owed**, so expect it to *bank* checks for the reserved build rather than clear
them. 🔴 **Flipping `supportsTablet` obliges iPad screenshots in App Store Connect** — a submission
requirement that ships with the flip, not after it.

⚡ **Five live v1.1.1 defects were found by BUILDING ON TOP OF THEM, not by any backlog:** three
money-wrong tax bugs · a data-loss path that greeted an unreadable-data user as brand new and
overwrote them · a tax-profile edit that erased the user's filed prior-year tax · reminders that
reached no existing install while their queue silently drained · and "Clear All Data" leaving the
app lock on, so the next launch demanded Face ID for an app with nothing in it. **None reach anyone
until v1.2 ships** — [D10]'s accepted cost, and the reason to keep moving.

⛔ **THE ONE RESERVED BUILD NOW OWES FOUR THINGS, and two are new.** The agenda is at the head of
`V1_2_TESTFLIGHT_CHECKLIST.md`, ordered most-likely-broken first. **Do not spend a build on less.**
1. **Does it upload?** ITMS-91053 names any required-reason API still undeclared — unknowable here.
2. **Does it install?** ⚠️ **It will land as "Missing Compliance"** until the export questionnaire is
   answered in ASC. **That is [D23] working, not a broken build** — and it is how 1.2.10.2 gets its
   answer: Apple's own classification rather than our reading of the EAR.
3. **1.2.5 (mileage)** — two native modules, a config plugin, a background task, all proven only
   against mocks in Node.
4. **Every iPad layout**, once 1.2.7 lands.

⚠️ **One privacy policy only: `docs/privacy.html`** ([D16]), and **one claim lives in three places** —
the policy, the App Store Connect labels, and `app.json`. ⚡ **That rule is now a GATE**
(`privacyClaimsAgree.test.ts`): it found four disagreements at 1.2.10.3, two of them created an hour
earlier by my own edit. Analytics is gated too — `analyticsPrivacy.test.ts` fails any event property
outside an allow-list, which is what catches the field nobody thought to forbid.

⚠️ **"Out of Codemagic minutes" is wrong and it misled a session.** **~80% is consumed, and Jason
stopped the Maestro work deliberately to RESERVE the rest for TestFlight** _(2026-09-21)_. A device
build **is** available — it is scarce and spoken for.

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

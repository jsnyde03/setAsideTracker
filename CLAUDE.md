# Gig Work Tracker — start here

Tax and earnings tracker for US gig workers (DoorDash, Uber, Instacart, Spark…). Expo / React
Native, iOS first. **LIVE on the App Store as "SetAside" at v1.1.1**; bundle id
`com.gigtaxtracker.app`.

**⚠️ `V1_2_EXECUTION_PLAN.md` is the point of truth.** It carries the one active item, decomposed.
`V1_2_LOG.md` is the detail store — every scan record and the reasoning behind every decision.
Read the plan's `RESUME HERE` block first; it is kept current.

## Status (2026-09-21)

**v1.2 in development on branch `v1.2`.** No ship date — [D9]: work the queue and ship when done.
**Do not reintroduce a target date.**

✅ **1.2.2 (tax correctness) COMPLETE, 7/7.** Three money-wrong bugs that were **live in v1.1.1**,
all understating what the user owed: safe harbor reporting "no penalty expected" through both spring
deadlines · MFJ ignoring spouse income · GA/SC/MN dependent exemptions applied as tax credits.
⏸ **1.2.1 (demo mode) is 7/7 built but cannot close** — its Maestro validation is out of Codemagic
minutes until ~November. ▶ **Next: 1.2.3, the mileage trip toggle** ([D8]) — v1.2's only native item.

## Rules that cost real time to rediscover

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
cd apps/mobile && npm run typecheck && npm test   # 226 unit
cd apps/mobile && NODE_OPTIONS=--use-system-ca npx playwright test --config e2e/playwright.config.ts
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

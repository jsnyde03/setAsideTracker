# v1.2 — Execution Plan · **THE ACTIVE DRIVER**

> **This file is where active work lives** (Jason 2026-08-07). One active item at a time, decomposed
> here and nowhere else. Detail of completed work → [V1_2_LOG.md](V1_2_LOG.md). Version ladder →
> [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Nothing else carries a v1.2 queue.

> ## ⏭️ RESUME HERE — 2026-09-21
>
> ✅ **Clean and pushed, verified** — `git rev-list --count origin/v1.2..HEAD` = 0.
> ⚠️ **Check that count; never assume it.** A previous resume block asserted "clean and pushed"
> while eight commits sat local, and CI spent two cycles building a month-old tree.
>
> ⛔ **STOP RENUMBERING THE QUEUE.** Two renumbers on 2026-09-20 broke **thirteen** cross-references
> between them, every one found only by grepping afterwards. Item numbers are now **stable IDs** —
> a new item takes the next free number and the build order is the table's row order, not the
> numbering. See the note above the queue table.
>
> 🔴 **STILL LIVE IN v1.1.1, and fixed only on this branch:** three money-wrong bugs that understate
> what the user owes the IRS, plus a data-loss path that greets a user whose data cannot be read as a
> brand-new one and then writes over it. **All fixed in 1.2.2 and 1.2.3. None of it reaches anybody
> until v1.2 ships** — that is [D10]'s accepted cost, and it is the reason to keep moving.
>
> ✅ **No ship date ([D9]).** August is retired and deliberately not replaced — **work the queue and
> ship as soon as it is done.** Do not reintroduce a target.
>
> ✅ **1.2.2 (7/7) and 1.2.3 (5/5) ARE COMPLETE** and closed. **▶ ACTIVE: 1.2.4, the set-aside split
> by date and week** ([D7]) — **4 of 6 done.** The frozen per-entry rate, the Monday–Sunday roll-up and
> the dashboard surface are all built and on the branch. **▶ Next action: 1.2.4.5, reconcile the drift**
> — frozen figures stop summing to the year total once rates move, and `weeklyCatchUpAmount` already
> exists to say so but renders **only when already behind**. **⏸ 1.2.1 is 7/7 built**, deferred to
> ~November with Maestro.
> Health: **102** engine · **266** mobile unit · **48/48** Playwright · typecheck clean · both tax-config
> gates green · lint 15 _(the ledger says 14 — drift, all pre-existing, re-count at 1.2.11)_.
>
> ⚠️ **Fixed 2026-09-21: four lines said "1.2.3 = the mileage toggle."**
> **1.2.3 is the data-safety block; mileage is 1.2.5** — the queue table and the log's renumber map
> always said so. More renumber rot, found at the 1.2.3 switch-in. Mileage was additionally the wrong
> pick: `expo-location` is not installed anywhere in the repo, and all three of its Jason-side
> prerequisites are still open. **Data-safety chosen 2026-09-21 (Jason), on row order + correctness-first.**
>
> ⚠️ **Constraint carried into 1.2.4 and beyond: do not assert absolute dollar figures in tests.**
> 1.2.2 changes the tax math, which changes what `buildDemoSeed` produces. Derived assertions
> survive it; a hardcoded `$1,400` does not — the defect 1.2.1.5 already had to fix once.
>
> **Queue restructured 2026-09-20** — two items Jason raised ([D7] split, [D8] mileage), two
> correctness blocks from the gap scan, and the widget **cut to v1.3**. Renumber map (original →
> final, one hop) → [V1_2_LOG.md](V1_2_LOG.md).
>
> ⚠️ **Standing caveat: everything in v1.2 is WEB/UNIT-VERIFIED ONLY.** react-native-web renders no
> `Alert`, no biometrics, no document picker, no real navigation stack. **Green here means "nothing
> else broke", not "this works on a phone"** — that happened three times in 1.2.1 alone. Device gates
> → [V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md).
>
> ⏸ **MAESTRO IS PAUSED — out of Codemagic minutes, resumes ~November 2026** _(Jason 2026-09-21)_.
> **Next action when minutes return: dispatch the CURRENT branch tip and read the log.** Nothing is
> owed on this machine; everything is pushed. Full narrative → [V1_2_LOG.md](V1_2_LOG.md).
>
> **2 of 12 flows pass** (`Onboarding → Dashboard`, `Onboarding validation`). ⚡ **The app was never
> broken** — thirteen dispatches diagnosed a *harness*, and the one real app question raised along
> the way (does `enterDemo()` work on device?) resolved as **yes**.
>
> ⚡ **The single most useful thing built here: the Maestro step now prints every on-screen text
> node into the build log on failure.** A failing assertion says what was ABSENT; that dump says
> what was PRESENT, and it cracked the two hardest failures on its first run each. **Do not
> diagnose from assertion text — read the dump.**
>
> **Three open questions, all answerable from the next log, none needing a code change first:**
> 1. `custom-expenses-gating` / `mileage-log-gating` fail finding the Premium row — and they type
>    nothing, so the numeric keypad cannot be the cause. Unknown; the dump now covers them.
> 2. `Premium Paywall` — `Settings` not found on the dashboard.
> 3. `Demo mode` — now enters the demo successfully, then cannot find the seeded Uber entry.

**Branch:** `v1.2` · **Target: none — ship ASAP** ([D9], superseding [D4]'s August)
**Structural audit:** [`docs/audits/2026-08-07-v1.2-structural/`](docs/audits/2026-08-07-v1.2-structural/SYNTHESIS.md) · **Gap scan:** [`docs/audits/2026-09-20-v1.2-gap-scan/`](docs/audits/2026-09-20-v1.2-gap-scan/README.md) · **Ladder rationale:** [BUILD_ORDER_REVIEW_2026-08-07.md](BUILD_ORDER_REVIEW_2026-08-07.md)

⛔ **The backwards-from-Aug-31 schedule is retired**, not rescheduled. There is no date to work back
from and none is wanted. **What replaces it: the queue order below, correctness first.** The one hard
gate that survives is the TestFlight device-QA pass at 1.2.12 — that is a gate, not a date.

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
`ERR_SSL_WRONG_VERSION_NUMBER`. Recurs on **every** install, so expect it at each item that adds a
dependency — **1.2.5** (location) is the next one. _(Said "1.2.3"; corrected 2026-09-21.)_

---

## ▶️ ACTIVE QUEUE — exactly one item

### ⏸ **1.2.1 — Demo mode** · **7/7 built, validation DEFERRED to ~November**

In-memory store · offset-dated persona · 4 leak guards · enter/exit + [D6] Settings row · banner on
all 13 screens · premium preview ([D5]) · 34/34 Playwright. **⏸ Cannot close until the Maestro suite
is green**, and that is out of minutes until ~November. ⚡ **Its one genuine open risk is now
answered:** `enterDemo()` works on a real simulator build, so demo mode is not broken on device.
What remains unproven is the *flow*, not the feature. Detail + 10 scan records → [V1_2_LOG.md](V1_2_LOG.md).

✅ **[D11] the persona stays at ONE tax year** — year-over-year therefore cannot be previewed, accepted
because the gate is about data, not payment. An e2e asserts the absence.

---

### ⭐ **1.2.4 — Set-aside split by date and week** · **ACTIVE**

**Why it is next:** the correctness blocks are closed, so the feature items can now render figures
that have already been corrected — which was the entire point of sequencing them first. In Jason's
words ([D7]): *"having one big lump sum to set aside makes it hard to keep track."*

⚠️ **The before-scan is owed at 1.2.4.2**, the first step that writes code. The spec's premises were
measured on 2026-09-20 — **before 1.2.2 changed the tax math and 1.2.3 changed the storage path** — so
they are a hypothesis again, not a finding. Spec → [V1_2_LOG.md](V1_2_LOG.md).

| # | sub-step | scan |
|---|---|---|
| **1.2.4.1** | ✅ **DONE 2026-09-21.** All three answered by Jason — **[D13]** week is a fixed **Mon–Sun** · **[D14]** legacy entries get a computed figure and any week containing one is **marked estimated** · **[D15]** "this week" goes **on the dashboard** beside the YTD total, past weeks behind a drill-down. | ✅ |
| **1.2.4.2** | ✅ **DONE 2026-09-21.** `setAsideRate` on `Entry`, frozen by the provider on create. ⭐ **It is the tax the entry ACTUALLY ADDS** — `f(existing + this) − f(existing)` through the same `netAmountToSetAside` the dashboard shows — so brackets, the SE wage base, state rules and the W2 credit are handled by construction, with no parallel tax path. The increments **telescope to the year's real total**, which is what will make the weekly rows add up, and a test pins that. A *rate* rather than a dollar amount, so an edit moves the dollars at the frozen rate. ⛔ **The e2e caught a defect no unit test could:** an edit DROPPED the field — the entry form builds a complete object literal, so anything it does not name is lost on save, and this is the app's first `Entry` field the user does not edit. Carried forward in the provider, not the form. **256 unit (was 248) · 45/45 Playwright (was 43) · 2 plants, both caught.** | ✅ |
| **1.2.4.3** | ✅ **DONE 2026-09-21.** `weeklySetAsides` + `weekStartOf` + `fallbackSetAsideRate`, all pure. Monday–Sunday per [D13]; most recent week first; **no row for a week with no work** — an empty row is not information. [D14] handled: a legacy entry gets the year's own effective rate and its week is **marked estimated**, with a control asserting a fully frozen week is *not*. ⚠️ **All week maths is UTC** — `new Date("2026-06-22")` is midnight UTC, which is Sunday evening across the Americas, so a local-time version files every Sunday into the wrong week. Confirmed by planting it. **266 unit (was 256) · 3 plants, all caught.** | ✅ |
| **1.2.4.4** | ✅ **DONE 2026-09-21.** "This week" sits inside the set-aside card **beside** the year total, never instead of it ([D15]), and opens `WeeklySetAsideSheet` — every week worked, with [D14]'s estimated weeks labelled and a footnote saying what that means. **266 unit · 48/48 Playwright (was 45).** ⛔ **A plant PASSED and rewrote the test:** the spec asserted on the accessibility *label*, so hardcoding the displayed figure to `$0.00` went green — the label kept telling the truth while the screen lied. It now reads the **rendered text**, and keeps the label assertion for VoiceOver. ⚠️ A second assertion of mine would have reported a false defect: a loose match on "estimated" caught the dashboard's *"Q4 2026 estimated tax"*. | ✅ |
| **1.2.4.5** | ✅ **DONE 2026-09-21.** `summarizeWeeklySetAsides` — the weeks, their total, the year total, and the **adjustment** between them — shown in the sheet as its own row plus a **Total** line, so the list visibly adds up. Hidden when it is zero, which is the normal case. ⛔ **The plan's premise was wrong and following it would have shipped an incoherent screen:** `computeCatchUpStatus` compares what is owed against what the user says they have **actually saved** — a hand-typed figure about their behaviour — not the weekly figures against the year total. Wiring this drift into that line would have told a user who is perfectly on track that they were behind. **270 unit (was 266) · 50/50 Playwright (was 48) · 2 plants caught**, and a third exposed a **circular** assertion of mine. | ✅ |
| **1.2.4.6** | **Verify + whole-item after-scan.** ⚠️ **Do not assert absolute dollar figures** — 1.2.2 moved what `buildDemoSeed` produces, and a hardcoded total is a defect 1.2.1.5 has already had to fix once. | ⬜ |

**Exit line:** each entry carries a set-aside frozen at the rate it was logged under, a week's worth
sums to a figure that never moves retroactively, and the YTD total still says what is really owed.

## 📋 Queue — everything else _(terse rows; decomposed only on promotion)_

_1.2.1 (parked) and 1.2.4 (active) are not listed here — they are above. 1.2.2 and 1.2.3 are in **Closed**.
An item appears in exactly one place._

⛔ **Numbers are STABLE IDs — do not renumber on insert.** A new item takes the **next free number**
and is placed in the right row; **build order is this table's row order**, never the numbering. Two
renumbers on 2026-09-20 broke 13 cross-references between them — a backlog entry pointing at "the
a11y audit" silently came to mean the iPad item, and only a grep caught it. The one-line cost of an
out-of-order number is worth less than one more round of that.

| # | item | notes |
|---|---|---|
| 1.2.5 | **⭐ Mileage trip toggle** 🔧 | NEW 2026-09-20 ([D8]). Start/stop capture on **when-in-use** location, populating the existing `MileageLog` shape. **v1.2's only native item.** Auto-detection → v1.3. |
| 1.2.6 | **Premium slice** | Optimizer (headline) · safe-harbor payment tracker · per-quarter amounts in reminders · expense drill-down. **Before the screen passes** so each walks the final surface once. ⚠️ **Depends on 1.2.2** — the safe-harbor tracker cannot be built on the broken safe-harbor math. |
| 1.2.7 | **Native iPad** | Adaptive split-view/sidebar. ~2× its original estimate (scoped at 6 screens, now 13). |
| 1.2.8 | **Guided onboarding tour** | Full coachmark tour over populated views. Reusable overlay system. Render **outside** gesture handlers. |
| 1.2.9 | **Accessibility depth audit** | Dynamic Type · VoiceOver · 44pt targets · contrast · reduce-motion. VoiceOver end-to-end is device-owed. |
| 1.2.10 | **Filed correctness + submission-compliance backlog** | IRS due-date business-day shift 🔴 · backup-restore validation · **iOS privacy manifest (may block upload — ITMS-91053)** · `ITSAppUsesNonExemptEncryption` declared false while the app does AES-256 · `clearAllLocalData` omits `appSettings` against the stated policy · completeness prompt · analytics opt-out · privacy-page single source. ⚠️ **Pull the due-date fix into 1.2.6** — that item puts a dollar amount in those reminders, so a wrong date carries a wrong payment instruction. |
| 1.2.11 | **Lint ledger → CI gate** | 14 findings; runs late because 1.2.0–1.2.7 rewrite those files. |
| 1.2.12 | **Verify · device QA · phase after-scan** | TestFlight pass (hard gate) · guideline pass · whole-phase after-scan. |

⚠️ **Sequencing, and it is the point of the restructure:** the correctness blocks run **before** the
feature items, not after. 1.2.4 renders a per-entry set-aside in ~52 rows a year — building it on an
under-bracketed number multiplies one wrong figure into fifty-two wrong ones. **Fix the math, then
build the display on it.**

⛔ **Cut to v1.3 on 2026-09-20 ([D8]):** the **iOS home-screen widget** (was 1.2.6). It was on record
as the #1 risk to the date, with a standing "cut this before cutting the date"; **1.2.5** makes mileage
the native item instead. Its external prerequisites move with it.

_Item specs live in [V1_2_LOG.md](V1_2_LOG.md) and are retrieved at switch-in — not carried here.
⚠️ **Numbers shifted 2026-09-20** — pre-2026-09-20 references in the log use the old numbering; the
map is at the head of the log's item-spec section._

## ✅ Closed

- **1.2.3 — Data-safety block ✅ DONE 2026-09-21, 5/5.** A decryption failure is now a **named** error
  instead of a `SyntaxError` about JSON · a key is **never minted while data exists** under an older
  one · `loadError` finally **has a consumer**, so a user whose data cannot be read gets a recovery
  screen ([D12]: retry · restore · erase) instead of being greeted as a new user and written over ·
  three setters can no longer show a state that was never stored. **248 unit · 43/43 Playwright · 12
  plants, 11 caught and the 12th deleted a line.** ⏭ The `Alert` layer is device-owed → checklist §A.
  _Sub-step detail + 5 scan records → [V1_2_LOG.md](V1_2_LOG.md)._

- **1.2.2 — Tax-correctness block ✅ DONE 2026-09-21, 7/7.** Three money-wrong bugs that were live in
  v1.1.1, all understating what the user owed — safe harbor's "no penalty expected", MFJ ignoring
  spouse income, GA/SC/MN exemptions applied as credits — plus the state picker (all 51 were always
  supported; the *input* was not) and both tax-config audits made CI gates. **226 unit · 102 engine ·
  38/38 Playwright · 9 plants across 6 sub-steps, every one caught.** _Sub-step detail + scan records
  → [V1_2_LOG.md](V1_2_LOG.md)._

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
| **[D6]** | **Already-onboarded users can reach the demo too** — one Settings section that enters or exits. Also makes store screenshots shootable without wiping real data. | Jason 2026-08-08 |
| **[D7]** | **The set-aside splits per entry, rolling up to weekly** — not a derived weekly view alone. Each shift carries its own figure, **frozen at the rate in effect when logged**, so history never moves retroactively; the existing catch-up line reconciles the drift. | Jason 2026-09-20 |
| **[D8]** | **Mileage gets a start/stop toggle in v1.2 on when-in-use location; auto-detection waits for v1.3.** The **widget is cut to v1.3** so v1.2 carries one native item, not two. | Jason 2026-09-20 |
| **[D9]** | ✅ **NO SHIP DATE. Work through the queue and ship ASAP.** August is retired and not replaced — the version is paced by the work, not by a date. ⚠️ **Do not reintroduce a target date**; the correctness exposure from [D10] is the reason to go fast, not a reason to set one and cut against it. | Jason 2026-09-20 |
| **[D11]** | **The demo persona stays at ONE tax year.** Year-over-year therefore cannot be previewed — accepted, because the gate is about data, not payment. Revisit only if the demo becomes the primary premium sales surface. | Jason 2026-09-20 |
| **[D13]** | **A week is Monday–Sunday, fixed.** DoorDash, Uber and Spark all run their pay weeks Mon–Sun, so the app's week matches the earnings statement the user is comparing it against. **Not configurable** — a user-chosen week start is a setting nobody asked for that every weekly figure would then depend on. | Jason 2026-09-21 |

| **[D14]** | **Entries logged before the frozen field exists get a computed figure, and any week containing one is MARKED ESTIMATED.** Rejected both alternatives deliberately: "—" greets every existing user with a wall of blanks across data they really have, and a silent back-fill presents a reconstructed number as though it had been frozen at the time — **the exact thing [D7] exists to prevent**. The label is what makes the third option honest rather than convenient. | Jason 2026-09-21 |

| **[D15]** | **"This week" sits on the dashboard beside the YTD total**, past weeks behind a drill-down. [D7]'s point is that the week becomes the unit the user acts on, and a figure behind a tap does not become anyone's rhythm. The year total stays — it is what is actually owed. | Jason 2026-09-21 |

| **[D12]** | **The recovery surface offers three explicit routes — retry, restore-from-backup, erase — and nothing silent.** ⚠️ **Retry is not politeness:** `expo-secure-store` defaults to `WHEN_UNLOCKED`, so a launch before the device's first unlock can return null **transiently**, which is not key loss — erasing or re-keying on it would destroy good data. Restore is the only genuine recovery the app has, and a user stranded on this screen cannot reach Settings to find it. | Jason 2026-09-21 |
| **[D10]** | **No interim patch release — the three live money-wrong bugs are fixed in v1.2, not in a v1.1.2.** Recommendation on record was a cheap disclosure patch (MFJ warning + safe-harbor caveat) while the real fixes were built; **Jason chose the single correct release instead.** Tradeoff accepted knowingly: v1.1.1 keeps understating what users owe until v1.2 ships. | Jason 2026-09-20 |
| — | Guided onboarding = the **full coachmark tour**, not a lightweight intro. | Jason 2026-06-30 |
| — | Demo mode is **isolated and fully reversible**. | Jason 2026-06-30 |
| — | Free half stays free; premium half is **additive**, on the tax-time/complexity axis. | standing |

## ⚠️ External prerequisites — Jason-side

**Gating 1.2.5 (the mileage toggle) — v1.2's only native item** _(said "1.2.3"; corrected 2026-09-21)_**:**
1. **`PRIVACY_POLICY.md` + the hosted privacy page must disclose location collection** before the
   build that carries it goes to review. ⚠️ **Collides with 1.2.8's "privacy-page single source of
   truth"** — do that consolidation first or the disclosure lands in one copy and not the other.
2. **A `NSLocationWhenInUseUsageDescription` string that justifies the capture**, and App Store
   review notes explaining it. When-in-use is a far lighter ask than background — **keep it that way**;
   the moment this needs "Always", it is a different review and belongs in v1.3 with auto-detection.
3. **Run a native build EARLY**, not at the end — a location dependency means a prebuild/config-plugin
   change, and iOS CI has broken on exactly this class of change before.

**Moved to v1.3 with the widget ([D8]):** App Group capability → provisioning-profile regeneration ·
Freedom v1's widget template (Expo 56 + Codemagic + widget target, Team `CVCY985YCD`) · the Codemagic
`xcodeproj` glob gotcha.

**Not gating v1.2, but start now** — external latency that doesn't compress:
4. **Play Console account type** (personal ⇒ 12 testers × 14 days) + Play Billing + RevenueCat Android key → v1.3.
5. **Tax-filing affiliate applications** — must be in by ~November or v1.4's affiliate half misses its window.

## 🗄 Deferred backlog — surfaced during v1.2, filed immediately

### From the 2026-09-20 gap scan _(full findings → [docs/audits/2026-09-20-v1.2-gap-scan/](docs/audits/2026-09-20-v1.2-gap-scan/))_

**Folded into v1.2 rather than deferred** _(recorded here so the routing is auditable)_: the **state
picker** → 1.2.2 (free text produces a `$0` state tax and a "CALIFORNIA isn't supported yet" warning
over a config that has all 51 — it is the same wrong-state-tax family) · the **"how to pay" card +
federal/state split** → 1.2.4 (that item reworks how the set-aside is presented; *where to send it*
belongs beside *how much*, and the federal slice already exists in the model) · **per-platform gross
receipts in the export** and the **closed-year due-date mismatch** → 1.2.10 (both trivial, data
already present).

**Deferred to v1.3+:**
- **CSV import from the platforms' own earnings exports.** `DocumentPicker` appears **once**, for
  backup restore — three export paths, one import, and that import is a destructive whole-device
  replace. Highest retention value of anything the scan found **and** the largest build, which is
  exactly why it is not a v1.2 squeeze.
- **1099-NEC/1099-K reconciliation screen** — the January moment the app exists for. The cheap export
  half folds into 1.2.10; the enter-and-compare screen is its own item.
- **The tax profile has no history.** One `state`/`filingStatus`/`dependents` applied to every year, so
  moving TX→CA retroactively taxes a Texas year at California rates on the Premium year-over-year
  screen. ⚠️ `amountSetAsideByYear` and `filedTaxByYear` show the year-keying pattern was available and
  was not applied to the profile. Needs a migration.
- **No automatic backup and nothing prompts for one.** Manual JSON export is the entire recovery
  story; `AppSettings` has no last-backup field. ⚠️ **Compounds 1.2.3** — the data-safety block fixes
  *losing* data, this fixes *recovering* it.
- **Section 199A / QBI is not modelled at all.** Zero hits repo-wide; `federalIncomeTax.ts:15-24` goes
  AGI → standard deduction → brackets with nothing between. Overstates federal income tax ~22% (~$506
  on $40k single). ⭐ **The only finding that errs toward over-collecting** — safe for the user, wrong
  against any competitor or preparer.
- **No staleness review over the state tax configs.** Surfaced while confirming the GA/SC/MN fix: GA's
  dependent exemption is rising $4,000 → $5,000 and the config still says 4000. **The individual value
  is 1.2.2's problem; the absence of any process that would have caught it is this item.**
- **Only the standard mileage method exists**, and the app never asks which method the user elected in
  year one — an election that is binding in later years. Store the election in 1.2.5 if cheap;
  actual-expense math is its own workstream.
- **Schedule C Part IV vehicle info** (total/commuting miles, in-service date) is never collected.
  ⚠️ **Total annual mileage is unrecoverable in April if not captured contemporaneously** — consider
  pulling just that field into 1.2.5.
- **A loss year is floored to zero** (`estimate.ts:12-15`, `:71-77`), so the app can never show that
  gig work reduced a W2 tax bill. ⭐ **Both lenses found this independently**, from opposite directions —
  the strongest signal the scan produced.
- **Clawbacks, chargebacks and reversals cannot be recorded** — every money field is clamped
  non-negative. Pair with the 1099 reconciliation item; both are the logged total not matching reality.
- **No multi-state or part-year residency** — a single state of residence only.

- **`formatCurrency` is defined TEN times across screens, in two different signatures → 1.2.11.**
  Ten local copies (`DashboardScreen`, `ShareCard`, `OnboardingScreen`, …), four of which take a
  `fractionDigits` argument and six of which do not — so the same dollar figure can render with or
  without cents depending on which screen shows it. 1.2.4.4 added an eleventh rather than
  consolidating, **deliberately**: the shared helpers this codebase does have (`totalEntryExpenses`)
  were extracted when a second caller appeared, not retrofitted across ten files mid-feature.
  ⚠️ Whoever does it must diff the two signatures' output first — this is a *presentation* change to
  money figures on every screen. **Deferred, not folded.** _(Found 2026-09-21 at the 1.2.4.4 before-scan.)_
- **⚠️ Any future non-user-edited `Entry` field will be DROPPED on edit, and nothing warns → 1.2.11.**
  `AddEntryScreen.handleSave` builds a complete `Entry` literal field by field; `id` and `createdAt`
  survive only because they are copied there by hand. 1.2.4.2 hit this with `setAsideRate` and fixed
  it at the provider, but the *shape* is still there and the next such field repeats it. A lint rule
  cannot see it; what would is a test asserting that saving an edit preserves every key the previous
  entry had except the ones the form owns. **Deferred, not folded:** it is a test-infra guard over a
  class, and 1.2.11 is the CI-gate item. _(Found 2026-09-21 at the 1.2.4.2 after-scan — by the e2e,
  after the unit tests were green.)_
- **`vitest` does not typecheck, so a green suite can assert over fields that do not exist → 1.2.11.**
  A test fixture named two `TaxProfile` fields that are not on the type and ran green, describing a
  W2 job with no salary. `tsc` catches it, but only when someone runs it — the two are separate
  commands and CI's cheap gate should fail on either. **Deferred, not folded:** same family as the
  audit gates 1.2.2.7 wired in. _(Found 2026-09-21 at the 1.2.4.2 after-scan.)_
- **Recovery is all-or-nothing: a device where only *some* keys are unreadable salvages none of it
  → v1.3.** `load()` is a `Promise.all` of four reads, so one bad value lands on the recovery screen
  with the other three discarded. "Restore from a backup" is a different offer when the entries were
  fine and only the profile was not. **Deferred, not folded:** all-or-nothing was chosen knowingly at
  1.2.3.3 and is the safe direction; partial recovery needs a per-key read result and a UI that can
  say *what* was lost, which is its own item. _(Found 2026-09-21 at the 1.2.3.1 after-scan.)_
- **No test in this repo renders a React provider → 1.2.11.** There is no `@testing-library/react`
  and no `jsdom`, so `AppDataContext`, `ThemeContext` and `AppGate` are reachable only through
  Playwright. That worked here — 1.2.3.4 injected a `localStorage` failure at the real boundary,
  which is arguably *better* evidence — but it means every provider-level assertion costs a 3-minute
  browser run, and props-level states (`busy`, `retryFailed`) are covered only incidentally.
  **Deferred, not folded:** adding a test dependency mid-item, with this repo's `--use-system-ca`
  install quirk, is its own change. _(Found 2026-09-21 at the 1.2.3.4 before-scan.)_
- **⚠️ There are now TWO clear-data paths, and 1.2.10 must unify them, not just fix one.**
  `clearAllLocalData` (3 keys, backs Settings' "clear all data") and `discardUnreadableLocalData`
  (4 keys, backs recovery). 1.2.10 already carries *"`clearAllLocalData` omits `appSettings` against
  the stated policy"* — **that entry now has a second half**: once it removes `appSettings` too, the
  two functions are the same function and one should go. _(Found 2026-09-21 at the 1.2.3.3
  before-scan.)_
- **`vi.mock` factories are not type-checked, so a hand-written mock can outlive the module it
  stands for → 1.2.11.** Changing `encryption.ts`'s exports at 1.2.3.2 left `demoStore.test.ts`
  mocking functions that no longer exist: **`tsc` stayed clean while five tests went red**, and had
  those tests been less thorough it could as easily have gone green against an API the app no longer
  has. Only two suites mock this way today, so the fix is small — `vi.mock(import("..."), async
  (importOriginal) => …)`, which fails on a missing export. **Deferred, not folded:** 1.2.11 is the
  CI-gate/test-infra item and this is the same family. _(Found 2026-09-21 at the 1.2.3.2 after-scan.)_
- **⚠️ The lint ledger says 14; `npx eslint src/` now reports 15 (13 errors, 2 warnings) → 1.2.11.**
  All in `components/` and `app/` — none in anything 1.2.3 touched — so it is ledger drift, not a
  regression. Re-count at 1.2.11 rather than trusting the number in the resume block.
  _(Found 2026-09-21 at the 1.2.3.2 after-scan.)_
- **🔴 The stored ciphertext has no MAC, and the key is used as a PASSPHRASE → v1.3, as one format
  change.** Two findings that must land together because both rewrite the on-disk payload.
  **(i) No integrity tag.** Measured: a wrong key, a truncated payload and outright garbage all
  return the *same* empty string from `decryptText` — corruption, tampering and key loss are
  indistinguishable. Encrypt-then-MAC (HMAC-SHA256) would separate them. **(ii) The 256-bit key is
  passed to `CryptoJS.AES.encrypt` as a string**, so CryptoJS treats it as a *passphrase* and derives
  the real key with OpenSSL's `EVP_BytesToKey` — MD5, one iteration, which is why every ciphertext
  starts `U2FsdGVkX1` ("Salted__"). The entropy is fine; the derivation is weak for no benefit.
  Passing a `WordArray` key + explicit IV uses the 256 bits directly. **Deferred, not folded:** 1.2.3
  makes a read failure *recoverable*, and the recovery is identical whichever of the three caused it
  — a MAC buys a better *diagnosis*, not a different action. Both need a read-both-formats migration.
  _(Found 2026-09-21 at the 1.2.3 before-scan, by measuring CryptoJS's behaviour rather than reading it.)_
- **🔴 Backup restore does no validation of entry contents → 1.2.10.** `parseBackupSnapshot` checks
  `Array.isArray(candidate.entries)` ([backup.ts:51](apps/mobile/src/backup.ts#L51)) and then passes
  `candidate.entries` straight through as `Entry[]` ([:60](apps/mobile/src/backup.ts#L60)) — no
  per-field validation, no type coercion, no bounds. A truncated, hand-edited or foreign JSON file
  imports garbage directly into the store, and restore **overwrites all current local data**. ⚠️ The
  same wholesale pass-through is *why* new optional `Entry` fields round-trip for free — the property
  1.2.2 depends on — so the fix must preserve forward-compatibility rather than whitelist known keys.
  **Deferred, not folded:** it is a correctness fix to a path 1.2.2 only reads.
  _(Found 2026-09-20 while verifying 1.2.2's schema cost — by reading the parser, not its docstring.)_
- **🔴 35 of 42 taxing states model NO dependent mechanism at all → its own v1.3 workstream.**
  Measured 2026-09-21 by `npm run audit:dependents`, not by hand. Only **7** states model anything:
  GA/SC/MN (exemptions, fixed at 1.2.2.1) and AR/DE/NE/OR (small credits). Spot-confirmed against
  sources that the gap is real and material — **CA $489/dependent credit, NJ $1,500 exemption, MA
  $1,000 exemption**, all currently ignored. ⚠️ **Direction is SAFE** — omitting a deduction
  *overstates* tax, unlike GA/SC/MN which understated it — which is the whole reason this defers
  while those shipped immediately. **Deferred, not folded, and deliberately not "just the big
  states":** picking CA and NY by population would repeat the exact error that produced this
  finding (three states fixed because three were looked at). It needs a systematic pass over all 42
  with a statute citation each — real research, its own item, not a sub-step.
  _(Found 2026-09-21 at the 1.2.2.2 audit.)_
- **Nothing stops a money-spending site from reading `canUsePremium` → 1.2.11.** [D5]'s guarantee is
  currently held by a doc comment: purchase, PDF export and the "Premium active" row must read
  `usePremium().isPremium`, and nothing checks that they still do. An ESLint `no-restricted-imports`
  or a targeted lint rule over `PaywallScreen`/`handleExportPdf` would make it a CI fact rather than
  a request. **Deferred, not folded:** 1.2.11 is already the lint-rule/CI-gate item, and this is the
  same family as the AsyncStorage restriction filed there. _(Found 2026-09-20 at the 1.2.1.6
  after-scan — the second guarantee in this item held only by comment.)_
- **Nothing *enforces* that persistence goes through `repository.ts` → 1.2.11.** Add an ESLint
  `no-restricted-imports` rule allowing `@react-native-async-storage/async-storage` only in
  `src/storage/`, so demo mode's isolation guarantee is checked by CI rather than requested by a
  comment. **Deferred, not folded:** 1.2.11 is already the lint-rule/CI-gate item, and it runs after the
  files in question stop being rewritten. _(Found 2026-08-08 at the 1.2.1.1 after-scan.)_
- **`appReview.ts` writes AsyncStorage directly, outside the repository and unencrypted → 1.2.11.**
  1.2.1.3 neutralizes it *in demo*; consolidating it (and any sibling) into `repository.ts` so the
  "one persistence path" claim becomes true is the broader fix. **Deferred, not folded:** it touches a
  path demo mode doesn't need changed. _(Found 2026-08-08 at the 1.2.1 before-scan.)_
- **`SCREENSHOT_PLAN.md`'s persona will have two sources of truth once 1.2.1.2 lands → 1.2.12.** Point
  the plan at the demo seed (one-tap, as it already anticipates) instead of the hand-maintained
  `maya-persona-backup.json`. _(Same provenance.)_
- **🔴 `Chip` announces no selected state to screen readers → 1.2.9 (a11y audit).** `Chip` sets
  `accessibilityState={{ selected }}` with `accessibilityRole="button"`, and **RN-Web drops it** —
  ARIA doesn't allow `aria-selected` on `button`, so the accessibility tree renders a bare
  `button "Dark"` with no indication it's the active choice. **`Chip` is the app's selection primitive**
  (filing status, platform, theme, tax year), so a VoiceOver user currently cannot tell which option is
  selected *anywhere in the app*. Fix is likely `radio`/`radiogroup` semantics for mutually-exclusive
  sets, or `aria-pressed` for toggles. **Deferred, not folded:** it changes a shared primitive used
  across every screen, so it belongs in the audit that sweeps them all. _(Found 2026-08-07 at 1.2.0.2,
  by reading the a11y snapshot after a test assertion failed against it.)_
- **Settings `Switch`es carry no `accessibilityLabel` → 1.2.9 (a11y audit).** App Lock and Quarterly
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

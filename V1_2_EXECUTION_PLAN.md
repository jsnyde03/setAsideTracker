# v1.2 — Execution Plan · **THE ACTIVE DRIVER**

> **This file is where active work lives** (Jason 2026-08-07). One active item at a time, decomposed
> here and nowhere else. Detail of completed work → [V1_2_LOG.md](V1_2_LOG.md). Version ladder →
> [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Nothing else carries a v1.2 queue.

> ## ⏭️ RESUME HERE — 2026-09-22
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
> 🔴 **FIVE defects are STILL LIVE in v1.1.1 and fixed only on this branch:** three money-wrong tax
> bugs · a data-loss path that greets an unreadable-data user as brand new and overwrites them · a
> tax-profile edit that erases the user's filed prior-year tax · reminders that reach no existing
> install while their queue drains · and "Clear All Data" leaving the app lock ON, so the next launch
> demands Face ID for an app with nothing in it. ⚡ **Every one was found by BUILDING ON TOP OF IT**,
> none from a backlog. **None reaches anybody until v1.2 ships** — [D10]'s accepted cost, and the
> reason to keep moving.
>
> ✅ **No ship date ([D9]).** August is retired and deliberately not replaced — **work the queue and
> ship as soon as it is done.** Do not reintroduce a target.
>
> ✅ **1.2.2–1.2.6 and 1.2.10 ARE ALL COMPLETE** and closed. **▶ ACTIVE: 1.2.7, native iPad**,
> decomposed below — and promoted with its weakness stated: **its verification is almost entirely
> visual and device-owed**, so it banks checks for the reserved build rather than clearing them here.
> 🔴 **Flipping `supportsTablet` obliges iPad screenshots in App Store Connect.**
> ⛔ **The reserved build now owes four things** — ITMS-91053, the **"Missing Compliance"** answer
> ([D23], which is also how the export question gets answered at all), 1.2.5's mileage stack, and
> every iPad layout once 1.2.7 lands. Agenda → [V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md).
> ⛔ **1.2.5 has ZERO device verification and cannot get any off-device.** The one-build agenda is at
> the head of [V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md) — **one build, four items'
> worth**, minutes reserved for it. **⏸ 1.2.1 is 7/7 built**, Maestro waiting on ~November.
> Health: **378** mobile unit · **102** engine · **66/66** Playwright · typecheck clean · both tax-config
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
> ⏸ **MAESTRO IS PAUSED — and "out of minutes" was the wrong summary.** ⚠️ **Codemagic is ~80%
> consumed; Jason stopped the Maestro work deliberately to RESERVE the remainder for TestFlight
> builds** _(Jason 2026-09-21, correcting this block)_. So a device build **is** available — it is
> scarce and spoken for. **What follows: never spend one on a single item.** Accumulate the
> device-owed work and send one build carrying all of it. Maestro resumes ~November 2026.
> **Next Maestro action when minutes return: dispatch the CURRENT branch tip and read the log.**
> Nothing is owed on this machine; everything is pushed. Full narrative → [V1_2_LOG.md](V1_2_LOG.md).
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
is green**, and Maestro resumes ~November (minutes reserved for TestFlight — see the resume block). ⚡ **Its one genuine open risk is now
answered:** `enterDemo()` works on a real simulator build, so demo mode is not broken on device.
What remains unproven is the *flow*, not the feature. Detail + 10 scan records → [V1_2_LOG.md](V1_2_LOG.md).

✅ **[D11] the persona stays at ONE tax year** — year-over-year therefore cannot be previewed, accepted
because the gate is about data, not payment. An e2e asserts the absence.

---

### 📱 **1.2.7 — Native iPad** · **ACTIVE**

**Why it is next:** the queue's own row order, now that 1.2.10's upload gates are cleared. ⚠️ **It is
also the worst fit for the current constraint and that is known going in** — almost all of its
verification is visual and device-owed, so expect it to bank checks for the one reserved build
rather than prove them here.

🔴 **Flipping `supportsTablet` obliges iPad SCREENSHOTS in App Store Connect.** That is a submission
requirement, not polish — the flip and the store assets ship together or the listing is incomplete.

⚡ **Before-scan 2026-09-22 changed the item's shape: it is NOT as device-owed as promoted.** The
Playwright suite already runs at **1280×720** — wider than iPad portrait — so the app provably
survives being wide *functionally*; it is simply not *designed* for it (no `maxWidth` outside
`LockScreen`/`RecoveryScreen`). **Decision (Jason 2026-09-22): the seam is built on
`useWindowDimensions`, and iPad viewports join the e2e suite** — live-resize then works by
construction and .1–.5 are verifiable here, leaving the reserved build to confirm *fidelity* rather
than discover breakage. ⚠️ **Corrected: 15 screens, not 13** — `RecoveryScreen` (1.2.3) and
`LockScreen` were never counted. Detail → [V1_2_LOG.md](V1_2_LOG.md).

| # | sub-step | scan |
|---|---|---|
| **1.2.7.1** | ✅ **DONE 2026-09-22.** `supportsTablet: true`; iPad gets all four orientations via **`UISupportedInterfaceOrientations~ipad`** while the iPhone stays portrait — ⛔ **"unlock `orientation`" as written would have let the PHONE rotate.** Gated (`tabletOrientation.test.ts`, 4 plants/4 caught) + the two iPad Playwright projects. **Baseline measured: the dashboard card spans 98–99% of the viewport.** | ✅ |
| **1.2.7.2** | **The size-class seam, in `components/Screen.tsx`** — confirmed the single wrapper all **15** screens import. One place decides compact vs. regular on `useWindowDimensions`, so no screen invents its own breakpoint. | ⬜ |
| **1.2.7.3** | **Dashboard at regular width** — the multi-column layout. The screen that matters most and the one with the most on it. | ⬜ |
| **1.2.7.4** | **The other 14 screens at regular width.** ⚠️ **Sheets and modals first** — confirmed full-bleed today, which reads as broken on a 13" display. | ⬜ |
| **1.2.7.5** | **Split View / Stage Manager: survive being RESIZED LIVE**, not merely launched wide. Falls out of .2's breakpoint source, and is asserted by resizing the viewport mid-test. | ⬜ |
| **1.2.7.6** | **Hardware keyboard** — tab order through forms, escape to dismiss a sheet. ⛔ Device-owed. | ⬜ |
| **1.2.7.7** | **iPad screenshots** for the listing (see the red note above). | ⬜ |
| **1.2.7.8** | **Verify + whole-item after-scan.** | ⬜ |

**Exit line:** the app looks designed for an iPad rather than stretched to fit one, it survives a live
resize, and the listing has the screenshots the `supportsTablet` flip obliges.
## 📋 Queue — everything else _(terse rows; decomposed only on promotion)_

_1.2.1 (parked) and 1.2.10 (active) are not listed here — they are above. 1.2.2–1.2.6 are in
**Closed**. An item appears in exactly one place._

⚠️ **1.2.10 was moved ahead of 1.2.7 on 2026-09-21 ([D21])** — row order is build order, and this is
the row moving, not the numbering. Its two upload-time gates decide whether the single reserved
TestFlight build survives submission at all.

⛔ **Numbers are STABLE IDs — do not renumber on insert.** A new item takes the **next free number**
and is placed in the right row; **build order is this table's row order**, never the numbering. Two
renumbers on 2026-09-20 broke 13 cross-references between them — a backlog entry pointing at "the
a11y audit" silently came to mean the iPad item, and only a grep caught it. The one-line cost of an
out-of-order number is worth less than one more round of that.

| # | item | notes |
|---|---|---|
| 1.2.8 | **Guided onboarding tour** | Full coachmark tour over populated views. Reusable overlay system. Render **outside** gesture handlers. |
| 1.2.9 | **Accessibility depth audit** | Dynamic Type · VoiceOver · 44pt targets · contrast · reduce-motion. VoiceOver end-to-end is device-owed. |
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

- **1.2.10 — Filed correctness + submission compliance ✅ DONE 2026-09-22, 6/8 built, 2 deferred.**
  The app had **no privacy manifest** (Expo writes one only when asked) · **[D22]** analytics stopped
  sending the state code, deleting a Coarse Location category from three documents at once ·
  **[D23]** the export-compliance bypass was **removed so Apple's questionnaire answers it** rather
  than us · `clearAllLocalData` omitting `appSettings` was a **lockout**, not untidiness · and a
  **destructive restore validated nothing** beyond `Array.isArray`. ⚡ **Four executable gates
  replaced four written promises.** .5 and .7 deferred to v1.3 as features. **378 unit · 102 engine ·
  66/66 Playwright · 9 plants, 9 caught.**
  _Sub-step detail + 3 scan records → [V1_2_LOG.md](V1_2_LOG.md)._

- **1.2.6 — Premium slice ✅ DONE 2026-09-21, 6/6.** Four premium surfaces on the tax-time axis, and
  **nothing that was free became paid**: the per-quarter amount beside a still-free due date · the
  safe-harbor payment tracker, **per quarter** ([D19]) · "best days to work" ([D20]) · the Schedule C
  drill-down. ⛔ **Three of the six items were wrong as specified and the before-scans caught all
  three** — a per-year payments model that could not answer its own question, an optimizer whose
  headline had **no data behind it** and whose other half already shipped free, and a "surfacing fix"
  that was a build. 🔴 **Two live v1.1.1 defects fixed on the way**: editing the tax profile erased
  `filedTaxByYear`, and reminders reached no existing install while their queue silently drained.
  **346 unit · 102 engine · 66/66 Playwright · 29 plants, 29 caught.**
  _Sub-step detail + 7 scan records → [V1_2_LOG.md](V1_2_LOG.md)._

- **1.2.5 — Mileage trip toggle ✅ DONE 2026-09-21, 6/6.** Start/stop trip capture that keeps
  measuring while the app is off screen ([D17]: when-in-use + the visible iOS indicator, no
  "Always" prompt), with accuracy/jitter/speed filters because a naive sum inflates a **tax
  deduction**, and a warning when a trip has silently stopped counting. **Coordinates are never
  persisted** — [D16]'s published wording, enforced by a test. Also **[D16]: one privacy
  policy**, after the two copies were found disagreeing about whether the app shares data at all.
  **306 unit · 50/50 Playwright · 10 plants, 9 caught.** ⛔ **Zero device verification and no way
  to get any off-device** → the one-build agenda heads
  [V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md).
  _Sub-step detail + 6 scan records → [V1_2_LOG.md](V1_2_LOG.md)._

- **1.2.4 — Set-aside split by date and week ✅ DONE 2026-09-21, 6/6.** Every entry now freezes a
  set-aside rate at log time — **the tax it actually adds**, so the increments telescope to the
  year's real total — rolled up into Monday–Sunday weeks ([D13]), shown on the dashboard beside
  the year total ([D15]), with legacy weeks marked estimated ([D14]) and an **adjustment row** so
  the list visibly adds up. **272 unit · 50/50 Playwright · 11 plants, 9 caught — and the 2 that
  PASSED each changed something.** 🔴 The whole-item scan caught the demo persona rendering every
  week as "estimated". _Sub-step detail + 6 scan records → [V1_2_LOG.md](V1_2_LOG.md)._

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
| **[D10]** | **No interim patch release — the three live money-wrong bugs are fixed in v1.2, not in a v1.1.2.** Recommendation on record was a cheap disclosure patch (MFJ warning + safe-harbor caveat) while the real fixes were built; **Jason chose the single correct release instead.** Tradeoff accepted knowingly: v1.1.1 keeps understating what users owe until v1.2 ships. | Jason 2026-09-20 |
| **[D11]** | **The demo persona stays at ONE tax year.** Year-over-year therefore cannot be previewed — accepted, because the gate is about data, not payment. Revisit only if the demo becomes the primary premium sales surface. | Jason 2026-09-20 |
| **[D12]** | **The recovery surface offers three explicit routes — retry, restore-from-backup, erase — and nothing silent.** ⚠️ **Retry is not politeness:** `expo-secure-store` defaults to `WHEN_UNLOCKED`, so a launch before the device's first unlock can return null **transiently**, which is not key loss — erasing or re-keying on it would destroy good data. Restore is the only genuine recovery the app has, and a user stranded on this screen cannot reach Settings to find it. | Jason 2026-09-21 |
| **[D13]** | **A week is Monday–Sunday, fixed.** DoorDash, Uber and Spark all run their pay weeks Mon–Sun, so the app's week matches the earnings statement the user is comparing it against. **Not configurable** — a user-chosen week start is a setting nobody asked for that every weekly figure would then depend on. | Jason 2026-09-21 |
| **[D14]** | **Entries logged before the frozen field exists get a computed figure, and any week containing one is MARKED ESTIMATED.** Rejected both alternatives deliberately: "—" greets every existing user with a wall of blanks across data they really have, and a silent back-fill presents a reconstructed number as though it had been frozen at the time — **the exact thing [D7] exists to prevent**. The label is what makes the third option honest rather than convenient. | Jason 2026-09-21 |
| **[D15]** | **"This week" sits on the dashboard beside the YTD total**, past weeks behind a drill-down. [D7]'s point is that the week becomes the unit the user acts on, and a figure behind a tap does not become anyone's rhythm. The year total stays — it is what is actually owed. | Jason 2026-09-21 |
| **[D16]** | **`docs/privacy.html` is the single privacy policy; the markdown copy is retired.** It is already what the app links to, what App Store Connect points at and what the code comments treat as canonical. **Rejected keeping both in sync via a generator** — the drift that prompted this was a *factual* contradiction about third-party data sharing, and the fix for that is one document, not tooling that keeps two. ⚠️ Three places state the same claims and all must move together: the policy, the App Store Connect privacy labels, and the permission usage strings in `app.json`. | Jason 2026-09-21 |
| **[D17]** | **The tracker keeps measuring while the app is off screen — `UIBackgroundModes: location` plus the visible iOS indicator, on WHEN-IN-USE permission. No "Always" prompt, so [D8]'s line holds.** ⛔ **The alternative was a tracker that under-counts by design:** a gig worker's phone shows the delivery app, not this one, so foreground-only capture would quietly miss most of the drive — and under-claiming a deduction is the same shape of defect as the three understating bugs 1.2.2 exists to fix. Accepted costs: a TaskManager background task, more App Store review scrutiny, and **nothing here is provable without a device**. ⚠️ **Android stays foreground-only** — its background-location permission is a separately justified Play review and Android ships in v1.3. | Jason 2026-09-21 |
| **[D18]** | **The per-quarter figure goes on the DASHBOARD; the reminder notification carries no dollar amount.** A notification body is frozen when it is scheduled — only at onboarding or a Settings toggle, never on dashboard mount — and the OS delivers it up to a year later, while `perQuarter` moves with every entry logged. **A stale figure beside a payment instruction is the same defect class 1.2.6.2 exists to remove.** The existing "check your dashboard" pointer is the one part of a months-old message still true when it fires, and it routes to a number that recomputed today. Also sidesteps two entitlement edges: a lapsed subscriber still delivered premium content, and a later subscriber who is not. | Jason 2026-09-21 |
| **[D19]** | **The payments-made model is PER-QUARTER, not a per-year total.** The plan said to follow `amountSetAsideByYear`'s `Record<year, number>` shape. ⛔ **That shape cannot answer the question the tracker exists to answer:** safe-harbor penalties are computed per period, so a single annual figure reports a user who paid nothing until January as fully compliant. Stored as `Record<year, { q1?, q2?, q3?, q4? }>`, checked against the four due dates 1.2.6.2 corrected. **Rejected the richer per-payment shape with dates** — it only pays for itself in an actual underpayment-penalty calculation, which v1.2 is not doing. | Jason 2026-09-21 |
| **[D20]** | **The shift/earnings optimizer ships as DAY-OF-WEEK only, gated on per-weekday sample size.** ⛔ **Its specified headline could not be built and half of it already existed.** `Entry` carries no time, and nothing in the app ever recorded one, so *"best time-of-day"* — named in ROADMAP §9.1 and IMPLEMENTATION_PLAN §347 — had no data behind it; and per-platform earnings + effective hourly rate with the best rate highlighted **already shipped, for free**, on `PlatformComparisonScreen`, so rebuilding it behind the paywall would have taken something away from free and broken 1.2.6's own gating rule. **Day-of-week is the one axis the data supports and the app does not already show.** ⚠️ **The flat "~30 entries" gate is retired**: nothing derived the 30, and at 20 seeded entries it excluded the demo that was supposed to make the feature demoable. Replaced by the mechanism it was proxying — a weekday reports once it has **≥3 entries**, the screen appears once **≥2 weekdays** qualify. Measured: the persona lands 4 qualifying weekdays on any date. **Time-of-day deferred to v1.3+**, and it needs a data-model change before it is even a candidate. | Jason 2026-09-21 |
| **[D21]** | **1.2.10 runs before 1.2.7 (native iPad).** ⛔ **Two of its items are UPLOAD-time gates** — the iOS privacy manifest (ITMS-91053) and `ITSAppUsesNonExemptEncryption`, declared `false` while the app does AES-256 — and **no `.xcprivacy` exists in the repo at all**. The single reserved TestFlight build is spent at *upload*, so getting these wrong kills the build four items are waiting on before it reaches a device. 1.2.10 is also pure JS/config, which is the right shape of work while device builds are scarce; **1.2.7 is layout work whose verification is almost entirely visual and device-owed** — the worst possible fit for the current constraint. | Jason 2026-09-21 |
| **[D22]** | **Analytics stops sending the user's state code.** A US state describes where someone is at lower precision than three decimal places, which is Apple's definition of **Coarse Location** however the app came by it — so declaring it would have put a location category in the privacy manifest, the App Store labels **and** the policy, on a tax app that collects no location otherwise. ⚡ **Not collecting it removes the question from all three places rather than answering it three times.** Rejected declaring it as "Other Data" — defensible, but being wrong about a location category is an App Store rejection. Cost: the state distribution of the user base is no longer measurable, which mattered because state tax configs are per-state work. | Jason 2026-09-22 |
| **[D23]** | **`ITSAppUsesNonExemptEncryption` is REMOVED, so App Store Connect asks instead of being pre-answered.** The key's only function is to bypass the export-compliance questionnaire. The app encrypts local data with **crypto-js AES-256** — not the OS's crypto — and whether that is exempt turns on **Note 4 to Category 5 Part 2**, the *primary-function* test, **not on whose library it is** _(which is how this was first framed, wrongly)_. The reading that the app qualifies is defensible — its primary function is tax **calculation**, and BIS lists inventory-management software as a Note 4 example — **but it is a reading, and this is a legal declaration.** ⚡ **So we stopped answering the question and started asking it:** Apple's own flow produces the classification at first upload, and it gets recorded then. ⚠️ Cost: every build lands as **"Missing Compliance"** until answered in ASC — documented in both checklists so it is not mistaken for a broken build. | Jason 2026-09-22 |
| **[D24]** | **The iPad size-class seam is built on `useWindowDimensions`, and iPad viewports join the Playwright suite.** ⛔ **1.2.7 was promoted as "almost entirely device-owed" and that was a property of the intended implementation, not of the item.** The e2e suite already runs at **1280×720 — wider than iPad portrait** — so the app is proven to *survive* regular width; the item's real content is appearance. On `useWindowDimensions` the breakpoint re-renders on resize, so **Split View live-resize (1.2.7.5) falls out by construction** and is assertable by resizing the viewport mid-test; on a `Platform.isPad`-style constant both the behaviour and the check are lost. ⚠️ **Does not make the reserved build optional** — RN-web at 1024px is not UIKit at 1024pt, and 1.2.7.6 (hardware keyboard) stays device-owed. It moves the build from *discovering* layout breaks to *confirming* their absence. | Jason 2026-09-22 |
| — | Guided onboarding = the **full coachmark tour**, not a lightweight intro. | Jason 2026-06-30 |
| — | Demo mode is **isolated and fully reversible**. | Jason 2026-06-30 |
| — | Free half stays free; premium half is **additive**, on the tax-time/complexity axis. | standing |

## ⚠️ External prerequisites — Jason-side

**Gating 1.2.5 (the mileage toggle) — v1.2's only native item** _(said "1.2.3"; corrected 2026-09-21)_**:**
1. ✅ **DONE 2026-09-21 at 1.2.5.1.** The collision was real and worse than described — the two copies
   disagreed about whether any data is shared with third parties at all. `docs/privacy.html` is now the
   only policy ([D16]) and it discloses the location capture. **Nothing is owed here before review.**
2. **A `NSLocationWhenInUseUsageDescription` string that justifies the capture** — built at 1.2.5.2 —
   **plus App Store review notes**, and ⚠️ **the App Store Connect privacy labels updated to declare
   location**, which is a third declaration that has to agree with the other two ([D16]). When-in-use is a far lighter ask than background — **keep it that way**;
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

### From 1.2.7's before-scan _(2026-09-22)_

- 🔴 **NO TEST IN THIS REPO HAS EVER RENDERED THE APP AT PHONE WIDTH → 1.2.9/1.2.11.** The Playwright
  suite's only project is `Desktop Chrome` at **1280×720**, and the app ships **portrait iPhone
  only**. So 66 green e2e tests have been validating a viewport no shipping user has, and every
  phone-width layout claim in v1.2 rests on device screenshots alone. ⚡ **1.2.7 adds iPad
  viewports, which makes the omission of the actual shipping width the conspicuous one.** Adding a
  390×844 project is one config line; **deferred, not folded, because it could red an unknown number
  of tests mid-item** — that is a triage workstream, not an iPad sub-step. ⚠️ Whoever takes it should
  expect real findings, not a clean pass: this is the same shape as "the suite is green because
  nothing would have failed." _(Found at the 1.2.7 before-scan, by reading the Playwright config to
  see whether iPad widths could be driven here.)_

- **Analytics / crash opt-out toggle → v1.3.** Not promised by the policy and not required by Apple;
  a genuine feature (persisted setting + gating both `init` calls + tests) that does not belong
  inside a compliance item. ⚠️ **The row claiming the policy promised one was mine, written the day
  before** — a same-session misdescription, checked and corrected rather than built.
- **Tax-profile completeness prompt → v1.3.** Measured: missing W2 figures produce zero withholding,
  so the set-aside comes out **too high**. Conservative, not wrong — a UX nudge.

### From 1.2.10.1 _(2026-09-22)_

- 🔴 **A demo defect shipped in 1.2.6.3 and the CALENDAR found it, not a test.** The seed paid each
  past quarter `Math.round(perQuarter)` against an unrounded requirement, so "nothing overdue" was a
  coin flip on the cents — green 2026-09-21, red 2026-09-22. Fixed (`ceil`, plus a sub-cent clamp so
  float noise is never reported as a debt) and now gated by a **date-independent** invariant over the
  seed's existing seven sample dates. ⚠️ **The plant reds on only 2 of those 7**, which is exactly why
  it shipped. **Any demo assertion that depends on today's date is a latent 50/50.**
- **The app-level `NSPrivacyAccessedAPITypes` list is unverifiable on this machine.** Only the upload
  says which required-reason APIs are undeclared (ITMS-91053 names them). `UserDefaults / CA92.1` is
  declared because it is true; the rest is confirmed by the first submission → checklist §A.

### From 1.2.6's WHOLE-ITEM after-scan _(2026-09-21)_

- **Absence assertions with no positive control — 4 remaining candidates.** A scripted sweep found 5;
  `year-over-year.spec.ts` was the one real gap and is fixed. The rest are artifacts of the script
  scanning backwards within a test body, so it misses controls that live in a helper or come after
  the absence. ⚠️ **The script is the deliverable, not the list** — re-run it at 1.2.11 rather than
  re-enumerating by hand. **Script: `tools/sweep-hygiene.mjs`** — in the repo, because the
  scratchpad it was written in does not survive the session that made it.
- 🔴 **`RequirePremium` does not exist, and the five premium destinations are now enumerated from the
  mechanism** rather than by hand: whatever the dashboard routes through
  `canUsePremium ? X : onOpenPaywall`. All five carry `RequireTaxProfile` only. ⚡ **One of the new
  e2e tests relies on that hole to reach `/safe-harbor` directly** — closing it will need that test
  changed in the same edit, which is exactly the kind of coupling a later pass discovers the hard way.

### From 1.2.6.5 _(2026-09-21)_

- **Duplicate "Close" labels wherever a sheet sits over a screen that has its own.** Fixed here by
  naming the sheet's control "Close details"; `BreakdownDetailSheet` has the same plain "Close" and
  is opened over the dashboard, which has no Close of its own — so it is not currently ambiguous,
  but it is the same shape one screen away. Worth folding into **1.2.9**, the a11y audit, where
  duplicate accessible names on simultaneously-reachable controls is exactly the class being swept.

### From 1.2.6.4 _(2026-09-21)_

- 🔴 **No premium route has a route-level guard, so a deep link bypasses the paywall.**
  `/safe-harbor`, `/w4-optimizer`, `/year-over-year`, `/expense-breakdown` and now `/best-days` all
  wrap only in `RequireTaxProfile`; the gating lives entirely on the dashboard card's `onPress`.
  Pre-existing across all four, and the new screen follows the same shape deliberately rather than
  inventing a fifth pattern. Low severity — it exposes the user's own data, not anyone else's — but
  it is a paid feature reachable for free by anyone who knows the scheme. One `RequirePremium`
  wrapper closes all five.
- **Time-of-day earnings needs a data-model change before it is even a candidate.** `Entry` has no
  time field and never has. Adding one leaves it empty for every existing entry, so the view stays
  unbuildable for months after the field ships. ROADMAP and IMPLEMENTATION_PLAN were corrected in
  place so the next reader is not re-sold it. → v1.3+.

### From 1.2.6.3 _(2026-09-21)_

- 🔴 **`onEndEditing` is never reached by a web blur, so the prior-year filed-tax input's persist
  path is unverified here.** Found because the payment tracker's own inputs used it and the e2e
  proved they never committed; those moved to `onBlur`, the **existing** input on
  `SafeHarborScreen` was left alone rather than changed without coverage. It works on device — the
  gap is in what this machine can prove. Either move it to `onBlur` with a test, or make it a
  device-checklist row.
- **Sweep for other screens that rebuild a persisted object field-by-field.** Two are known: the
  tax-profile form (fixed here) and the entry form, whose dropped `setAsideRate` is restored in
  `AppDataContext.saveEntry` with a comment describing this exact hazard. ⚡ **The codebase already
  knew this failure mode in one place and not the other** — worth one grep at 1.2.11 rather than
  waiting for the third instance.

### From 1.2.6.1 _(2026-09-21)_

- **The dashboard amount's zero-case and non-current-year guards are unverified.** A plant removing
  `estimatedPaymentsNeeded > 0` was **not caught** — the web suite can only reach the premium side
  through the demo persona, which always has income and always sits in the current year. So "≈ $0.00
  per quarter" and a stale-year pairing are both reachable and untested. Cheap to cover if the demo
  ever gains a second year ([D11] says it will not) — otherwise a device spot-check.

### From 1.2.6.2 _(2026-09-21)_

- **`useReminderRefresh` has no test, and cannot get one here.** The rule it wraps is covered four
  ways; the hook around it is not, because this project has no React renderer — vitest runs plain
  Node and there is no testing-library. **Device/e2e-owed** → checklist. ⚠️ It is the same shape as
  `loadError` having no consumer (1.2.3): a correct rule, wired by code nothing exercises.
- **Consider a launch-time refresh for anything else scheduled from a one-off user action.** The
  reminder queue drained because scheduling happened only at onboarding; nothing structural stops the
  next such feature repeating it. Worth one grep at 1.2.11, not a rule yet.

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

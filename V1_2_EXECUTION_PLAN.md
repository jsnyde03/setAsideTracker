# v1.2 — Execution Plan · **THE ACTIVE DRIVER**

> **This file is where active work lives** (Jason 2026-08-07). One active item at a time, decomposed
> here and nowhere else. Detail of completed work → [V1_2_LOG.md](V1_2_LOG.md). Version ladder →
> [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Nothing else carries a v1.2 queue.

> ## ⏭️ RESUME HERE — 2026-09-20
>
> ⛔ **8 commits are LOCAL-ONLY.** `origin/v1.2` is at `dbafca7`; all of 1.2.1.1–1.2.1.5 plus the
> Sentry CI fix exist only on this machine. **Push before asking for any build** — the owed Maestro
> dispatch #2 would otherwise clone a tree with no demo mode in it. _(The previous resume block
> asserted the opposite. Committing is not shipping.)_
>
> 🔴 **THREE MONEY-WRONG BUGS ARE LIVE IN v1.1.1**, all understating what the user owes the IRS:
> safe harbor reports "no penalty expected" through both spring deadlines · MFJ ignores spouse income ·
> GA/SC/MN dependent exemptions are applied as tax credits. All confirmed against the code, all now
> **1.2.2**, which runs **before every feature item**. Per [D10] there is no interim patch.
>
> ✅ **No ship date ([D9]).** August is retired and deliberately not replaced — **work the queue and
> ship as soon as it is done.** Do not reintroduce a target.
>
> **▶ ACTIVE = 1.2.1 (demo mode), 5/7 sub-steps. Next action: 1.2.1.6** (premium preview per [D5]).
> Health at 1.2.1.5: **30/30** Playwright · **191** mobile unit · typecheck clean · lint 14 (all
> pre-existing, ledger clears at 1.2.11).
>
> **Queue restructured 2026-09-20** — two items Jason raised ([D7] split, [D8] mileage), two
> correctness blocks from the gap scan, and the widget **cut to v1.3**. Renumber map (original →
> final, one hop) → [V1_2_LOG.md](V1_2_LOG.md).
>
> ⚠️ **Standing caveat: everything in v1.2 is WEB/UNIT-VERIFIED ONLY.** react-native-web renders no
> `Alert`, no biometrics, no document picker, no real navigation stack. **Green here means "nothing
> else broke", not "this works on a phone"** — that happened three times in 1.2.1 alone. Device gates
> → [V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md). **Maestro dispatch #2 is owed and
> unsent**; its still-live triage rule (the swallowed `iPhone 15` boot failure that misreads as an app
> problem) is in [V1_2_LOG.md](V1_2_LOG.md).

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
dependency — 1.2.3 (location) is the next one.

---

## ▶️ ACTIVE QUEUE — exactly one item

### ▶ **1.2.1 — Demo mode** · 🔵 before-scan done 2026-08-08 · **5/7 sub-steps**

**Why it is next:** the bundle's lead item — reusable seed infrastructure the others consume. The
premium slice (**1.2.4**) is unshowable on an empty account, the tour (**1.2.6**) needs populated
views to teach over, and iPad (**1.2.5**) needs realistic content to lay out. _(Renumbered
2026-09-20 — this line previously pointed at three wrong items.)_

⚠️ **The before-scan killed the spec's central premise.** Persistence does **not** all funnel through
`repository.ts` — `appReview.ts` (one-shot review flag), notification scheduling and analytics all
bypass it. Isolation is a **three-file** guarantee, not one. Full record → [V1_2_LOG.md](V1_2_LOG.md).

| # | sub-step | scan |
|---|---|---|
| **1.2.1.1** | ✅ **Demo store — DONE 2026-08-08.** In-memory `demoStore.ts` + a one-function `backend()` switch; `repository.ts` now has **zero** direct `AsyncStorage.` calls. Premium cache deliberately exempt. 8 tests, verified by mutation. | ✅ |
| **1.2.1.2** | ✅ **Seed generator — DONE 2026-08-08.** `buildDemoSeed(now)` with day-offset dates, compressed (not spilled) when the tax year is too young — `entriesForYear` would otherwise drop the whole persona on 1 Jan. 29 tests across 7 calendar dates; totals verified against the plan's $6,213. | ✅ |
| **1.2.1.3** | ✅ **Leaks plugged — DONE 2026-08-08.** Guards at 4 choke points (review prompt · schedule · **cancel** · analytics), flag moved to a pure `demo/demoMode.ts`. ⭐ The scan found a **fourth** leak: `cancelQuarterlyReminders` wipes *all* device notifications, so a demo toggle would have deleted the real user's reminders. 9 paired tests. | ✅ |
| **1.2.1.4** | ✅ **Enter/exit — DONE 2026-08-08.** `DemoContext` inside `AppDataProvider`; entry on onboarding, exit first in Settings; entry rolls back if the re-read fails. ⭐ **`RequireTaxProfile` needed NO widening** — the demo seeds a profile, so the Debt `3.5.4.3` premise doesn't transfer and no guard was weakened. **Extended for [D6]:** one Settings row that enters or exits, so an onboarded account can explore — which is what made the item's exit line testable end-to-end. 5 new e2e → 28/28. | ✅ |
| **1.2.1.5** | ✅ **Marking — DONE 2026-08-08.** `DemoBanner` rendered by `Screen`, so all 13 screens get it and none opts in; first in the tree, so VoiceOver reaches it before any figure; tappable to exit. ⭐ **The screenshot caught a defect 4 suites couldn't** — the demo opened in the red "behind" state because the set-aside target is date-dependent and the seeded amount was a copied constant. Now derived from the engine, mutation-verified. | ✅ |
| **1.2.1.6** | **Premium preview without entitlement** — per **[D5]**: `isDemoPreview` alongside `isPremium` at the 4 gate sites; purchase + PDF export still check `isPremium` alone | ⬜ |
| **1.2.1.7** | **Tests** — Playwright enter/exit + real-data-untouched · Maestro flow · unit tests for seed + isolation | ⬜ |

**Exit line:** demo enters and exits clean with the real data **provably untouched**; every surface
showing demo money is marked as such **on screen and in the accessibility tree**; premium screens
preview populated while `subscribe`/`export` still route to the real paywall.

## 📋 Queue — everything else _(terse rows; decomposed only on promotion)_

_1.2.1 is not listed here — it is the active item above. An item appears in exactly one place._

| # | item | notes |
|---|---|---|
| 1.2.2 | **🔴 Tax-correctness block** | **NEW 2026-09-20, from the gap scan. Three confirmed money-wrong bugs, all understating what is owed**, plus the dependent asymmetry. Live in v1.1.1. **Precedes every feature item** — see the sequencing note below. |
| 1.2.3 | **🔴 Data-safety block** | NEW 2026-09-20. A decryption failure has no recovery path and key regeneration makes old data permanently unreadable; **no write anywhere is error-handled.** |
| 1.2.4 | **⭐ Set-aside split by date and week** | NEW 2026-09-20 ([D7]). Per-entry set-aside rolling up to weekly, replacing the YTD lump as the actionable unit. Rate **frozen at log time** via one optional `Entry` field. |
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
as the #1 risk to the date, with a standing "cut this before cutting the date"; 1.2.3 makes mileage
the native item instead. Its external prerequisites move with it.

_Item specs live in [V1_2_LOG.md](V1_2_LOG.md) and are retrieved at switch-in — not carried here.
⚠️ **Numbers shifted 2026-09-20** — pre-2026-09-20 references in the log use the old numbering; the
map is at the head of the log's item-spec section._

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
| **[D5]** | **Demo previews premium via a separate `isDemoPreview`, never by faking `isPremium`.** The entitlement boolean stays honest; purchase + export keep checking it alone. | Jason 2026-08-08 |
| **[D6]** | **Already-onboarded users can reach the demo too** — one Settings section that enters or exits. Also makes store screenshots shootable without wiping real data. | Jason 2026-08-08 |
| **[D7]** | **The set-aside splits per entry, rolling up to weekly** — not a derived weekly view alone. Each shift carries its own figure, **frozen at the rate in effect when logged**, so history never moves retroactively; the existing catch-up line reconciles the drift. | Jason 2026-09-20 |
| **[D8]** | **Mileage gets a start/stop toggle in v1.2 on when-in-use location; auto-detection waits for v1.3.** The **widget is cut to v1.3** so v1.2 carries one native item, not two. | Jason 2026-09-20 |
| **[D9]** | ✅ **NO SHIP DATE. Work through the queue and ship ASAP.** August is retired and not replaced — the version is paced by the work, not by a date. ⚠️ **Do not reintroduce a target date**; the correctness exposure from [D10] is the reason to go fast, not a reason to set one and cut against it. | Jason 2026-09-20 |
| **[D10]** | **No interim patch release — the three live money-wrong bugs are fixed in v1.2, not in a v1.1.2.** Recommendation on record was a cheap disclosure patch (MFJ warning + safe-harbor caveat) while the real fixes were built; **Jason chose the single correct release instead.** Tradeoff accepted knowingly: v1.1.1 keeps understating what users owe until v1.2 ships. | Jason 2026-09-20 |
| — | Guided onboarding = the **full coachmark tour**, not a lightweight intro. | Jason 2026-06-30 |
| — | Demo mode is **isolated and fully reversible**. | Jason 2026-06-30 |
| — | Free half stays free; premium half is **additive**, on the tax-time/complexity axis. | standing |

## ⚠️ External prerequisites — Jason-side

**Gating 1.2.3 (the mileage toggle) — v1.2's only native item:**
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

- **🔴 Backup restore does no validation of entry contents → 1.2.8.** `parseBackupSnapshot` checks
  `Array.isArray(candidate.entries)` ([backup.ts:51](apps/mobile/src/backup.ts#L51)) and then passes
  `candidate.entries` straight through as `Entry[]` ([:60](apps/mobile/src/backup.ts#L60)) — no
  per-field validation, no type coercion, no bounds. A truncated, hand-edited or foreign JSON file
  imports garbage directly into the store, and restore **overwrites all current local data**. ⚠️ The
  same wholesale pass-through is *why* new optional `Entry` fields round-trip for free — the property
  1.2.2 depends on — so the fix must preserve forward-compatibility rather than whitelist known keys.
  **Deferred, not folded:** it is a correctness fix to a path 1.2.2 only reads.
  _(Found 2026-09-20 while verifying 1.2.2's schema cost — by reading the parser, not its docstring.)_
- **Nothing *enforces* that persistence goes through `repository.ts` → 1.2.9.** Add an ESLint
  `no-restricted-imports` rule allowing `@react-native-async-storage/async-storage` only in
  `src/storage/`, so demo mode's isolation guarantee is checked by CI rather than requested by a
  comment. **Deferred, not folded:** 1.2.9 is already the lint-rule/CI-gate item, and it runs after the
  files in question stop being rewritten. _(Found 2026-08-08 at the 1.2.1.1 after-scan.)_
- **`appReview.ts` writes AsyncStorage directly, outside the repository and unencrypted → 1.2.9.**
  1.2.1.3 neutralizes it *in demo*; consolidating it (and any sibling) into `repository.ts` so the
  "one persistence path" claim becomes true is the broader fix. **Deferred, not folded:** it touches a
  path demo mode doesn't need changed. _(Found 2026-08-08 at the 1.2.1 before-scan.)_
- **`SCREENSHOT_PLAN.md`'s persona will have two sources of truth once 1.2.1.2 lands → 1.2.10.** Point
  the plan at the demo seed (one-tap, as it already anticipates) instead of the hand-maintained
  `maya-persona-backup.json`. _(Same provenance.)_
- **🔴 `Chip` announces no selected state to screen readers → 1.2.7 (a11y audit).** `Chip` sets
  `accessibilityState={{ selected }}` with `accessibilityRole="button"`, and **RN-Web drops it** —
  ARIA doesn't allow `aria-selected` on `button`, so the accessibility tree renders a bare
  `button "Dark"` with no indication it's the active choice. **`Chip` is the app's selection primitive**
  (filing status, platform, theme, tax year), so a VoiceOver user currently cannot tell which option is
  selected *anywhere in the app*. Fix is likely `radio`/`radiogroup` semantics for mutually-exclusive
  sets, or `aria-pressed` for toggles. **Deferred, not folded:** it changes a shared primitive used
  across every screen, so it belongs in the audit that sweeps them all. _(Found 2026-08-07 at 1.2.0.2,
  by reading the a11y snapshot after a test assertion failed against it.)_
- **Settings `Switch`es carry no `accessibilityLabel` → 1.2.7 (a11y audit).** App Lock and Quarterly
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

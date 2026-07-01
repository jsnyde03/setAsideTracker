# v1.1 Phase B — Premium Track Execution Plan

Companion to [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)'s v1.1 premium section (the *what*) and [ROADMAP.md](ROADMAP.md) (the *why*). This doc is the *how* and *in what order* for the premium tier — sequencing, dependencies, the external setup it's blocked on, and the testing/verification strategy.

**Branch:** continues on the `v1.1` branch. Nothing merges to `master` until v1.0 is live on the App Store (the standing rule). Phase A (the free tier) is already complete on this branch; Phase B builds on top of it.

**Status legend:** ✅ Done · 🔄 In Progress · ⬜ Not Started · ⛔ Blocked on external setup

## Hard gate — Phase B does not ship until these exist (user-owned)

<details>
<summary>None of the paid features can go live before the accounts/products they depend on are stood up.</summary>

These are the manual, account-level prerequisites. Claude can write all the code, but it can't create accounts, App Store Connect products, or dashboards. **Step-by-step directions for these live in [PHASE_B_SETUP_CHECKLIST.md](PHASE_B_SETUP_CHECKLIST.md) (the user's to-do list).**

| Prerequisite | Owner | Blocks | Notes |
|---|---|---|---|
| ⛔ Sentry project + DSN | User | Observability (Step 0) | Set `EXPO_PUBLIC_SENTRY_DSN`; separately add the `@sentry/react-native/expo` config plugin (org/project/auth token) to app.json **only when real creds exist** — placeholder creds break CI. See [errorReporting.ts](apps/mobile/src/errorReporting.ts). |
| ⛔ Analytics vendor account (PostHog or Amplitude) | User | Observability (Step 0) | Both have Expo support. Wire into the existing [analytics.ts](apps/mobile/src/analytics.ts) `trackEvent` shim. |
| ✅ App Store Connect IAP product(s) | User | IAP (Step 1) → everything paid | **Done 2026-06-30.** Auto-renewing subscription product(s); pricing tiers; the app is already in the Apple Small Business Program (15%). |
| ✅ RevenueCat dashboard config | User | IAP (Step 1) → everything paid | **Done 2026-06-30.** Project + entitlement + offering wired to the App Store Connect product and API key. |
| ⛔ v1.0 live on the App Store | User | Merging any of this to `master` | Phase B can be **built and TestFlight-tested** on `v1.1` before this, but must not merge to master until v1.0 is approved and live. |

**Why observability comes before paid features:** you need real crash data and usage patterns before making confident feature-prioritization and funnel decisions — this is operational work, not a separate version, and should land immediately post–App Store approval.

</details>

## Architectural ground truth (from a code audit, not roadmap prose)

<details>
<summary>The premium track is almost entirely greenfield; here's exactly what exists vs. what's new.</summary>

- **Observability is scaffolded, not live.** [analytics.ts](apps/mobile/src/analytics.ts) is a `trackEvent` shim that console-logs in dev and no-ops in prod (no vendor). [errorReporting.ts](apps/mobile/src/errorReporting.ts) reads `EXPO_PUBLIC_SENTRY_DSN` and no-ops entirely when unset. `@sentry/react-native` is installed; the Expo config plugin is deliberately **not** added (placeholder creds would break CI — see [codemagic.yaml](codemagic.yaml)'s `SENTRY_DISABLE_AUTO_UPLOAD`).
- **No payment layer at all.** No `react-native-purchases`, no entitlement check, no Paywall, no restore-purchases. This is the first real network dependency in an otherwise local-first app.
- **Expenses are 4 fixed buckets.** `EntryExpenses` = `parking | tolls | supplies | phone` ([types.ts](apps/mobile/src/types.ts)). No Schedule C line mapping, no custom categories. PDF/CSV export, Schedule C alignment, and custom categories all touch this model.
- **`Entry` has no IRS mileage-log fields.** It has a single `mileage` number, no business purpose / start-end location. Adding those is additive and is also the data-model prerequisite for v1.3 GPS-assisted mileage.
- **The W2 engine is live** (`W2_JOB_SUPPORT_ENABLED = true` in [featureFlags.ts](apps/mobile/src/featureFlags.ts); `deriveW2Incomes`/`estimateW2Withholding` in the engine). The W-4 optimizer builds directly on it.
- **The tax engine has no prior-year / safe-harbor concept.** Safe-harbor (Form 2210) is a greenfield engine module needing a prior-year-tax input (or auto-pull from the app's own stored estimate).
- **Navigation is a hand-rolled `screen` string union** in [App.tsx](apps/mobile/App.tsx). Every new screen (Paywall, PDF preview, W-4 optimizer, safe-harbor) = a union member + a render branch. No nav library.
- **Storage is an encrypted AsyncStorage repository** ([storage/repository.ts](apps/mobile/src/storage/repository.ts)). The cached IAP entitlement (for offline trust) fits here as another stored key.
- **CSV export already exists** ([csvExport.ts](apps/mobile/src/csvExport.ts)) — the PDF export parallels it and can reuse its aggregation shape.

</details>

## Step 0 — Observability (the prerequisite, Claude-codeable once creds exist)

<details>
<summary>Wire the existing Sentry + analytics scaffolds to real backends. Small, but everything paid leans on it.</summary>

- **Sentry:** with a real DSN set, `initErrorReporting()` already initializes. The remaining work is adding the `@sentry/react-native/expo` config plugin to app.json (org/project/auth token) for source-map upload — **only once real creds exist**, and re-validate the Codemagic build immediately after (this is exactly the kind of config-plugin change that has broken CI before).
- **Analytics:** implement `trackEvent` against the chosen vendor's SDK behind the existing shim — call sites already exist (`onboarding_completed`, `entry_logged`, etc.). Add the premium-funnel events the paywall work will need (`paywall_viewed`, `purchase_started`, `purchase_completed`, `restore_completed`).
- **Tests:** the shim stays a no-op in test/CI; assert call sites fire with the right event names (unit), not the vendor network call.

</details>

## Step 1 — IAP / RevenueCat (gates every paid feature)

<details>
<summary>The payment spine. Decided over Stripe web checkout (App Review 3.1.1 requires IAP). Native install + a paywall + an entitlement gate.</summary>

- **Install** `react-native-purchases` (SDK-correct version via `expo install`). **Native build pass required** before committing — check for standalone `.xcodeproj` globbing and config-plugin build phases ([project_codemagic_xcodeproj_glob_gotcha]). RevenueCat unifies Google Play Billing later (v1.2) via the same SDK.
- **Entitlement check at cold start**, with **offline trust of the locally cached entitlement** — a failed network call must never lock a paying user out of premium features. Cache the entitlement in the encrypted repository.
- **`usePremium()` gate** (context/hook) so feature code reads a single boolean, not RevenueCat internals — keeps the paid/free line in one place and makes it mockable in tests.
- **Paywall screen** (new `screen` union member) + **restore-purchases**. Wire the funnel analytics events from Step 0.
- **Verification:** unit-test the gate logic (entitled / not / offline-cached) with a mocked SDK. The real purchase → unlock → cancel/restore loop is **native + account-dependent** → Maestro flow against a sandbox account + manual TestFlight pass. This is the exit criterion for the whole premium track. **✅ DONE — validated on TestFlight 2026-06-30: `react-native-purchases` v10.4.0 (native-safety pass clean), `usePremium()` gate with encrypted offline cache, Paywall (Apple 3.1.2-compliant), restore + funnel analytics; `EXPO_PUBLIC_RC_IOS_KEY` wired. The live IAP purchase → unlock → restore loop works as expected on a real device. Unit tests + paywall Playwright green.**

</details>

## Steps 2–7 — Premium features (each gated behind `usePremium()`)

<details>
<summary>Sequenced by dependency and value. PDF export is the anchor; the rest slot in around it.</summary>

2. **PDF tax-ready summary export** (`expo-print`) **+ Schedule C category alignment — ship together.** Remap the 4 expense buckets to real Schedule C lines (Line 9 car/truck, Line 13 depreciation, Line 17 insurance, Line 22 supplies, Line 25 phone/utilities) so the PDF/CSV are usable at filing time. The PDF is the premium anchor, especially in filing season. Parallels the existing CSV export. **✅ DONE — validated on TestFlight 2026-06-30: `scheduleC.ts` + `taxSummaryHtml.ts` (pure, unit-tested) + `taxSummaryPdf.ts` (expo-print, native) + web variant, gated in Settings; paywall Playwright flow + Maestro smoke authored. Native print/share + the gated unlock confirmed working on a real device.**
3. **IRS-compliant mileage log fields.** Additive `Entry` fields: business purpose, start/end location. Schema + entry-form UI only now; also the data-model prerequisite for v1.3 GPS mileage — better to add the schema now than redesign later. **✅ DONE 2026-06-30 — additive `Entry.mileageLog` (`MileageLog` = optional `purpose` / `startLocation` / `endLocation`, backup round-trips for free); premium-gated "IRS mileage log" section in `AddEntryScreen` (free users get a locked Premium row → upsell Alert → paywall, which now remembers its origin so it returns to the entry form); the fields flow into the free CSV export (3 columns; RFC-4180 escaping is now load-bearing for the first free-text fields) so the log is usable at tax time. tsc + full unit suite green (12 files / 105 tests, incl. 2 new CSV column/comma-escaping cases); a Playwright gate test (`mileage-log.spec.ts`) confirms the locked free-user render; the native locked-row → Alert → paywall hop is a new Maestro flow (`mileage-log-gating.yaml`). Premium authoring + CSV round-trip covered by unit tests; native-only paths deferred to Maestro/TestFlight per the established split. **↳ Follow-on DONE 2026-06-30 — the log now also renders in the premium PDF:** a pure `buildMileageLog(entries)` builder in `scheduleC.ts` (one `MileageLogRow` per trip with miles, oldest-first, zero-mile entries excluded so the total reconciles to Line 9) feeds a new "Mileage Log — Schedule C Line 9 Substantiation" appendix in `taxSummaryHtml.ts` (Date · Purpose · Route · Miles, a blank purpose falling back to the muted platform label and a blank route to a dash, the whole section omitted when there are no business miles; purpose/route are user free text, so HTML-escaped). tsc + full unit suite green (**140 tests**; 5 new — 3 `buildMileageLog` cases + 2 HTML appendix/omission cases); rendered HTML eyeballed in-browser (screenshot). So the audit-ready log lives in the tax-ready *document*, not just the CSV.**
4. **Custom / user-defined expense categories.** ✅ DONE 2026-06-30 — additive `Entry.customExpenses?: CustomExpense[]` (`{label, amount}`, premium-authored, backup round-trips for free). Modeled as **per-entry named lines** (not app-level definitions) to mirror the additive `mileageLog` pattern — no Settings UI, fully flexible, lowest-risk persisted shape. Premium-gated "Custom expense categories" section in `AddEntryScreen` (free users get a locked Premium row → upsell Alert → paywall; premium users get an add/remove list of label+amount rows). Custom amounts fold into the shared `totalEntryExpenses` (now exported from `calculations.ts` and reused by the dashboard + platform comparison, deduping the old copy) so they reduce net SE profit in the estimate. **Schedule C mapping:** all custom categories roll into **Line 27 "Other expenses"**, aggregated by label and surfaced as an indented per-category breakdown in the PDF (`scheduleC.ts` → `otherExpenses`; `taxSummaryHtml.ts` sub-rows, labels HTML-escaped). They also serialize into a single "Other Expenses" CSV column (`label: amount; …`). tsc + full unit suite green (113 tests; new scheduleC/calculations/csvExport/PDF cases); Playwright gate test (`custom-expenses.spec.ts`) + Maestro flow (`custom-expenses-gating.yaml`). Native authoring path deferred to Maestro/TestFlight per the established split.
5. **W-4 withholding optimizer.** ✅ DONE 2026-06-30 — pure `computeW4Optimization` engine surface in `calculations.ts`: isolates the gig tax (`totalEstimatedTax − w2WithholdingEstimate.annualTotalEstimate`, capturing both the SE tax and the bracket-pushing from stacking gig income on W2 wages) and divides by the year's pay periods → the steady-state W-4 Line 4(c) amount, plus a date-aware `catchUpPerPaycheck` (this year's still-uncovered tax over the paychecks left) and an `alreadyCovered` / `!applicable` (no W2 job) state. Read-only premium `W4OptimizerScreen` (gradient result card + catch-up note + "how it works"), reached from a dashboard **"Skip quarterly payments · Premium"** insight card shown only when `hasW2Job && netAmountToSetAside > 0`; free users tap straight to the paywall (direct nav, **no Alert** — so the whole hop is web-testable, unlike the entry-form locked rows). tsc + full unit suite green (119 tests; 6 new W-4 cases: gig-tax isolation, pay-frequency periods + biweekly default, already-covered, date-independent steady-state vs. rising catch-up, divide-by-zero floor). Playwright gate test (`w4-optimizer.spec.ts`, free-user → locked card → paywall, **passing locally**) + Maestro flow (`w4-optimizer-gating.yaml`; also registered the previously-orphaned `custom-expenses-gating.yaml` in `.maestro/config.yaml`). Onboarding's W2 `Switch` got an `accessibilityLabel` so the test harness can toggle it.
6. **Safe-harbor / Form 2210 underpayment calculator.** ✅ DONE 2026-06-30 — pure `computeSafeHarbor` engine surface in `calculations.ts`: the required annual payment = the smaller of 90% of this year's tax or 100%/110% of last year's (falling back to the conservative 90%-current leg when last year's figure is unknown), the $1,000 de-minimis floor, and the 110% high-income multiplier (with the halved $75k threshold for MFS). **Federal-only** — Form 2210 is a federal rule, so it strips the engine's state-tax slice off the combined total and uses a new federal-only `w2FederalWithholdingYtdEstimate` (added to `TaxEstimateForYear`) rather than the combined withholding the rest of the app credits. The prior-year leg needs last year's filed total tax — the app can't know a return it didn't compute — so the new additive `TaxProfile.filedTaxByYear` (`{ totalTax, agi? }` keyed by the year it describes, persisted via a `handleUpdateFiledTax` handler mirroring `handleUpdateAmountSetAside`) holds it; a premium `SafeHarborScreen` carries the input with a suggestion derived from the app's own prior-year logged data when present (clearly labeled as an estimate to confirm against the actual return). Reached from a dashboard **"Avoid the IRS penalty · Premium"** card shown whenever `netAmountToSetAside > 0` (no W2 required, unlike the W-4 card); free users tap **straight to the paywall** (no Alert, so the whole hop is web-testable). tsc + full unit suite green (**127 tests**; 8 new safe-harbor cases: prior-year vs current-year binding, 110%/MFS thresholds, de-minimis, withholding-covers, federal-vs-combined split). Playwright gate test (`safe-harbor.spec.ts`) **passing locally** (2 tests); Maestro flow (`safe-harbor-gating.yaml`) authored + registered in `.maestro/config.yaml`. Docs flipped (RELEASE_NOTES, this plan). §2 checkpoint: no input moved — squarely on the premium filing-season axis.
7. **Year-over-year insights.** ✅ DONE 2026-06-30 — pure `computeYearOverYear` engine surface in `calculations.ts`: `summarizeYear` folds a year's entries (via the shared `aggregateEntries` → `estimateFromAggregate` pipeline, so a year's numbers match what its dashboard showed) into a `YearSummary` (gross earnings, net profit, expenses, business miles, hours, entry count, estimated tax, effective hourly rate); `computeYearOverYear` maps it over every year with entries (descending) and sets `hasEnoughData` at 2+ years; a small pure `metricDelta` (change + percent, `undefined` percent when the prior is 0). Built entirely on the **multi-year entry history the app already retains — no new storage** (the `filedTaxByYear` figures the safe-harbor input collects are a secondary source, not required). Read-only premium `YearOverYearScreen`: a gradient earnings hero + a `{latest} vs {previous}` metric card (colored deltas — earnings/profit/hourly-rate read good/bad by direction; expenses/miles/tax stay **neutral** so a bigger number isn't moralized) + an all-years table, with a friendly **"come back next year"** state below 2 years and an "in progress" note on the current year. Reached from a dashboard **"Year-over-year insights · Premium"** card **soft-gated on `yearsWithEntries(entries).length >= 2`** (so a fresh subscriber never lands on a near-empty screen); free users tap **straight to the paywall** (no Alert, fully web-testable). tsc + full unit suite green (**135 tests**; 8 new: `metricDelta` incl. divide-by-zero, `summarizeYear` year-scoping + hours→hourly-rate, `computeYearOverYear` soft-gate + most-recent-first ordering + empty history). Playwright gate test (`year-over-year.spec.ts`, 2 tests — seeds two tax years via the web date input) **passing locally** + full 15-test e2e suite green; Maestro flow (`year-over-year-gating.yaml`) authored + registered — it drives the **native date picker back a year** to seed the second year (the native-only path Playwright can't touch) then covers the card → paywall hop. Docs flipped (RELEASE_NOTES, this plan). §2 checkpoint: no input moved — squarely on the premium power-user axis; this was the **last Phase B feature** (only multi-state's design-pass decision remains).

</details>

## Multi-state support — design pass required before any build

<details>
<summary>Stays in scope but blocked on a written design pass. The engine has no income-apportionment concept today.</summary>

Open questions to resolve before estimating the build:
- Gig income is generally sourced to the **state where work is physically performed**, not residence — does `Entry` need a per-entry "state worked in" field vs. a resident/non-resident split?
- Which state pairs to model first?
- How to handle credits for tax paid to a non-resident state, and reciprocity agreements?
- `TaxProfile` has a single `state` field and the engine has no apportionment concept — this is a real engine extension, not a quick add.

After the design pass, re-decide scope (build in v1.1 vs. defer to a later version).

</details>

## Tier-gating principle (what stays free, forever)

<details>
<summary>Trust/literacy features are never paywalled; the paid line is filing-season tooling + power features.</summary>

- **Free, never paywalled:** the whole tax estimate, "set aside" number, show-your-math audit trail, tax literacy, what-if simulator, platform comparison, CSV export, reminders. These earn the trust that converts free users.
- **Premium:** PDF tax-ready export, Schedule C alignment, custom categories, IRS mileage-log fields, W-4 optimizer, safe-harbor calculator, year-over-year insights, multi-state. Filing-season tooling and power-user depth — not the core daily-use loop.

</details>

## Testing & verification strategy

<details>
<summary>Same convention as Phase A: unit + Playwright + Maestro, with IAP being the hardest to verify.</summary>

- **Every feature:** unit tests for engine/logic, a Playwright web flow for the UI it can render, a Maestro native flow where it touches native.
- **Engine work (W-4, safe-harbor, Schedule C mapping):** hand-verified scenario unit tests in the tax-engine package, the same pattern as the existing federal/state/SE suites — these must be tax-correct, not just type-correct.
- **IAP/paywall:** the gate logic is unit-tested with a mocked SDK; the real purchase/restore loop is sandbox + Maestro + manual TestFlight (can't be done in a browser). This is the riskiest verification surface in Phase B.
- **PDF export + native share:** the document generation is testable; the share/print path is native-only (TestFlight), same gap as the Phase A share card.

</details>

## Dependency graph

<details>
<summary>Observability → IAP → every paid feature. Multi-state forks off into its own design pass.</summary>

```
Sentry + analytics (Step 0) ──► RevenueCat / IAP (Step 1) ──► usePremium() gate ──┐
                                                                                  ├─► PDF export + Schedule C  (ship together)
                                                                                  ├─► IRS mileage-log fields   (also v1.3 GPS prereq)
                                                                                  ├─► custom expense categories (interacts w/ Schedule C)
                                                                                  ├─► W-4 optimizer            (needs live W2 engine ✓)
                                                                                  ├─► safe-harbor calculator   (greenfield engine module)
                                                                                  └─► year-over-year insights  (soft-gated, 2+ yrs data)

multi-state ── DESIGN PASS REQUIRED ──► (re-decide scope after)
```

</details>

## Recommended execution order

<details>
<summary>Observability → IAP spine → PDF/Schedule C anchor → the rest by value, with multi-state's design pass in parallel.</summary>

1. **Step 0 — observability** (as soon as the user provides DSN + analytics vendor; small, unblocks confident decisions).
2. **Step 1 — IAP/RevenueCat spine** (as soon as the App Store Connect product + RevenueCat dashboard exist; gates everything paid).
3. **PDF export + Schedule C alignment** (the premium anchor) → **mileage-log fields** → **custom categories** → **W-4 optimizer** → **safe-harbor** → **year-over-year**.
4. **Multi-state design pass** runs in parallel with the above; build (or defer) decided after.

Claude can start **Step 0's code** the moment the Sentry DSN + analytics vendor exist, and **Step 1's code** the moment the RevenueCat/App Store Connect setup exists. Until then Phase B is ⛔ blocked on external setup — there's no value in writing paywall code against a product that doesn't exist yet.

</details>

## Who owns what

<details>
<summary>User owns accounts/products/dashboards/review; Claude owns code, tests, and web-based verification.</summary>

- **User owns:** Sentry project/DSN, analytics vendor account, App Store Connect IAP product setup, RevenueCat dashboard config, sandbox test accounts, running Maestro flows on a real simulator/device (via Codemagic), and App Store review of v1.0 before any of Phase B merges to master.
- **Claude owns:** all code, unit tests, Playwright flows, Maestro flow authoring, native-build-safety passes before adding native deps, and web-based verification — plus flagging clearly where only a real device/TestFlight can verify (IAP, PDF/print, native share).

</details>

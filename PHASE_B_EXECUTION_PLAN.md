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
- **Verification:** unit-test the gate logic (entitled / not / offline-cached) with a mocked SDK. The real purchase → unlock → cancel/restore loop is **native + account-dependent** → Maestro flow against a sandbox account + manual TestFlight pass. This is the exit criterion for the whole premium track. **🔄 Built on `v1.1` (2026-06-30): `react-native-purchases` v10.4.0 (native-safety pass clean), `usePremium()` gate with encrypted offline cache, Paywall (Apple 3.1.2-compliant), restore + funnel analytics; `EXPO_PUBLIC_RC_IOS_KEY` wired. Unit tests + paywall Playwright green; purchase/restore loop pending the batched TestFlight pass.**

</details>

## Steps 2–7 — Premium features (each gated behind `usePremium()`)

<details>
<summary>Sequenced by dependency and value. PDF export is the anchor; the rest slot in around it.</summary>

2. **PDF tax-ready summary export** (`expo-print`) **+ Schedule C category alignment — ship together.** Remap the 4 expense buckets to real Schedule C lines (Line 9 car/truck, Line 13 depreciation, Line 17 insurance, Line 22 supplies, Line 25 phone/utilities) so the PDF/CSV are usable at filing time. The PDF is the premium anchor, especially in filing season. Parallels the existing CSV export. **🔄 Built on `v1.1` (2026-06-30): `scheduleC.ts` + `taxSummaryHtml.ts` (pure, unit-tested) + `taxSummaryPdf.ts` (expo-print, native) + web variant, gated in Settings; paywall Playwright flow + Maestro smoke authored (Playwright green locally). Native print/share + gated-unlock pending the batched TestFlight pass.**
3. **IRS-compliant mileage log fields.** Additive `Entry` fields: business purpose, start/end location. Schema + entry-form UI only now; also the data-model prerequisite for v1.3 GPS mileage — better to add the schema now than redesign later.
4. **Custom / user-defined expense categories.** Extend the expense model beyond the 4 fixed buckets. Interacts with #2 (Schedule C mapping must handle custom categories → "other expenses").
5. **W-4 withholding optimizer.** Builds on the live W2 engine: given the user's paycheck details, suggest the specific additional per-paycheck withholding to enter on a new W-4 so the employer covers the 1099 liability — potentially eliminating quarterly payments. Genuinely non-obvious, high value. New engine surface + a result screen.
6. **Safe-harbor / Form 2210 underpayment calculator.** Greenfield engine module: the 90%-current / 110%-prior-year rule. Needs a prior-year-tax input, or auto-pull from the app's own stored prior-year estimate once 2+ years of data exist. Year-round relevance, real differentiator.
7. **Year-over-year insights.** Soft-gated until the user has 2+ tax years of data — show a "come back next year" state rather than a near-empty screen on first subscribe.

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

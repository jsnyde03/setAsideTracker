# Release Notes

**Living document** — updated as each feature/enhancement/bug fix lands, as part of the same
documentation pass (not reconstructed at submission time). Newest release on top. Each release has a
clean **What's New** block (the draft for the App Store "What's New" field) plus a detailed
**Completed in this release** list.

**Status legend:** ✅ Live · 🔄 In progress / in review · ⬜ Not started

> When an item ships: flip its plan-doc status, add a user-facing line here, and (for store-facing
> changes) run the Apple guideline compliance pass. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

---

## v1.1 — Premium Tier Launch + Free Tier Growth  🔄 In progress

> Branch `v1.1`; not merged to `master` until v1.0 is live. Phase A (free additions) is complete;
> Phase B (premium) is in progress. Full plan: [V1.1_EXECUTION_PLAN.md](V1.1_EXECUTION_PLAN.md) /
> [PHASE_B_EXECUTION_PLAN.md](PHASE_B_EXECUTION_PLAN.md). Pricing: [PREMIUM_PRICING_STRATEGY.md](PREMIUM_PRICING_STRATEGY.md).

### What's New (draft for the App Store "What's New")

```
What's new in 1.1:

• See the math behind every number — tap any line in your tax breakdown to see exactly how it
  was calculated, in plain English.
• New "What if I earned more?" simulator — see how an extra shift changes your tax set-aside.
• Compare your platforms — see which app actually pays best per hour after expenses.
• Share your earnings — a clean, shareable summary of your numbers.
• Plain-language explanations of tax terms throughout.

Premium:
• Tax-ready PDF export with a Schedule C breakdown.
• IRS-compliant mileage log — record each trip's purpose and start/end location for an
  audit-ready record of your business miles, printed right in your tax-ready PDF as a
  Schedule C Line 9 substantiation appendix.
• Custom expense categories — track write-offs beyond parking, tolls, supplies, and phone
  (health insurance, car washes, hot bags, and more), mapped to Schedule C "Other expenses."
• W-4 withholding optimizer — if you also have a W2 job, see the exact extra withholding to put
  on a new W-4 so your paycheck covers your gig taxes, skipping quarterly estimated payments.
• Safe-harbor calculator — see the minimum you can pay in to avoid the IRS underpayment penalty.
  If your income jumped, the prior-year safe harbor is often far less than this year's full bill.
• Year-over-year insights — once you've tracked two tax years, see how your earnings, profit,
  miles, hours, and tax compare, so you can tell whether your gig work is trending up.
```
*(Premium features are added to this list as each one ships — see "Remaining" below. The free-tier
line items above are live on the branch.)*

### Completed in this release

<details>
<summary>Free-tier additions (✅ shipped on branch — never paywalled)</summary>

- ✅ **"Show your math" audit trail** — every tax-breakdown line is tappable and shows the full
  calculation (AGI → deductions → per-bracket tax, SE split, credits).
- ✅ **In-app tax literacy** — tappable plain-language glossary pills on each breakdown.
- ✅ **"What if I earned more?" simulator** — live recompute of set-aside + effective hourly rate.
- ✅ **Platform earnings comparison** — per-platform earnings + after-expense hourly rate.
- ✅ **Earnings share card** — branded shareable summary via the native share sheet (iOS).
- ✅ **Well-timed app rating prompt** — fires after the 5th entry / first catch-up, once.

</details>

<details>
<summary>Infrastructure & observability (✅)</summary>

- ✅ **Testing harness (Workstream 0)** — Playwright web E2E + Maestro native flows + CI workflows.
- ✅ **Sentry crash reporting** — live in CI/TestFlight builds, source maps uploaded.
- ✅ **PostHog analytics** — live in CI/TestFlight builds, with the premium-funnel events defined.

</details>

<details>
<summary>Premium (🔄 Phase B — in progress)</summary>

- ✅ **IAP spine (RevenueCat)** — `react-native-purchases` integrated; `usePremium()` gate with
  offline-cached entitlement; **Paywall** screen (Apple 3.1.2-compliant: billed price is the most
  prominent element, full auto-renewal disclosure, Terms/Privacy links, restore); funnel analytics
  wired. App Store Connect products + RevenueCat dashboard configured (Annual $29.99 / Monthly
  $4.99, entitlement `premium`, offering `default`). **Validated on TestFlight 2026-06-30: the real
  purchase → unlock → restore loop works as expected on a real device.**
- ✅ **PDF tax-ready export + Schedule C category alignment** — premium-gated "Tax Summary (PDF)" in
  Settings generates a tax-ready PDF (via `expo-print`): a Schedule C breakdown (Line 9 car/truck
  incl. mileage + parking/tolls, Line 22 supplies, Line 25 utilities) plus the estimated tax and
  amount-to-set-aside, reconciled to the engine. Non-subscribers are routed to the paywall. **Unit
  tests (Schedule C + HTML builder) + the paywall Playwright flow pass; native print/share and the
  gated unlock confirmed on TestFlight 2026-06-30.**
- ✅ **IRS-compliant mileage-log fields** — premium-authored business purpose + start/end location
  per entry, the contemporaneous substantiation the IRS expects for the standard mileage deduction.
  Additive `Entry.mileageLog` schema (also the data-model groundwork for v1.3 GPS-assisted
  mileage); a premium-gated "IRS mileage log" section in the entry form (free users see a locked
  Premium row that routes to the paywall); the fields flow into the existing CSV export so the log
  is actually usable at tax time. Unit tests (CSV columns + escaping) + a Playwright gate test pass;
  the native locked-row → Alert → paywall hop is covered by a new Maestro flow.
  - ↳ **Follow-on: mileage log in the premium PDF.** The tax-ready PDF now closes with a "Mileage
    Log — Schedule C Line 9 Substantiation" appendix: one row per trip (date · purpose · route ·
    miles) sorted oldest-first, with a total that reconciles to the Line 9 mileage figure. Missing
    detail degrades gracefully (platform label stands in for a blank purpose, a dash for an unrecorded
    route); the section is omitted when no entry has business miles. So the audit-ready log lives in
    the tax-ready *document*, not just the CSV. Pure `buildMileageLog` builder + HTML render, covered
    by new Schedule C + HTML-builder unit tests (free-text HTML-escaping included).
- ✅ **Custom expense categories** — premium-authored named expense lines per entry (e.g. health
  insurance, car washes, hot bags) beyond the four fixed buckets. Additive `Entry.customExpenses`
  schema; a premium-gated "Custom expense categories" section in the entry form (free users see a
  locked Premium row that routes to the paywall) with an add/remove list of label+amount rows. They
  reduce net SE profit in the estimate, roll into **Schedule C Line 27 "Other expenses"** with a
  per-category breakdown in the PDF, and serialize into a new CSV column. Unit tests (Schedule C
  aggregation + calculations + CSV + PDF) + a Playwright gate test pass; the native locked-row →
  Alert → paywall hop is covered by a new Maestro flow.
- ✅ **W-4 withholding optimizer** — for users with both a W2 job and gig income, turns the
  estimated 1099 tax into one number: the extra per-paycheck withholding to enter on a new W-4's
  Line 4(c) so the employer covers it, potentially replacing quarterly estimated payments. Pure
  `computeW4Optimization` engine surface (isolates gig tax = total − W2-only withholding, spread
  over the year's paychecks; plus a date-aware catch-up figure for the paychecks left this year);
  a read-only premium result screen reached from a dashboard "Skip quarterly payments" card shown
  only to W2 users (free users tap straight through to the paywall — no Alert, so the full hop is
  web-testable). Hand-verified unit tests (gig-tax isolation, pay-frequency periods, already-covered,
  catch-up math, divide-by-zero floor) + a Playwright gate test pass; a new Maestro flow covers the
  native card → paywall hop.
- ✅ **Safe-harbor / Form 2210 underpayment calculator** — shows the minimum a user can pay in
  (withholding + estimated payments) to avoid the federal underpayment penalty: the smaller of 90%
  of this year's tax or 100%/110% of last year's. When income jumps, the prior-year leg is often far
  below this year's bill — the headline value. Pure `computeSafeHarbor` engine surface (federal-only,
  since Form 2210 is a federal rule — strips the engine's state-tax slice and uses a new
  federal-only W2-withholding figure; the $1,000 de-minimis floor; the 110% high-income multiplier
  with the $75k MFS threshold). A premium result screen reached from a dashboard "Avoid the IRS
  penalty" card (free users tap straight through to the paywall — no Alert, fully web-testable); it
  carries the one input only the user can supply — last year's filed total tax — with a suggestion
  derived from logged prior-year data when present. Hand-verified unit tests (prior-year vs.
  current-year binding, 110%/MFS thresholds, de-minimis, withholding-covers, federal-vs-combined
  split) + a Playwright gate test pass; a new Maestro flow covers the native card → paywall hop.
- ✅ **Year-over-year insights** — once a user has logged 2+ tax years, a premium screen compares
  the latest year against the previous one across gross earnings, net profit, expenses, business
  miles, hours, estimated tax, and take-home-per-hour — each with a colored delta (earnings-style
  metrics read good/bad by direction; expenses/miles/tax stay neutral so a bigger number isn't
  moralized), plus an all-years table. **Soft-gated on data**: with only one year it shows a friendly
  "come back next year" state rather than a near-empty screen, and the dashboard card that opens it
  only appears once entries span 2+ years. Built on the multi-year entry history the app already
  retains (`computeYearOverYear` — no new storage). A read-only premium screen reached from a
  dashboard "Year-over-year insights" card (free users tap straight through to the paywall — no
  Alert, fully web-testable). Unit tests (`summarizeYear` scoping/hourly-rate, `computeYearOverYear`
  soft-gate + ordering, `metricDelta` incl. divide-by-zero) + a Playwright gate test pass; a new
  Maestro flow drives the native date picker back a year to seed the second year (native-only) and
  covers the card → paywall hop.
- ⬜ Multi-state support (design pass first)

</details>

---

## v1.0 — Public Launch (Free Tier)  🔄 In App Store review (as of 2026-06-30)

> Submitted; awaiting approval. Details: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

### What's New (initial release)

```
SetAside Tracker helps gig workers know exactly how much to set aside for taxes.

• Log earnings, expenses, and mileage in seconds.
• Get your real-time federal + state tax estimate and "set aside" number.
• Handles W2 + 1099 combos, all 50 states + DC, and every filing status.
• See your true after-expense hourly rate and per-platform breakdown.
• Quarterly due-date reminders so you're never caught off guard.
• Private by design — your data stays on your device.
```

### Completed in this release

<details>
<summary>v1.0 scope (✅ engineering-complete, in review)</summary>

- ✅ Free-tier core: earnings/expense/mileage logging, real-time tax estimate + set-aside number.
- ✅ Full **50 states + DC** tax coverage (+ state credits, PA/NY local tax).
- ✅ **W2 + 1099** combined modeling (rebuilt + re-enabled) and every filing status incl.
  Head of Household / Married Filing Separately.
- ✅ True hourly-rate calculator, quarterly due-date reminders, year switcher.
- ✅ Encrypted local storage, optional biometric app lock, CSV export, backup/restore.

</details>

---

## Earlier (v0.1–v0.3)  ✅ Internal only

Pre-public milestones that de-risked the tax engine and core loop; never released to users. See
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the history.

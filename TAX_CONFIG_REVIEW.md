# Annual Tax Config Review

Process referenced by [ROADMAP.md §6](ROADMAP.md): "Tax rate configs must be reviewed/updated annually (have a process, not just code — IRS brackets/mileage rates change every year)." This document is that process. It's a runbook for a human (or a future Claude session) to follow, because verifying a tax figure against a government source requires judgment, not a script.

> ⚠️ **Updated 2026-09-21: there IS now a CI hook, and it does not do what this runbook does.**
> `npm run audit` (in `services/tax-engine`) runs two gates that **fail the build**:
> - **`audit:staleness`** — fails when a live tax year's `reviewedOn` date is more than **6
>   months** old, or when the current calendar year has no config at all (the engine would
>   otherwise silently fall back to another year's brackets).
> - **`audit:dependents`** — fails on any per-dependent *credit* ≥ $1,000, which is almost
>   certainly an exemption filed in the wrong slot.
>
> ⛔ **The gate cannot tell you a figure is WRONG — only that nobody has looked recently.**
> The original reasoning above still holds: judgment is the part a script cannot do. Running
> this runbook is what makes the gate's green meaningful. **Bump `reviewedOn` only after
> actually working through the steps below** — a date newer than the last real review turns a
> loud, correct failure into silent, false confidence, which is strictly worse than stale.

## When to run this

There's no single date because federal and state sources publish on different schedules:

- **Federal** (IRS Rev. Proc. for brackets/standard deduction, mileage rate, SSA wage-base fact sheet): typically published **October–November** for the *following* tax year.
- **States**: wildly inconsistent. Some (e.g. CA's EDD withholding schedules, NY's NYS-50-T-NYS) publish **December–January** for the *upcoming* year. Others index mid-year. There's no way to know a state is ready except checking.

**Practical trigger:** ⚠️ **twice a year, not once.** Run it in **December or January** for the
upcoming tax year, and again around **June** for the year in progress.

> ⚡ **Why twice: states change figures MID-YEAR.** Georgia raised its dependent exemption
> $4,000 → $5,000 effective TY2026, and this repo did not notice — it was found by a web
> search on 2026-09-21 during an audit of something else. A December/January-only cadence
> would have missed it by the better part of a year, while the app quietly overstated what
> Georgia families owed. The 6-month CI gate exists to force the second pass.

Cover whichever upcoming tax year hasn't been added to `services/tax-engine/src/taxYears/` yet. If a source isn't published yet when you check, note that in the review log below and re-check that specific state/federal figure a month or two later rather than blocking the whole pass on it.

## Step 1 — Federal figures

Source: IRS Rev. Proc. for the relevant tax year (search "IRS Rev Proc \<year\> tax brackets standard deduction"), SSA's annual COLA fact sheet (SS wage base), and the IRS mileage rate notice.

Check against `services/tax-engine/src/taxYears/<year>.ts`:
- `federalBrackets` (both filing statuses)
- `standardDeduction`
- `socialSecurityWageBase`
- `additionalMedicareThreshold` (this one rarely changes — it's not inflation-indexed — but confirm)
- `standardMileageRate`
- `childTaxCredit` (amount per child, refundable cap, phase-out threshold — confirm these aren't still carried forward from a prior year as a placeholder; check the comments in the existing config for "verify before relying on" flags from prior sessions)

## Step 2 — State figures

Don't re-derive every state from scratch each year — that's how the original 50-state rollout took multiple sessions. Instead:

1. **Pull the Tax Foundation's "\<year\> State Individual Income Tax Rates and Brackets" report first.** It's the single best multi-state source this project has used repeatedly and reliably. It covers nearly every state's headline rate/brackets/standard deduction in one document. cross-check anything that looks like an outlier vs. the prior year (a state's bracket thresholds should only move a few percent year-over-year from inflation indexing — a bigger jump means either a real legislative change or a sourcing error, check it directly).
2. **No-tax states** (TX, FL, AK, NV, SD, TN, WA, WY, NH): skim the Tax Foundation report's intro for "any state added/removed income tax" — this is rare but not impossible (NH's interest/dividends tax repeal in 2025 is the precedent). Otherwise no action needed.
3. **Flat-rate states on a known phase-down schedule** — check these specifically every year, since they're the ones most likely to have silently changed:
   - **KY, IN**: both have statutory multi-year phase-down schedules; confirm the current year's step.
   - **NC**: scheduled cut to 3.49% for 2027 — confirm it actually proceeded (it survived one political threat to freeze it as of mid-2026; re-confirm each year until it's done).
   - **MT**: scheduled step to 5.4% for 2027.
   - **CO**: TABOR-triggered rate can dip in years with a revenue surplus — confirm the headline rate is still 4.40%, not a temporary TABOR dip.
4. **States with a documented confidence caveat in the existing config comments** — read the doc comment at the top of `stateTaxConfigs/<year>.ts` and `taxYears/<year>.ts` before starting; every state with a "verify before relying on" or "CORRECTED" note from a past session is worth a fresh look, since these are the ones most likely to drift or get corrected again.
5. **NY**: confirm the next scheduled -0.1 percentage point step (down to the 3.8%–5.8% range for the bottom five sub-brackets) actually took effect for the year you're adding, per Chapter 59 of the Laws of 2025.
6. **ME**: the standard deduction, personal exemption, and `standardDeductionPhaseout` thresholds are all COLA-indexed (Maine's own 1.279-style factor) and change most years — re-pull Maine Revenue Services' current-year worksheet rather than assuming last year's figures still apply.
7. **MD county local tax**: check the Department of Legislative Services' "Local Tax Rates" PDF (dls.maryland.gov) for any county rate change — counties must notify the Comptroller by July 1 of the prior year for a change to take effect, so by the time you're doing this review the next year's county rates should already be final and published.
8. **Any other state flagged in the current config's comments as "FTB-based projection," "provisional," or similar** — re-check directly; these flags exist specifically to be revisited.

## Step 3 — Verifying a stubborn government PDF

Several official .gov tax PDFs (FTB, EDD, NYS Tax Dept, Maryland DLS) fail when fetched directly — `WebFetch` will report "binary/unreadable PDF." When this happens, **the binary content is still saved to a local scratch file path mentioned in the tool result.** Re-read that exact path with the `Read` tool (not `WebFetch` again) — it parses correctly as a document and extracts real tabular data. This worked for Maine's, California's, New York's, and Maryland's official PDFs in past reviews; it's the reliable fallback, not a last resort.

**Caveat learned from past reviews:** government *withholding* tables (as opposed to the actual statutory filing-year rate schedule) sometimes use blended/inflated rates that don't match the real statutory marginal rates — e.g. NY's withholding tables show 10.23% where the real statutory rate is 9.3%, because of a separate high-income "recapture" mechanism baked into withholding only. **Bracket thresholds (dollar amounts) in withholding tables are reliable; the rates themselves may not be — cross-check rates against a second source (Tax Foundation, a state's actual Tax Law text, or a legal-summary article) before trusting a withholding table's percentage column.**

## Step 4 — Implement, test, verify, commit

Same pattern every prior session has used:
1. Add the new `taxYears/<year>.ts` (or update the existing one if it was a placeholder) and the corresponding `stateTaxConfigs/<year>.ts`.
2. Update `currentTaxYear` in `services/tax-engine/src/index.ts` to point at the new year once it's complete, keeping the prior year's config available for historical entries.
3. Run both test suites (`npm test` in `services/tax-engine/` and `apps/mobile/`) and both typechecks/builds.
4. Add or update unit tests for anything that changed (hand-worked bracket math, same rigor as existing tests).
5. Verify end-to-end in a real Playwright browser session (see [the project's established browser-verification approach](apps/mobile/AGENTS.md) if unfamiliar) for at least 2-3 representative states (a flat-rate state, a bracket state, and MD if its local tax changed) with hand-checked arithmetic — don't rely on typechecks/unit tests alone to catch a real-world calculation bug, per this project's track record of finding actual bugs specifically during browser verification.
6. Update `IMPLEMENTATION_PLAN.md` with what changed and why, same level of detail as past entries.
7. Append a row to the review log below.
8. Commit each logical change separately (code/tests, then the IMPLEMENTATION_PLAN.md update), per this project's existing commit pattern.

## Review log

| Year reviewed | Date | What changed | Commit(s) |
|---|---|---|---|
| 2026 (initial 50-state rollout + confidence-gap audit) | 2026-06-24 to 2026-06-25 | Full 50-state+DC coverage, state credits, PA/NY local tax, 2025 backfill, ME/LA bug fixes, CA bracket bugs found and fixed, NY/MD confirmed clean | See IMPLEMENTATION_PLAN.md's "📍 State tax confidence gaps" section for the full list |

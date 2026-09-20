# Lens A — the user's job

Read-only walk of the gig worker's end-to-end workflow against the `v1.2` branch
(HEAD at audit time). Scope: onboard → log → know what to set aside → actually pay →
file → live with it over time. Everything on the exclusion ledger is deliberately absent.

Evidence is `file:line` from files actually read. Where a claim rests on a code comment
rather than on logic I executed or traced, it is marked as such.

---

## The app never tells you how, or where, to actually pay

**Workflow step:** 4 — Actually pay
**Severity:** major
**What's missing:** The app computes a set-aside number, splits it into federal / SE /
state lines, warns about due dates, and then stops. There is no payment affordance of any
kind — no link to IRS Direct Pay or EFTPS, no state Department-of-Revenue link, no Form
1040-ES voucher, no "here is what to do on April 15." A full-repo search for
`irs.gov|directpay|eftps|voucher|make a payment` across `apps/mobile/src`,
`apps/mobile/app` and `services` returns only four hits, all of them prose in a label or
docstring — none is a link, action or instruction.
**Evidence:** search hits are `apps/mobile/src/calculations.ts:451` (docstring),
`apps/mobile/src/screens/SafeHarborScreen.tsx:222` (label text "across the four 1040-ES
due dates"), `apps/mobile/src/taxSummaryHtml.ts:92` (same sentence in the export),
`services/tax-engine/src/taxYears/2026.ts:15` (a citation comment). No `Linking.openURL`
to any tax authority exists. Reminder scheduling
(`apps/mobile/src/notifications/quarterlyDueDates.ts:12-18`) produces a label and a date
and nothing else.
**Why it matters to a gig worker:** The single hardest step of the job — a first-timer
has never made an estimated payment and does not know EFTPS enrolment takes days, or that
the state is a separate payment to a separate site. The app takes them to the edge of the
one action that actually prevents a penalty, and leaves them to Google it.

## The set-aside is one combined number, but it is paid to two different governments

**Workflow step:** 4 — Actually pay
**Severity:** major
**What's missing:** `netAmountToSetAside` — the headline figure and the input to the
catch-up math, the safe-harbor screen and the effective-hourly-rate insight — is federal
SE tax + federal income tax + state tax + local tax, minus combined federal *and* state
W2 withholding, as a single scalar. The dashboard shows per-line detail below it, but
nothing anywhere produces the two numbers the user must actually write on two different
payments: "send $X to the IRS" and "send $Y to <state>". The withholding credit makes
this worse than simple addition — the federal and state withholding are netted against
the combined total, so a user cannot recover the federal-only figure by reading the lines
and subtracting.
**Evidence:** `services/tax-engine/src/estimate.ts:71-77` sums SE + federal-after-credit
+ `stateTax.stateTax` into one `totalEstimatedTax`;
`apps/mobile/src/calculations.ts:36-40` (the field doc) and `:316` (`netAmountToSetAside = Math.max(0, totalEstimatedTax − w2WithholdingYtdEstimate)`) define it as that total minus
combined `w2WithholdingYtdEstimate`. The dashboard renders that one figure as the hero
(`apps/mobile/src/screens/DashboardScreen.tsx:282`) with per-line rows at
`:294-325`. A federal-only slice exists in the model
(`w2FederalWithholdingYtdEstimate`, `calculations.ts:31-35`, produced at `:311-312`) but it is scoped to the
safe-harbor calculator, not to a payment split.
**Why it matters to a gig worker:** They have one number and two payees. Splitting it by
hand from the breakdown lines is exactly the spreadsheet-alongside-the-app failure, and
guessing the split is how people underpay the IRS while overpaying the state.

## Nothing reconciles the app's totals against the 1099s the platforms send

**Workflow step:** 5 — File
**Severity:** major
**What's missing:** Every figure in the app is self-logged. In January each platform
sends a 1099-NEC or 1099-K, the IRS gets a copy, and the preparer's first question is
"does your number match the 1099?" There is no field to record the 1099 amount per
platform, no mismatch flag, and no per-platform gross-receipts line in the filing
exports. A search for `1099` across `apps/mobile/src` and `services` returns only marketing
copy and a docstring — no data field, no screen, no export column.
**Evidence:** `1099` appears only at `apps/mobile/src/calculations.ts:329` (docstring),
`apps/mobile/src/screens/PaywallScreen.tsx:31` (paywall bullet), and
`apps/mobile/src/screens/W4OptimizerScreen.tsx:35` (docstring). `Entry`
(`apps/mobile/src/types.ts:108-127`) has no 1099 or reconciliation field.
`buildScheduleCSummary` (`apps/mobile/src/scheduleC.ts:59-80`) accumulates one combined
`grossReceipts` across all platforms — the per-platform split needed to check against
individual 1099s is not emitted, even though `Entry.platform` carries it.
**Why it matters to a gig worker:** A 1099-K from Uber reports gross fares including the
platform's cut, which is routinely thousands higher than what hit the bank account and
what the user logged. Under-reporting against a 1099 is the single most common way a gig
worker gets an IRS notice, and the app gives them no way to see the discrepancy before
they file.

## Schedule C Part IV vehicle information is not collected, so the mileage deduction is not substantiated

**Workflow step:** 5 — File
**Severity:** major
**What's missing:** Claiming standard mileage on Schedule C requires Part IV (lines
43–47): date the vehicle was placed in service, and the year's **total** miles split into
business / commuting / other. The app records only business miles per entry. There is no
vehicle record, no total-miles figure, and no "do you have written evidence" flag.
A search for `part iv|commuting|total miles|placed in service|depreciat` over
`apps/mobile/src` and `services` returns exactly one hit — a docstring noting depreciation
has no field.
**Evidence:** `Entry.mileage` is a bare number (`apps/mobile/src/types.ts:114`);
`MileageLog` (`types.ts:99-106`) carries purpose/start/end only. `buildScheduleCSummary`
(`apps/mobile/src/scheduleC.ts:23-38`) models lines 1, 9, 22, 25, 27, 28 and 31 — Part IV
is absent from the type entirely. The only related note is
`apps/mobile/src/scheduleC.ts:52-53`, which says depreciation and insurance have no field
(that is a comment, i.e. a stated premise; the absent Part IV fields I verified from the
`ScheduleCSummary` shape itself).
**Why it matters to a gig worker:** The preparer cannot complete Schedule C from this
export without going back to the user for total annual mileage — a number that is
unrecoverable in April if nobody wrote down the odometer on January 1. The app's own
Premium pitch is IRS-compliant mileage substantiation, and this is the part the IRS form
actually asks for.

## The app only knows one mileage method, and never asks which one the user elected

**Workflow step:** 2 / 5 — Log a shift, File
**Severity:** major
**What's missing:** `calculateMileageDeduction` is unconditionally miles × the standard
rate. There is no actual-expense method, no vehicle cost basis, and — more importantly —
no question about which method the user is already on. The IRS rule is that the standard
mileage rate must be elected in the **first** year the vehicle is used for business; a
user who took actual expenses (or was put on them by a preparer) in year one cannot switch
to standard, and the app will silently compute a deduction they are not entitled to.
**Evidence:** `services/tax-engine/src/mileageDeduction.ts:3-14` is the whole
implementation — the file is 14 lines and `calculateMileageDeduction` returns
`miles * config.standardMileageRate`, with no branch.
`services/tax-engine/src/estimate.ts:10-15` subtracts it unconditionally from net profit. `TaxProfile`
(`apps/mobile/src/types.ts:12-46`) has no mileage-method field; onboarding therefore
cannot ask. `scheduleC.ts:43-45` maps the standard-mileage amount straight onto Line 9.
**Why it matters to a gig worker:** Someone driving a leased or high-payment vehicle can
be thousands of dollars better off on actual expenses, and someone already locked into
actual expenses is being shown a set-aside that is too low all year. Either way the number
they have been trusting since January is wrong, and they only find out at the preparer's
desk.

## The tax profile has no history, so every past year is silently recomputed with today's circumstances

**Workflow step:** 6 — Live with it over time
**Severity:** major
**What's missing:** `TaxProfile` is a single current-state object — one `state`, one
`filingStatus`, one `dependents`, one W2 block. Every estimate, for every year, is
computed from that one object; the year parameter only selects which *entries* and which
IRS rate table to use. The moment a user moves state, marries, has a child, or quits the
W2 job, the app retroactively rewrites the tax on every prior year in the app, including
years already filed.
**Evidence:** `computeTaxEstimate(entries, taxProfile, year)` scopes entries by year
(`apps/mobile/src/calculations.ts:240-252`) but passes the single live `taxProfile`
through unchanged. `computeYearOverYear(entries, taxProfile)` does the same for every
historical year at once — `apps/mobile/src/screens/YearOverYearScreen.tsx:61`. The stored
shape is `apps/mobile/src/types.ts:12-46`; only `amountSetAsideByYear` (`:40`) and
`filedTaxByYear` (`:45`) are year-keyed, which shows the year-keying pattern was
available and was not applied to the profile itself.
**Why it matters to a gig worker:** Gig work is what people do *while* their life is
changing — a move from Texas to California, a new baby, dropping the day job. The Premium
year-over-year screen will tell a user who moved that they owed California tax in a year
they lived in Texas. The first time the numbers visibly contradict something the user
knows to be true, they stop trusting all of them.

## There is no automatic backup, and nothing ever prompts the user to make one

**Workflow step:** 6 — Live with it over time (switching phones)
**Severity:** major
**What's missing:** All data lives in AsyncStorage on one device, encrypted with a key in
the Keychain. The only recovery path is a manual JSON export the user has to remember to
run. Nothing tracks whether a backup has ever been taken, nothing surfaces its age, and
nothing nudges — no iCloud/CloudKit sync, no backup reminder, no "last backed up" state.
A search for `icloud|cloudkit|auto.?backup|lastBackup` across `apps/mobile/src` and
`apps/mobile/app` returns nothing.
**Evidence:** `exportBackupSnapshot` / `restoreBackupSnapshot`
(`apps/mobile/src/storage/repository.ts:220-241`) are the entire mechanism, invoked only
from Settings. `AppSettings` (`apps/mobile/src/types.ts:129-138`) has three fields and
none of them records backup state. The claim that manual export *is* the recovery story is
stated in a comment at `repository.ts:217-219` — that is a carried premise, but the
absence of any other path is verified from the module's exports.
**Why it matters to a gig worker:** A year of tax records is on one phone that gets
dropped, stolen, or traded in. Losing it in November means reconstructing twelve months of
earnings from platform apps that only show 90 days. This is the failure mode that ends
with a one-star review, and the user who needs the nudge is precisely the one who will
never open Settings looking for it.

## A married filer's spouse income is never collected, so the bracket is wrong all year

**Workflow step:** 1 / 3 — Onboard, Know what to set aside
**Severity:** blocker
**What's missing:** Onboarding offers "Married Filing Jointly" as a filing status, then
asks only about the user's *own* W2 job. `otherTaxableIncome` — the figure that pushes gig
profit up through the federal and state brackets — is derived solely from the user's own
per-paycheck fields. A married gig worker whose spouse earns $85k is given
married-filing-jointly brackets applied to the gig income *as if it were the household's
only income*, so their gig profit is taxed starting in the 10% bracket instead of stacking
on top of the spouse's income. The set-aside is systematically far too low, with no warning
anywhere.
**Evidence:** `FILING_STATUS_OPTIONS` includes `marriedFilingJointly`
(`apps/mobile/src/screens/OnboardingScreen.tsx:32-37`). The built `TaxProfile`
(`OnboardingScreen.tsx:112-127`) has no spouse field, and `TaxProfile` itself
(`apps/mobile/src/types.ts:12-46`) has none to hold it. `estimateFromAggregate` passes
`otherTaxableIncome: w2FederalTaxableIncome` (`apps/mobile/src/calculations.ts:276` (`otherTaxableIncome: w2FederalTaxableIncome`)),
which `deriveW2Incomes` (`calculations.ts:96-113`) computes from
`w2GrossPayPerPeriod` — the user's own stub — alone.
**Why it matters to a gig worker:** Filing jointly is the majority case for married
people, and a second income is the norm in the household that has someone doing gig work
part-time. This user follows the app faithfully all year and still owes thousands in April
— the single outcome the app exists to prevent, and the one that turns into "this app told
me the wrong number."

## The state field is free text, so a typo tells the user their state isn't supported

**Workflow step:** 1 — Onboard
**Severity:** major
**What's missing:** "State you primarily work in" is a plain `TextField` with placeholder
"e.g. CA" and no validation beyond non-empty. The value is uppercased and used directly as
a config key. Type "California", "Texas", or "ca " with a trailing space that survives
differently than expected, and the lookup misses — state tax silently becomes $0. The app
does warn, honestly and prominently, but the warning's wording is *"{state} isn't supported
yet"*, which for a typo is factually wrong: the app supports all 50 states and DC.
**Evidence:** the input is `TextField ... value={state} onChangeText={setState}` with no
option list (`apps/mobile/src/screens/OnboardingScreen.tsx:181-187`; same pattern in
`EditTaxProfileScreen.tsx:173-174`). Validation is only
`state.trim().length === 0` (`OnboardingScreen.tsx:81-84`, the only state validation on save). The lookup is
`config.stateTaxConfigs[stateCode.trim().toUpperCase()]`, returning `supported: false`
and zeroes on a miss (`services/tax-engine/src/stateTax.ts:98-114`). The warning text is
`apps/mobile/src/screens/DashboardScreen.tsx:349-357`. Coverage is 51 keys — all 50 states
plus DC (`services/tax-engine/src/stateTaxConfigs/2026.ts:138-...`), so every miss here is
a data-entry failure, never a real coverage gap.
**Why it matters to a gig worker:** A California driver who types "California" is told
California isn't supported and that their number is missing state tax. The rational
response is to delete the app. A picker removes the entire failure class and costs almost
nothing.

## A bad month or a losing year is floored to zero — the app can never show a refund

**Workflow step:** 6 / 3 — Live with it over time, Know what to set aside
**Severity:** minor
**What's missing:** The mileage deduction is capped so it can never push net profit below
zero, and total tax is floored at zero. A gig worker whose mileage deduction exceeds their
gig profit — routine for a part-timer on a bad stretch — has a real Schedule C loss that
offsets W2 income and produces a refund. The app shows $0 and stops. There is no "your gig
work reduced your tax bill by $X" and no negative figure anywhere in the pipeline.
**Evidence:** `netProfitAfterMileage = Math.max(0, netSelfEmploymentProfit -
deductionAmount)` (`services/tax-engine/src/estimate.ts:12-15`); `totalEstimatedTax =
Math.max(0, ...)` (`estimate.ts:71-77`). The choice is deliberate and documented at
`estimate.ts:69-70` (a comment — I did not find a code path that contradicts it, and the
two `Math.max` calls above are the mechanism).
**Why it matters to a gig worker:** Someone with a day job who drove for DoorDash on
weekends and barely broke even is leaving a real refund on the table, and the app that
claims to know their tax position tells them nothing happened.

## Viewing a past year pairs its shortfall with next year's due date

**Workflow step:** 6 — Live with it over time
**Severity:** minor
**What's missing:** The dashboard's estimate is scoped to `selectedYear`, but the catch-up
card's due date is `getUpcomingQuarterlyDueDates()[0]` — the globally next date, with no
year argument. Switch the year selector back to a finished year and the app computes that
year's set-aside gap, then tells the user to save $N/week until a due date months in the
future, for a year that is already filed.
**Evidence:** `computeTaxEstimate(entries, taxProfile, selectedYear)`
(`apps/mobile/src/screens/DashboardScreen.tsx:111`) against
`const nextDueDate = getUpcomingQuarterlyDueDates()[0]` and
`computeCatchUpStatus(netAmountToSetAside, amountSetAsideSoFar, nextDueDate)`
(`DashboardScreen.tsx:165-166`). `getUpcomingQuarterlyDueDates` takes only a `fromDate`
and has no tax-year parameter (`apps/mobile/src/notifications/quarterlyDueDates.ts:25-36`).
**Why it matters to a gig worker:** The year switcher is the feature a returning
second-year user reaches for first. It greets them with urgent, wrong advice about a
closed year — small, but it is the kind of visible incoherence that makes someone stop
trusting the rest of the numbers.

## Earnings can only be typed in — there is no import from the platforms' own exports

**Workflow step:** 2 — Log a shift
**Severity:** major
**What's missing:** Every entry is hand-keyed. DoorDash, Uber, Instacart and Amazon Flex
all let a driver download an earnings history, and the app can read a file (it uses
`DocumentPicker` for backup restore) — but the only importable file type is the app's own
backup JSON. There is no CSV import, no paste-a-week, no bulk add, and no way to
retroactively fill in a month the user forgot.
**Evidence:** `DocumentPicker.getDocumentAsync` appears exactly once in the app, in
`apps/mobile/src/backupFile.ts:25`, reached only from "Restore from Backup"
(`apps/mobile/src/screens/SettingsScreen.tsx:452-465`). Settings' data section offers
Export PDF (`:381`), Export CSV (`:409`) and Create Backup (`:430`) — export in three
forms, import in one, and that one is a destructive whole-device replace
(`repository.ts:232-241`).
**Why it matters to a gig worker:** The workflow the app assumes is "open the app after
every shift, forever." Real adherence decays within weeks, and the user who falls two
months behind faces re-typing sixty days by hand — so they give up, or they keep the
spreadsheet the app was supposed to replace. A CSV import is also the only realistic way a
mid-year switcher gets January–June into the app at all.

## The safe-harbor screen compares a year-to-date tax figure against a full-year withholding figure

**Workflow step:** 4 — Actually pay
**Severity:** blocker
**What's missing:** The current-year safe-harbor leg is *90% of this year's tax* — an
annual figure. The app feeds it `computeTaxEstimate(entries, taxProfile, year)`, which
aggregates only the entries **logged so far this year**. The withholding it is compared
against, by contrast, is the **full year's** estimate. The two sides of the subtraction
are on different time bases, and nothing projects gig income forward or annualizes it — a
search for `annualiz|project(ed|ion)|run.?rate|forecast` across `apps/mobile/src` returns
only W2 paycheck-to-annual conversion and the What-if simulator's hypothetical, never a
projection of actual gig earnings.
**Evidence:** `SafeHarborScreen.tsx:60-61` calls `computeTaxEstimate(entries, taxProfile,
year)` then `computeSafeHarbor`. `computeTaxEstimate` scopes to
`entriesForYear(entries, year)` (`apps/mobile/src/calculations.ts:251`, inside `computeTaxEstimate`).
`computeSafeHarbor` reads `currentYearFederalTax = totalEstimatedTax − stateTax`
(`calculations.ts:487`) and `federalWithholding = w2FederalWithholdingYtdEstimate`
(`calculations.ts:484`) — which, in the common path where the user supplied no YTD pay-stub
actuals, is set to `annualFederalEstimate`, the **whole year's** withholding
(`calculations.ts:311-312`; note the field is named `...YtdEstimate` but holds an annual
figure here). `estimatedPaymentsNeeded = max(0, requiredAnnualPayment − federalWithholding)`
(`calculations.ts:511`), and `noPenaltyExpected` follows from it (`:515`). The screen's own
copy states the rule as "90% of **this year's** tax" (`SafeHarborScreen.tsx:186` and `:230`) and
the disclaimer (`:239-242`) caveats only state rules and the prior-year assumption — the
time-base mismatch is not disclosed.
**Why it matters to a gig worker:** A W2-plus-gig user who opens this in March sees 90% of
(a full year of W2 tax + two months of gig tax) compared against a full year of
withholding, which nets to zero: "no penalty expected, $0 in estimated payments." They make
no Q1 payment, no Q2 payment, and the screen only starts telling the truth in the autumn —
after the two deadlines it exists to protect. This is the one premium screen whose entire
job is penalty avoidance.

## A clawback, chargeback or reversal cannot be recorded

**Workflow step:** 2 — Log a shift
**Severity:** minor
**What's missing:** Every money field is clamped non-negative on save, so there is no way
to record a platform deduction — a DoorDash adjustment, an Uber chargeback, a refunded
order, a returned Flex block. The user's only options are to edit the original entry (if
they can find it) or to leave their gross receipts overstated.
**Evidence:** gross pay is rejected outright when negative
(`apps/mobile/src/screens/AddEntryScreen.tsx:98-102`); tips, mileage and every expense go
through `Math.max(0, parseFloat(...) || 0)` on save (`AddEntryScreen.tsx:137-144`), as do
custom categories (`:127`); `totalCustomExpenses` floors again on read
(`apps/mobile/src/calculations.ts:159-161`). `Entry` (`apps/mobile/src/types.ts:108-127`) has no adjustment or
note field to carry the correction either.
**Why it matters to a gig worker:** Reversals are ordinary, and they arrive days after the
shift. Overstated gross receipts inflate the set-aside all year and then disagree with the
1099 at filing — the same reconciliation problem, arriving from the other direction.

---

## Ranked summary

| # | Finding | Step | Severity | v1.2 or later |
|---|---|---|---|---|
| 1 | Safe-harbor compares YTD tax against full-year withholding — reports "no penalty expected" through both spring deadlines | 4 Pay | blocker | **v1.2.** It is a live premium screen producing a confidently wrong answer at exactly the moment it is consulted. Fix or gate it. |
| 2 | Married Filing Jointly collects no spouse income; the whole year's set-aside is under-bracketed | 1 Onboard / 3 Know | blocker | **v1.2.** One field plus a bracket input. Until then the app is quietly wrong for most married users. |
| 3 | No 1099-NEC/1099-K reconciliation; no per-platform gross receipts in the exports | 5 File | major | **v1.2 partially** — emit per-platform gross receipts in the CSV/Schedule C export now (data already exists); the 1099-entry-and-compare screen can be v1.3. |
| 4 | Earnings can only be hand-typed — no CSV import from the platforms' own exports | 2 Log | major | **Later (v1.3).** Highest retention value of anything here, and the largest build; needs its own scoped item, not a v1.2 squeeze. |
| 5 | Tax profile has no history — moving state or a life change silently rewrites every past year | 6 Over time | major | **v1.2 if cheap**: year-key the profile the way `amountSetAsideByYear` already is, or at minimum stop recomputing closed years. Otherwise v1.3 with a migration. |
| 6 | No automatic backup and no prompt to make one; one lost phone is one lost tax year | 6 Over time | major | **v1.2 for the nudge** (record last-backup date, surface its age, prompt after N entries); real iCloud sync is v1.3. |
| 7 | The app never says how or where to pay — no IRS/state links, no 1040-ES pointer | 4 Pay | major | **v1.2.** A "How to pay" card with two links and a three-line explainer is hours of work against the app's single highest-stakes step. |
| 8 | The set-aside is one number paid to two governments; no federal/state payment split | 4 Pay | major | **v1.2**, alongside #7 — the federal slice already exists in the model (`w2FederalWithholdingYtdEstimate`); surface the pair. |
| 9 | State is free text — a typo tells a California user California isn't supported | 1 Onboard | major | **v1.2.** Replace the `TextField` with a picker over the 51 config keys. Smallest fix on this list, and it removes an abandon-at-onboarding path. |
| 10 | Schedule C Part IV vehicle info (total/commuting miles, in-service date) is never collected | 5 File | major | **v1.2 for the annual total-miles field** (unrecoverable if not captured contemporaneously); the rest of Part IV can be v1.3. |
| 11 | Only the standard mileage method exists, and the app never asks which method the user elected | 2 Log / 5 File | major | **v1.2 for the question** (store the election, warn when it conflicts); actual-expense math is a v1.3 workstream. |
| 12 | A loss year is floored to zero — the app can never show that gig work reduced a W2 tax bill | 3 Know / 6 Over time | minor | **Later.** Narrower population, and it touches the engine's floors in several places. |
| 13 | A past year in the year switcher pairs its shortfall with next year's due date | 6 Over time | minor | **v1.2.** Pass the selected year into `getUpcomingQuarterlyDueDates`, or suppress the catch-up card on closed years. Trivial. |
| 14 | Clawbacks, chargebacks and reversals cannot be recorded | 2 Log | minor | **Later**, but pair it with #3 — both are about the logged total not matching reality. |

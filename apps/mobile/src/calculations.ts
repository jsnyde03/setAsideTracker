import {
  estimateTax,
  estimateW2Withholding,
  currentTaxYear,
  taxYearConfigs,
  type TaxEstimateResult,
} from "@gig-tax-tracker/tax-engine";
import type { Entry, GigPlatform, PayFrequency, TaxProfile } from "./types";
import type { QuarterlyDueDate } from "./notifications/quarterlyDueDates";

export interface EntryAggregate {
  netSelfEmploymentProfit: number;
  businessMiles: number;
  totalExpenses: number;
  /** Sum of hoursWorked across entries that have it set — entries without it contribute 0, not
   * an error, since it's an optional field. */
  totalHoursWorked: number;
}

/** Result of computeTaxEstimate, with year-scoping metadata alongside the raw engine output. */
export interface TaxEstimateForYear {
  estimate: TaxEstimateResult;
  /** The calendar year the estimate was actually computed for. */
  year: number;
  /** True if no tax-year config exists for `year` yet, so the estimate fell back to the nearest
   * available config — UI should warn rather than silently presenting it as accurate. */
  usedFallbackConfig: boolean;
  /** Estimated W2 federal+state withholding already applied so far this year, prorated by how
   * much of the job's active period (Jan 1 through w2EndDate, or year-end if none) has elapsed.
   * 0 whenever there's no W2 job or it wasn't active at all during this year. */
  w2WithholdingYtdEstimate: number;
  /** The FEDERAL-only slice of w2WithholdingYtdEstimate (excludes state withholding). Needed by the
   * safe-harbor / Form 2210 calculator, which is a federal rule and must compare against federal
   * tax and federal withholding only — not the combined figure the rest of the app uses. 0 when
   * there's no active W2 job this year. */
  w2FederalWithholdingYtdEstimate: number;
  /** estimate.totalEstimatedTax minus w2WithholdingYtdEstimate, floored at 0 — what's actually
   * left to set aside after crediting back tax already withheld from W2 paychecks. This is the
   * number that should be shown as the headline "set aside" figure, not the raw gross total. */
  netAmountToSetAside: number;
}

const PAY_PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

/** Converts a regular paycheck amount into a projected annual income figure. Most people know
 * their paycheck amount, not their annual gross — this is how the onboarding/settings forms let
 * them enter the former while the tax engine keeps using the latter under the hood. */
export function annualIncomeFromPaycheck(paycheckAmount: number, frequency: PayFrequency): number {
  return paycheckAmount * PAY_PERIODS_PER_YEAR[frequency];
}

/** Whether a W2 job (per its optional end date) was active at all during the given tax year — a
 * job that already ended in a prior year contributes no income/withholding to this year at all,
 * which is different from "ongoing" or "ended partway through this year." */
function w2JobActiveDuringYear(year: number, w2EndDate?: string): boolean {
  if (!w2EndDate) return true;
  const endDate = new Date(w2EndDate);
  if (Number.isNaN(endDate.getTime())) return true; // malformed date — don't silently zero income out
  return endDate.getFullYear() >= year;
}

/**
 * Fraction (0–1) of a W2 job's active period within `year` that has elapsed as of `now`. Used
 * only in the YTD-actuals withholding path to estimate remaining employer withholding — not for
 * prorating the withholding credit against total tax owed (that old approach was wrong; see below).
 */
export function w2WithholdingYearFraction(
  year: number,
  w2EndDate?: string,
  now: Date = new Date()
): number {
  const periodStart = new Date(year, 0, 1);
  let periodEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  if (w2EndDate) {
    const parsedEnd = new Date(w2EndDate);
    if (!Number.isNaN(parsedEnd.getTime()) && parsedEnd.getTime() < periodEnd.getTime()) {
      periodEnd = parsedEnd;
    }
  }

  if (periodEnd.getTime() <= periodStart.getTime()) return 0;
  if (now.getTime() >= periodEnd.getTime()) return 1;
  if (now.getTime() <= periodStart.getTime()) return 0;

  return (now.getTime() - periodStart.getTime()) / (periodEnd.getTime() - periodStart.getTime());
}

/**
 * Derives the two W2 income figures the tax engine needs from per-paycheck pay stub fields:
 * - w2FicaWages: gross minus pretax insurance/HSA only (NOT minus 401k, since 401k reduces
 *   income tax but not Social Security/Medicare wages per IRC §3121(a)(5))
 * - w2FederalTaxableIncome: gross minus 401k minus pretax benefits (what the W-4 targets and
 *   what income/state tax brackets apply to)
 * Returns zeros when the job is not active.
 */
function deriveW2Incomes(taxProfile: TaxProfile, w2Active: boolean): {
  w2FicaWages: number;
  w2FederalTaxableIncome: number;
} {
  if (!w2Active) return { w2FicaWages: 0, w2FederalTaxableIncome: 0 };
  const gross = taxProfile.w2GrossPayPerPeriod ?? 0;
  const retirement = taxProfile.w2RetirementPerPeriod ?? 0;
  const preTaxBenefits = taxProfile.w2PreTaxBenefitsPerPeriod ?? 0;
  const periods = PAY_PERIODS_PER_YEAR[taxProfile.w2PayFrequency ?? "biweekly"];
  return {
    w2FicaWages: Math.max(0, gross - preTaxBenefits) * periods,
    w2FederalTaxableIncome: Math.max(0, gross - retirement - preTaxBenefits) * periods,
  };
}

export interface CatchUpStatus {
  amountSetAsideSoFar: number;
  amountOwed: number;
  /** amountOwed - amountSetAsideSoFar. Zero or negative means caught up or ahead of target. */
  gap: number;
  /** Only set when gap > 0 and a next due date is available to spread the gap across. */
  weeklyCatchUpAmount?: number;
  nextDueDate?: QuarterlyDueDate;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Compares what's actually been set aside so far against what's owed, and — if there's a
 * shortfall — turns it into a concrete weekly amount to close the gap by the next due date,
 * rather than just showing a bigger scary number as the year goes on. `now` is a parameter
 * rather than read internally so this stays a pure, testable function (same convention as
 * w2WithholdingYearFraction).
 */
export function computeCatchUpStatus(
  amountOwed: number,
  amountSetAsideSoFar: number,
  nextDueDate?: QuarterlyDueDate,
  now: Date = new Date()
): CatchUpStatus {
  const gap = amountOwed - amountSetAsideSoFar;

  if (gap <= 0 || !nextDueDate) {
    return { amountSetAsideSoFar, amountOwed, gap, nextDueDate };
  }

  const weeksRemaining = Math.max(1, Math.ceil((nextDueDate.dueDate.getTime() - now.getTime()) / MS_PER_WEEK));
  return {
    amountSetAsideSoFar,
    amountOwed,
    gap,
    weeklyCatchUpAmount: gap / weeksRemaining,
    nextDueDate,
  };
}

/** Sum of an entry's user-defined custom expense categories (Premium). Zero for entries without
 * any — older entries and free users. Negative amounts can't be entered, but we floor defensively. */
export function totalCustomExpenses(entry: Entry): number {
  return (entry.customExpenses ?? []).reduce((sum, item) => sum + Math.max(0, item.amount), 0);
}

/** All non-mileage business expenses for an entry: the four fixed buckets plus any custom
 * categories. Mileage is handled separately by the tax engine via the standard mileage rate, not as
 * a dollar expense here. Exported so the dashboard and platform comparison share one definition. */
export function totalEntryExpenses(entry: Entry): number {
  return (
    entry.expenses.parking +
    entry.expenses.tolls +
    entry.expenses.supplies +
    entry.expenses.phone +
    totalCustomExpenses(entry)
  );
}

/** Entries whose date falls within the given calendar year. Dates are stored as YYYY-MM-DD. */
export function entriesForYear(entries: Entry[], year: number): Entry[] {
  const prefix = String(year);
  return entries.filter((entry) => entry.date.startsWith(prefix));
}

/** Calendar years present across a set of entries, descending (most recent first). */
export function yearsWithEntries(entries: Entry[]): number[] {
  const years = new Set(entries.map((entry) => Number(entry.date.slice(0, 4))));
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Net SE profit is gross pay + tips, minus non-mileage business expenses (parking, tolls,
 * supplies, phone, and any custom categories). Mileage is handled separately by the tax engine via
 * the standard mileage rate, not as a dollar expense here.
 */
/**
 * One entry's own contribution to net SE profit: gross + tips, less its non-mileage expenses.
 *
 * ⚠️ Mileage is deliberately **not** subtracted here, matching {@link aggregateEntries} — the tax
 * engine applies the standard mileage rate itself, and taking it off twice would double-count it.
 * Extracted so the per-entry set-aside ({@link computeSetAsideRate}) and the aggregate cannot drift
 * apart on what "this entry earned" means.
 */
export function entryNetProfit(entry: Entry): number {
  return entry.grossPay + entry.tips - totalEntryExpenses(entry);
}

export function aggregateEntries(entries: Entry[]): EntryAggregate {
  return entries.reduce<EntryAggregate>(
    (acc, entry) => {
      const expenses = totalEntryExpenses(entry);
      return {
        netSelfEmploymentProfit: acc.netSelfEmploymentProfit + entry.grossPay + entry.tips - expenses,
        businessMiles: acc.businessMiles + entry.mileage,
        totalExpenses: acc.totalExpenses + expenses,
        totalHoursWorked: acc.totalHoursWorked + (entry.hoursWorked ?? 0),
      };
    },
    { netSelfEmploymentProfit: 0, businessMiles: 0, totalExpenses: 0, totalHoursWorked: 0 }
  );
}

/**
 * "True" hourly rate: take-home pay (gross earnings minus logged cash expenses minus the tax
 * set-aside) divided by hours actually worked. Deliberately does NOT also subtract a
 * mileage-implied vehicle-cost estimate on top of that — the standard mileage rate already
 * reduces the tax set-aside via the tax engine's deduction, so subtracting it again here would
 * double-count it as if it were a second real cash outflow. Returns undefined when no hours have
 * been logged, since dividing by zero isn't a rate, it's a missing input.
 */
/**
 * The set-aside rate to freeze onto an entry being logged now ([D7]) — or `undefined` when there is
 * nothing to freeze.
 *
 * **It is the tax this entry actually ADDS, not a share of an average.** The figure is
 * `f(existing + this) − f(existing)`, where `f` is the same `netAmountToSetAside` the dashboard
 * shows — so it accounts for progressive brackets, the SE tax wage base, state rules and the W2
 * withholding credit by *construction*, with no parallel tax path to drift from the real one. Early
 * in a year where a W2 job already over-withholds, `f` is still zero and so is the increment, which
 * is the correct answer: nothing needs setting aside yet.
 *
 * "Existing" means the entries already saved at this moment — not the entries dated earlier. That is
 * what "the rate in effect when logged" means, and it keeps the figure stable when a user back-dates
 * an entry later.
 *
 * ⚠️ **Clamped to ≥ 0, which loses exactness on purpose.** A high-mileage shift can *reduce* the
 * year's tax (its standard-mileage deduction exceeding its pay), giving a negative increment. That
 * reduction is real and stays visible in the year total — but a per-shift instruction to set aside a
 * negative amount is not actionable, and the safe direction for a tax app is setting aside slightly
 * too much. The residual is what the catch-up line reconciles.
 *
 * @returns a fraction of {@link entryNetProfit}, or `undefined` when the entry has no positive
 *   profit to take a fraction of — an entry that cost more than it paid sets aside nothing, which is
 *   a known zero rather than a missing figure.
 */
export function computeSetAsideRate(
  existingEntries: Entry[],
  newEntry: Entry,
  taxProfile: TaxProfile,
  year: number = new Date().getFullYear()
): number | undefined {
  const profit = entryNetProfit(newEntry);
  if (profit <= 0) return undefined;

  const before = computeTaxEstimate(existingEntries, taxProfile, year).netAmountToSetAside;
  const after = computeTaxEstimate([...existingEntries, newEntry], taxProfile, year).netAmountToSetAside;

  return Math.max(0, after - before) / profit;
}

/**
 * What a single entry says to set aside, in dollars: its frozen rate applied to its current profit.
 *
 * Returns `undefined` for an entry with no frozen rate **and** no fallback supplied — the caller
 * then knows the figure is unavailable rather than zero. [D14]: a fallback rate is passed for
 * entries logged before the field existed, and any period containing one is marked estimated.
 */
export function entrySetAside(entry: Entry, fallbackRate?: number): number | undefined {
  const rate = entry.setAsideRate ?? fallbackRate;
  if (rate === undefined) return undefined;
  return Math.max(0, entryNetProfit(entry)) * rate;
}

/** One week's worth of logged work, and what it says to set aside. Weeks are Monday–Sunday ([D13]). */
export interface WeeklySetAside {
  /** `YYYY-MM-DD` of the Monday that opens the week. Also the sort key. */
  weekStart: string;
  /** `YYYY-MM-DD` of the Sunday that closes it. */
  weekEnd: string;
  entryCount: number;
  /** Sum of {@link entryNetProfit} across the week's entries, floored at 0 per entry. */
  netProfit: number;
  setAside: number;
  /**
   * True when at least one entry in this week predates the frozen rate and had its figure derived
   * from the year's current rate instead ([D14]).
   *
   * ⚠️ **The label is what makes deriving those figures honest rather than convenient.** Showing
   * "—" for every pre-v1.2 week greets an existing user with a wall of blanks over data they really
   * have; back-filling silently presents a reconstructed number as though it had been frozen at the
   * time, which is the exact thing [D7] exists to prevent. Marking it says which is which.
   */
  estimated: boolean;
}

/**
 * The Monday that opens the week containing `date`, as `YYYY-MM-DD`.
 *
 * ⚠️ **Computed in UTC on purpose.** `new Date("2026-06-14")` is parsed as midnight *UTC*, so in any
 * timezone behind it that instant is the 13th locally — and a Sunday entry would land in the wrong
 * week for every user west of Greenwich. Entry dates are calendar dates with no time and no zone,
 * and the rest of this file treats them as strings (`entriesForYear` matches on a prefix) for the
 * same reason. Nothing here converts to local time.
 */
export function weekStartOf(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  // getUTCDay: 0 = Sunday. Monday-based offset, so Sunday is 6 days into its week, not 0.
  const offset = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - offset);
  return utc.toISOString().slice(0, 10);
}

function addUtcDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/**
 * The rate to apply to entries logged before the frozen field existed ([D14]) — the year's own
 * effective rate, derived from the same pipeline everything else uses.
 *
 * Returns `undefined` when the year has no positive profit to divide by, in which case there is no
 * meaningful figure to show for a legacy entry and the caller leaves it out rather than inventing 0.
 */
export function fallbackSetAsideRate(
  entries: Entry[],
  taxProfile: TaxProfile,
  year: number
): number | undefined {
  const forYear = entriesForYear(entries, year);
  const profit = forYear.reduce((sum, entry) => sum + Math.max(0, entryNetProfit(entry)), 0);
  if (profit <= 0) return undefined;
  return computeTaxEstimate(forYear, taxProfile, year).netAmountToSetAside / profit;
}

/**
 * Groups a year's entries into Monday–Sunday weeks and totals what each says to set aside.
 *
 * Most recent week first, matching {@link yearsWithEntries}. Weeks with no entries are **not**
 * emitted — an empty row is not information, and the user did not work that week.
 */
export function weeklySetAsides(
  entries: Entry[],
  taxProfile: TaxProfile,
  year: number = new Date().getFullYear()
): WeeklySetAside[] {
  const forYear = entriesForYear(entries, year);
  const fallback = fallbackSetAsideRate(entries, taxProfile, year);

  const byWeek = new Map<string, WeeklySetAside>();
  for (const entry of forYear) {
    const weekStart = weekStartOf(entry.date);
    const week = byWeek.get(weekStart) ?? {
      weekStart,
      weekEnd: addUtcDays(weekStart, 6),
      entryCount: 0,
      netProfit: 0,
      setAside: 0,
      estimated: false,
    };

    week.entryCount += 1;
    week.netProfit += Math.max(0, entryNetProfit(entry));
    week.setAside += entrySetAside(entry, fallback) ?? 0;
    // An entry with its own frozen rate is exact; one leaning on the fallback is not, and one whole
    // estimated entry is enough to make the week's total an estimate.
    if (entry.setAsideRate === undefined && entryNetProfit(entry) > 0) week.estimated = true;

    byWeek.set(weekStart, week);
  }

  return Array.from(byWeek.values()).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function effectiveHourlyRate(
  totalEarnings: number,
  totalExpenses: number,
  netAmountToSetAside: number,
  totalHoursWorked: number
): number | undefined {
  if (totalHoursWorked <= 0) return undefined;
  return (totalEarnings - totalExpenses - netAmountToSetAside) / totalHoursWorked;
}

/**
 * Returns the list of recognized local tax jurisdictions (counties) for a state, or undefined
 * if that state has no local tax layer. Used to decide whether to show a county picker and what
 * options to offer, kept in sync with the tax-engine config rather than duplicating the list.
 */
export function getCountiesForState(stateCode: string): string[] | undefined {
  const stateConfig = currentTaxYear.stateTaxConfigs[stateCode.trim().toUpperCase()];
  if (!stateConfig || stateConfig.type === "none" || !stateConfig.localTaxJurisdictions) {
    return undefined;
  }
  return Object.keys(stateConfig.localTaxJurisdictions).sort();
}

/**
 * Computes the tax estimate for a single calendar year, scoping entries to that year first —
 * entries from other years must never bleed into this year's "set aside" number. Defaults to the
 * current calendar year. Falls back to `currentTaxYear`'s config if no config exists yet for the
 * requested year (e.g. next year, before that year's IRS figures are confirmed); callers should
 * surface `usedFallbackConfig` rather than silently presenting the estimate as authoritative.
 */
export function computeTaxEstimate(
  entries: Entry[],
  taxProfile: TaxProfile,
  year: number = new Date().getFullYear()
): TaxEstimateForYear {
  return estimateFromAggregate(aggregateEntries(entriesForYear(entries, year)), taxProfile, year);
}

/**
 * The shared core behind both the dashboard estimate and the What-if simulator: given an already
 * computed income aggregate (real entries, or a hypothetical scenario), run it through the tax
 * engine and the W2-withholding credit logic for a year. Pulling this out of computeTaxEstimate
 * lets the What-if screen reuse the exact same pipeline — including the withholding credit — rather
 * than re-deriving a parallel, drift-prone copy.
 */
export function estimateFromAggregate(
  aggregate: EntryAggregate,
  taxProfile: TaxProfile,
  year: number = new Date().getFullYear()
): TaxEstimateForYear {
  const config = taxYearConfigs[year] ?? currentTaxYear;

  const w2Active = taxProfile.hasW2Job && w2JobActiveDuringYear(year, taxProfile.w2EndDate);
  const { w2FicaWages, w2FederalTaxableIncome } = deriveW2Incomes(taxProfile, w2Active);

  // Spouse income on a joint return (1.2.2.4). Only counted when actually filing jointly — the
  // field is meaningless otherwise, and a stale value left behind by a filing-status change must
  // not silently keep inflating the estimate.
  const spouseIncome =
    taxProfile.filingStatus === "marriedFilingJointly"
      ? Math.max(0, taxProfile.spouseAnnualIncome ?? 0)
      : 0;

  // ⚠️ Spouse income goes into TAXABLE income and NOWHERE ELSE. It must not reach `otherFicaWages`,
  // which shrinks both the Social Security wage base and the Additional Medicare threshold
  // (seTax.ts:26,33). The SS wage base is PER PERSON, so a spouse's wages do not consume the
  // user's — routing it there would wrongly cut the user's SE tax.
  // Known simplification, stated rather than hidden: MFJ's $250k Additional Medicare threshold IS
  // assessed on combined wages, so a couple above that will see it applied slightly late. That
  // costs accuracy only above $250k of wages, and the alternative miscomputes SE tax for everyone.
  const otherTaxableIncome = w2FederalTaxableIncome + spouseIncome;

  const estimate = estimateTax(
    {
      filingStatus: taxProfile.filingStatus,
      netSelfEmploymentProfit: aggregate.netSelfEmploymentProfit,
      businessMiles: aggregate.businessMiles,
      otherTaxableIncome,
      otherFicaWages: w2FicaWages,
      stateCode: taxProfile.state,
      county: taxProfile.county,
      // Simplification: treats every declared dependent as a CTC-qualifying child — see the
      // caveat on TaxEstimateInput.numberOfChildren in the tax-engine.
      numberOfChildren: taxProfile.dependents,
    },
    config
  );

  // Withholding credit — how much employer withholding will cover this year's tax bill.
  // Prorating by elapsed time was wrong: it implied the user owed the "not-yet-withheld" portion
  // themselves, when future paychecks withhold it automatically. So: YTD actuals when supplied,
  // plus the model's estimate for the remaining pay periods; otherwise the full annual estimate.
  //
  // ⛔ Each job is estimated on ITS OWN income, and deliberately NOT from
  // `estimate.w2WithholdingEstimate`. That figure is derived from `otherTaxableIncome`, which since
  // 1.2.2.4 includes the spouse — so using it AND adding a separate spouse estimate counted the
  // spouse's withholding TWICE, overstating withholding and understating the set-aside. That is the
  // same dangerous direction as the bug 1.2.2.4 set out to fix. Caught by 1.2.2.5's before-scan;
  // every 1.2.2.4 test used `hasW2Job: false`, so none of them could see it.
  //
  // Per-job isolation is also the model's own documented assumption (see estimateW2Withholding):
  // each employer withholds as if its pay were the household's only income, which is how a default
  // W-4 behaves.
  //
  // ⚠️ Dependents are claimed on exactly ONE W-4. Claiming the same children on both would
  // double-count the credit and overstate withholding. IRS guidance is to claim on one job — the
  // user's when they have one, otherwise the spouse's.
  const dependentsOnUserW4 = w2Active ? taxProfile.dependents : 0;
  const dependentsOnSpouseW4 = w2Active ? 0 : taxProfile.dependents;

  const zeroWithholding = { annualFederalEstimate: 0, annualStateEstimate: 0, annualTotalEstimate: 0 };
  const estimateFor = (income: number, children: number) =>
    income > 0
      ? estimateW2Withholding(
          income,
          taxProfile.filingStatus,
          taxProfile.state,
          config,
          taxProfile.county,
          children
        )
      : zeroWithholding;

  const userWithholding = w2Active
    ? estimateFor(w2FederalTaxableIncome, dependentsOnUserW4)
    : zeroWithholding;
  const spouseWithholding = estimateFor(spouseIncome, dependentsOnSpouseW4);

  let w2WithholdingYtdEstimate = 0;
  let w2FederalWithholdingYtdEstimate = 0;
  if (w2Active) {
    const hasYtdActuals =
      taxProfile.w2YtdFederalWithheld !== undefined || taxProfile.w2YtdStateWithheld !== undefined;
    if (hasYtdActuals) {
      const ytdActual = (taxProfile.w2YtdFederalWithheld ?? 0) + (taxProfile.w2YtdStateWithheld ?? 0);
      const elapsedFraction = w2WithholdingYearFraction(year, taxProfile.w2EndDate);
      const remainingFraction = Math.max(0, 1 - elapsedFraction);
      w2WithholdingYtdEstimate = ytdActual + userWithholding.annualTotalEstimate * remainingFraction;
      w2FederalWithholdingYtdEstimate =
        (taxProfile.w2YtdFederalWithheld ?? 0) +
        userWithholding.annualFederalEstimate * remainingFraction;
    } else {
      w2WithholdingYtdEstimate = userWithholding.annualTotalEstimate;
      w2FederalWithholdingYtdEstimate = userWithholding.annualFederalEstimate;
    }
  }

  // The spouse's employer withholds all year regardless of whether the USER has a job, and the YTD
  // actuals above describe the user's pay stub only — so the spouse's full annual estimate is added
  // here rather than being prorated against someone else's figures.
  w2WithholdingYtdEstimate += spouseWithholding.annualTotalEstimate;
  w2FederalWithholdingYtdEstimate += spouseWithholding.annualFederalEstimate;

  const netAmountToSetAside = Math.max(0, estimate.totalEstimatedTax - w2WithholdingYtdEstimate);

  return {
    estimate,
    year,
    usedFallbackConfig: !taxYearConfigs[year],
    w2WithholdingYtdEstimate,
    w2FederalWithholdingYtdEstimate,
    netAmountToSetAside,
  };
}

/**
 * Recommendation for covering the tax on gig/1099 income through a W2 employer's payroll
 * withholding — by entering an "extra withholding" amount on a new W-4 (Form W-4 Line 4(c), a flat
 * per-paycheck dollar add) — so the user may not have to make quarterly estimated payments at all.
 * This is the headline value of the optimizer: turning a lump-sum quarterly chore into an automatic
 * paycheck deduction the employer handles.
 */
export interface W4OptimizationResult {
  /** False when there's no W2 job to adjust withholding on — the whole tool is N/A. */
  applicable: boolean;
  /** Pay periods per year implied by the W2 pay frequency (biweekly when unset), e.g. 26. */
  payPeriodsPerYear: number;
  /**
   * Gig tax not covered by a normally-withholding W2 job, for a full year:
   * max(0, totalEstimatedTax − full-year W2 withholding estimate). This isolates the tax caused by
   * gig income (its SE tax plus the extra income tax from stacking gig income on top of W2 wages),
   * which is exactly what the extra withholding needs to cover. Date-independent — the steady-state
   * amount a standing W-4 instruction targets.
   */
  annualGigTax: number;
  /** Steady-state extra withholding to enter on W-4 Line 4(c): annualGigTax / payPeriodsPerYear.
   *  The headline recommendation. 0 when not applicable or already covered. */
  extraPerPaycheck: number;
  /** True when there's a W2 job but no gig tax to cover (existing withholding already handles the
   *  whole bill) — the screen shows a "no change needed" state rather than a $0 recommendation. */
  alreadyCovered: boolean;
  /** Paychecks left in the tax year as of `now` (accounts for a mid-year job end date), floored
   *  at 1 so the catch-up figure never divides by zero. */
  remainingPayPeriods: number;
  /** What's left to cover for THIS year specifically (date- and YTD-aware): the estimate's
   *  netAmountToSetAside. Differs from annualGigTax once YTD withholding actuals are entered or the
   *  year is partly elapsed. */
  remainingGigTaxThisYear: number;
  /** Extra per *remaining* paycheck to fully cover this year before year-end:
   *  remainingGigTaxThisYear / remainingPayPeriods. Higher than extraPerPaycheck mid-year, since
   *  fewer paychecks are left to spread the catch-up across. */
  catchUpPerPaycheck: number;
}

/**
 * Computes the W-4 "extra withholding" recommendation from an already-computed tax estimate and the
 * user's W2 pay details. Pure (takes `now` as a parameter, same convention as computeCatchUpStatus)
 * and reuses the estimate rather than re-running the engine. Two figures, both correct for their
 * framing: `extraPerPaycheck` is the steady-state amount for a standing W-4 (annual gig tax spread
 * over a full year of checks); `catchUpPerPaycheck` is what it takes to cover *this* year's
 * still-uncovered tax across only the paychecks left, which is higher once the year is underway.
 */
export function computeW4Optimization(
  taxEstimate: TaxEstimateForYear,
  taxProfile: TaxProfile,
  now: Date = new Date()
): W4OptimizationResult {
  const payPeriodsPerYear = PAY_PERIODS_PER_YEAR[taxProfile.w2PayFrequency ?? "biweekly"];

  if (!taxProfile.hasW2Job) {
    return {
      applicable: false,
      payPeriodsPerYear,
      annualGigTax: 0,
      extraPerPaycheck: 0,
      alreadyCovered: false,
      remainingPayPeriods: payPeriodsPerYear,
      remainingGigTaxThisYear: 0,
      catchUpPerPaycheck: 0,
    };
  }

  const { estimate, year, netAmountToSetAside } = taxEstimate;
  const annualGigTax = Math.max(
    0,
    estimate.totalEstimatedTax - estimate.w2WithholdingEstimate.annualTotalEstimate
  );
  const extraPerPaycheck = annualGigTax / payPeriodsPerYear;

  const elapsedFraction = w2WithholdingYearFraction(year, taxProfile.w2EndDate, now);
  const remainingPayPeriods = Math.max(1, Math.round(payPeriodsPerYear * (1 - elapsedFraction)));
  const catchUpPerPaycheck = netAmountToSetAside / remainingPayPeriods;

  return {
    applicable: true,
    payPeriodsPerYear,
    annualGigTax,
    extraPerPaycheck,
    alreadyCovered: annualGigTax <= 0,
    remainingPayPeriods,
    remainingGigTaxThisYear: netAmountToSetAside,
    catchUpPerPaycheck,
  };
}

/**
 * Result of the safe-harbor (Form 2210) underpayment-penalty check. Everything here is FEDERAL
 * only — Form 2210, the $1,000 floor, and the 90%/100%/110% thresholds are federal rules; state
 * underpayment rules differ and aren't modeled. The headline output is `requiredAnnualPayment`:
 * the least a taxpayer can pay in (through withholding + estimated payments) and still avoid the
 * penalty — which, when income has jumped, is often far below this year's actual tax.
 */
export interface SafeHarborResult {
  /** Estimated current-year federal tax (the engine's total estimate minus its state-tax slice). */
  currentYearFederalTax: number;
  /** 90% of currentYearFederalTax — the current-year leg of the safe harbor. */
  ninetyPctCurrent: number;
  /** True when the user supplied a prior-year filed total tax (so the prior-year leg is real). */
  hasPriorYear: boolean;
  /** Prior-year federal total tax the user entered from their filed return. 0 when not supplied. */
  priorYearTax: number;
  /** 1.0, or 1.1 when prior-year AGI exceeded the high-income threshold ($150k, or $75k if married
   *  filing separately). 1.0 whenever AGI wasn't supplied (the common, lower-income case). */
  priorYearMultiplier: number;
  /** priorYearMultiplier × priorYearTax — the prior-year leg of the safe harbor. 0 when no prior
   *  year was supplied. */
  priorYearSafeHarbor: number;
  /** The required annual payment to avoid the penalty: the SMALLER of the two legs, or just the
   *  90%-current leg when no prior-year figure is available (we can't claim the prior-year leg
   *  without the number, so we fall back to the conservative current-year one). */
  requiredAnnualPayment: number;
  /** Which leg is binding (the smaller one). "currentYear" also when no prior-year figure exists. */
  bindingTest: "currentYear" | "priorYear";
  /** Expected full-year federal W2 withholding — counts toward the requirement automatically. */
  federalWithholding: number;
  /** Estimated federal payments still needed beyond withholding: max(0, required − withholding).
   *  This is the actionable number — the minimum to pay across the year's quarterly installments. */
  estimatedPaymentsNeeded: number;
  /** estimatedPaymentsNeeded spread over 4 equal quarterly installments (the default 1040-ES
   *  schedule). 0 when nothing extra is needed. */
  perQuarter: number;
  /** True when `currentYearFederalTax` is a full-year PROJECTION from year-to-date income rather
   *  than a settled figure. ⚠️ The UI must say so: this is a forecast of what the user will owe,
   *  and it moves as they earn. False for a completed year, and false when `computeSafeHarbor` is
   *  called directly without a projection. */
  isProjected: boolean;
  /** What year-to-date income was multiplied by to reach the full-year figure. 1 when not
   *  projected. Exposed so "show your math" can state the assumption instead of hiding it. */
  projectionFactor: number;
  /** True when current-year federal tax after withholding is under the $1,000 de-minimis floor —
   *  no penalty applies regardless of estimated payments (Form 2210's first stop). */
  underDeMinimis: boolean;
  /** True when no underpayment penalty is expected at all: de-minimis, OR withholding by itself
   *  already meets the required annual payment (no estimated payments needed). */
  noPenaltyExpected: boolean;
}

/** Tax under this balance-due (after withholding) carries no underpayment penalty (Form 2210). */
const SAFE_HARBOR_DE_MINIMIS = 1000;
/** Current-year safe harbor: pay at least 90% of this year's tax. */
const SAFE_HARBOR_CURRENT_PCT = 0.9;
/** Prior-year safe harbor: 100% of last year's tax, bumped to 110% above the high-income AGI line. */
const SAFE_HARBOR_PRIOR_HIGH_INCOME_MULTIPLIER = 1.1;
/** AGI above which the prior-year safe harbor is 110% rather than 100% (half that for MFS). */
const SAFE_HARBOR_HIGH_INCOME_AGI = 150000;
const SAFE_HARBOR_HIGH_INCOME_AGI_MFS = 75000;

/**
 * Below this much of the year elapsed, a linear projection is mostly noise: on 5 January a single
 * $500 day annualises to $36,500. Capping the multiplier at 1/this (12.5x) keeps an early-year
 * projection large enough to be honest without being absurd.
 */
const MIN_ELAPSED_FRACTION_FOR_PROJECTION = 0.08;

/** A full-year projection of gig income, with the multiplier that produced it. */
export interface ProjectedAggregate {
  aggregate: EntryAggregate;
  /** What year-to-date figures were multiplied by. 1 once the year is over (nothing to project). */
  factor: number;
  /** False when the year is complete, so the figures are actual rather than projected. */
  isProjected: boolean;
}

/**
 * Scales a year-to-date aggregate up to a full-year estimate.
 *
 * ⚠️ **Only the safe-harbor path wants this.** The dashboard's `netAmountToSetAside` answers "what
 * should I set aside for what I have earned SO FAR", and is correct as-is; projecting there would
 * tell a user to set aside money for income they have not earned yet.
 *
 * Form 2210's 90% leg is defined on the FULL year's tax, so comparing a year-to-date tax against a
 * full-year withholding — which is what the code did until 1.2.2.3 — understates the requirement and
 * reports "no penalty expected" through both spring deadlines. The type's own docstrings already
 * described these as full-year figures; only the computation disagreed.
 */
export function projectAggregateToFullYear(
  aggregate: EntryAggregate,
  year: number,
  now: Date = new Date()
): ProjectedAggregate {
  const elapsed = w2WithholdingYearFraction(year, undefined, now);

  // The year is done (or this is a past year): the figures are actual, not a projection.
  if (elapsed >= 1) {
    return { aggregate, factor: 1, isProjected: false };
  }

  const factor = 1 / Math.max(elapsed, MIN_ELAPSED_FRACTION_FOR_PROJECTION);

  return {
    aggregate: {
      netSelfEmploymentProfit: aggregate.netSelfEmploymentProfit * factor,
      businessMiles: aggregate.businessMiles * factor,
      totalExpenses: aggregate.totalExpenses * factor,
      totalHoursWorked: aggregate.totalHoursWorked * factor,
    },
    factor,
    isProjected: true,
  };
}

/**
 * The safe-harbor picture from raw entries — projecting gig income to a full year first, which is
 * what makes the 90%-of-current-year leg mean what Form 2210 says it means.
 *
 * Kept separate from `computeSafeHarbor` so that function stays pure over an already-computed
 * estimate (and so the projection itself is testable on its own).
 */
export function computeSafeHarborFromEntries(
  entries: Entry[],
  taxProfile: TaxProfile,
  year: number = new Date().getFullYear(),
  now: Date = new Date()
): SafeHarborResult {
  const ytd = aggregateEntries(entriesForYear(entries, year));
  const projected = projectAggregateToFullYear(ytd, year, now);
  const estimate = estimateFromAggregate(projected.aggregate, taxProfile, year);

  return computeSafeHarbor(estimate, taxProfile, projected);
}

/**
 * Computes the federal safe-harbor / Form 2210 underpayment-penalty picture from an already-computed
 * tax estimate and the user's prior-year filed figures. Pure (reuses the estimate; reads prior-year
 * data from the profile rather than re-running anything). The prior-year leg only exists if the user
 * entered last year's total tax — the app can't know a return it didn't compute — so when it's
 * absent we report the conservative 90%-current requirement and the UI should prompt for the figure
 * (entering it can only lower the requirement, never raise it).
 */
export function computeSafeHarbor(
  taxEstimate: TaxEstimateForYear,
  taxProfile: TaxProfile,
  projection?: ProjectedAggregate
): SafeHarborResult {
  const { estimate, year, w2FederalWithholdingYtdEstimate: federalWithholding } = taxEstimate;

  // Form 2210 is federal: strip the engine's state-tax slice off the combined total.
  const currentYearFederalTax = Math.max(0, estimate.totalEstimatedTax - estimate.stateTax.stateTax);
  const ninetyPctCurrent = currentYearFederalTax * SAFE_HARBOR_CURRENT_PCT;

  const priorFiled = taxProfile.filedTaxByYear?.[year - 1];
  const hasPriorYear = priorFiled !== undefined && priorFiled.totalTax > 0;
  const priorYearTax = hasPriorYear ? priorFiled!.totalTax : 0;

  const highIncomeThreshold =
    taxProfile.filingStatus === "marriedFilingSeparately"
      ? SAFE_HARBOR_HIGH_INCOME_AGI_MFS
      : SAFE_HARBOR_HIGH_INCOME_AGI;
  const priorYearMultiplier =
    hasPriorYear && priorFiled!.agi !== undefined && priorFiled!.agi > highIncomeThreshold
      ? SAFE_HARBOR_PRIOR_HIGH_INCOME_MULTIPLIER
      : 1.0;
  const priorYearSafeHarbor = hasPriorYear ? priorYearTax * priorYearMultiplier : 0;

  // The taxpayer can pay the SMALLER of the two legs. Without the prior-year figure we can't claim
  // its (often lower) leg, so we fall back to the current-year one rather than guessing.
  const requiredAnnualPayment =
    hasPriorYear ? Math.min(ninetyPctCurrent, priorYearSafeHarbor) : ninetyPctCurrent;
  const bindingTest: "currentYear" | "priorYear" =
    hasPriorYear && priorYearSafeHarbor < ninetyPctCurrent ? "priorYear" : "currentYear";

  const estimatedPaymentsNeeded = Math.max(0, requiredAnnualPayment - federalWithholding);
  const perQuarter = estimatedPaymentsNeeded / 4;

  const underDeMinimis = currentYearFederalTax - federalWithholding < SAFE_HARBOR_DE_MINIMIS;
  const noPenaltyExpected = underDeMinimis || estimatedPaymentsNeeded === 0;

  return {
    currentYearFederalTax,
    ninetyPctCurrent,
    hasPriorYear,
    priorYearTax,
    priorYearMultiplier,
    priorYearSafeHarbor,
    requiredAnnualPayment,
    bindingTest,
    federalWithholding,
    estimatedPaymentsNeeded,
    perQuarter,
    underDeMinimis,
    noPenaltyExpected,
    isProjected: projection?.isProjected ?? false,
    projectionFactor: projection?.factor ?? 1,
  };
}

/** Per-platform earnings summary for the platform-comparison view. */
export interface PlatformStat {
  platform: GigPlatform;
  /** Gross pay + tips across this platform's entries. */
  totalEarnings: number;
  /** Non-mileage business expenses logged against this platform. */
  totalExpenses: number;
  /** totalEarnings − totalExpenses (can't go below earnings; expenses are always ≥ 0). */
  netEarnings: number;
  /** Hours worked across entries that have it set (entries without it contribute 0). */
  totalHours: number;
  entryCount: number;
  /** netEarnings / totalHours, or undefined when no hours are logged for this platform — the
   * headline "which platform pays better per hour" number. Pre-tax (taxes aren't platform-specific). */
  hourlyRate?: number;
}

/**
 * Aggregates a year's entries by platform into a ranked comparison — the data behind "is my
 * DoorDash hour worth more than my Uber hour?". Pure aggregation over existing Entry fields; no tax
 * math. Sorted by total earnings descending; only platforms with at least one entry appear.
 */
export function comparePlatforms(
  entries: Entry[],
  year: number = new Date().getFullYear()
): PlatformStat[] {
  const byPlatform = new Map<GigPlatform, PlatformStat>();

  for (const entry of entriesForYear(entries, year)) {
    const earnings = entry.grossPay + entry.tips;
    const expenses = totalEntryExpenses(entry);
    const existing = byPlatform.get(entry.platform);
    if (existing) {
      existing.totalEarnings += earnings;
      existing.totalExpenses += expenses;
      existing.netEarnings += earnings - expenses;
      existing.totalHours += entry.hoursWorked ?? 0;
      existing.entryCount += 1;
    } else {
      byPlatform.set(entry.platform, {
        platform: entry.platform,
        totalEarnings: earnings,
        totalExpenses: expenses,
        netEarnings: earnings - expenses,
        totalHours: entry.hoursWorked ?? 0,
        entryCount: 1,
      });
    }
  }

  const stats = Array.from(byPlatform.values());
  for (const stat of stats) {
    stat.hourlyRate = stat.totalHours > 0 ? stat.netEarnings / stat.totalHours : undefined;
  }
  return stats.sort((a, b) => b.totalEarnings - a.totalEarnings);
}

/**
 * A hypothetical full-year income picture for the What-if simulator. Phrased in the same
 * user-facing terms as the entry form (gross earnings + expenses), not the engine's net-profit
 * input — the screen pre-fills these from the year's actuals and the user tweaks them.
 */
export interface WhatIfScenario {
  /** Total gig earnings for the year (gross pay + tips), before expenses. */
  grossEarnings: number;
  /** Total non-mileage business expenses for the year. */
  businessExpenses: number;
  /** Total business miles for the year (deducted via the standard mileage rate). */
  businessMiles: number;
  /** Total hours worked for the year — powers the effective-hourly-rate comparison; 0 if unknown. */
  hoursWorked: number;
}

/** Turns a What-if scenario into the same aggregate shape aggregateEntries produces. Net profit can
 * go negative (expenses above earnings); the engine floors it, matching how real entries behave. */
export function whatIfAggregate(scenario: WhatIfScenario): EntryAggregate {
  return {
    netSelfEmploymentProfit: scenario.grossEarnings - scenario.businessExpenses,
    businessMiles: scenario.businessMiles,
    totalExpenses: scenario.businessExpenses,
    totalHoursWorked: scenario.hoursWorked,
  };
}

/**
 * Runs a hypothetical scenario through the real tax pipeline against the current profile — the
 * engine behind the What-if simulator. Reuses estimateFromAggregate so the projected numbers are
 * computed identically to the dashboard's, just from made-up inputs.
 */
export function computeWhatIfEstimate(
  taxProfile: TaxProfile,
  scenario: WhatIfScenario,
  year: number = new Date().getFullYear()
): TaxEstimateForYear {
  return estimateFromAggregate(whatIfAggregate(scenario), taxProfile, year);
}

/** A single tax year's headline figures, the row behind the year-over-year comparison. */
export interface YearSummary {
  year: number;
  /** Gross gig earnings (grossPay + tips) before expenses, across the year's entries. */
  grossEarnings: number;
  /** Net self-employment profit — grossEarnings minus non-mileage business expenses. */
  netProfit: number;
  /** Non-mileage business expenses (the four buckets + custom categories). */
  totalExpenses: number;
  businessMiles: number;
  /** Hours worked across entries that logged them (entries without hours contribute 0). */
  totalHoursWorked: number;
  entryCount: number;
  /** Total estimated tax for the year (the engine's combined federal + state figure, before the
   *  W2-withholding credit — the comparable "what this year's gig work generated" number). */
  estimatedTax: number;
  /** Take-home per hour, or undefined when no hours were logged for the year (matches
   *  effectiveHourlyRate's contract — no hours means no rate, not zero). */
  effectiveHourlyRate?: number;
  /** The user's actual filed FEDERAL total tax for this year (Form 1040 "total tax"), if they
   *  entered it via the safe-harbor screen's prior-year input. Undefined when not provided. Kept
   *  separate from `estimatedTax` (which is the app's combined federal+state estimate) rather than
   *  folded into it — comparing a federal-only filed figure against a federal+state estimate would
   *  mislead, so the UI surfaces this as a labeled "actual outcome" line, not a delta. */
  filedFederalTax?: number;
}

/**
 * Summarizes one calendar year's logged entries into the figures the year-over-year view compares.
 * Reuses the same aggregate → estimate pipeline as the dashboard (via estimateFromAggregate) so a
 * year's numbers here match what that year's dashboard showed, rather than a drift-prone parallel.
 */
export function summarizeYear(
  entries: Entry[],
  taxProfile: TaxProfile,
  year: number
): YearSummary {
  const yearEntries = entriesForYear(entries, year);
  const aggregate = aggregateEntries(yearEntries);
  const grossEarnings = aggregate.netSelfEmploymentProfit + aggregate.totalExpenses;
  const { estimate, netAmountToSetAside } = estimateFromAggregate(aggregate, taxProfile, year);
  return {
    year,
    grossEarnings,
    netProfit: aggregate.netSelfEmploymentProfit,
    totalExpenses: aggregate.totalExpenses,
    businessMiles: aggregate.businessMiles,
    totalHoursWorked: aggregate.totalHoursWorked,
    entryCount: yearEntries.length,
    estimatedTax: estimate.totalEstimatedTax,
    effectiveHourlyRate: effectiveHourlyRate(
      grossEarnings,
      aggregate.totalExpenses,
      netAmountToSetAside,
      aggregate.totalHoursWorked
    ),
    filedFederalTax: taxProfile.filedTaxByYear?.[year]?.totalTax,
  };
}

/** Year-over-year insights: a per-year summary for every year with logged data, most recent first. */
export interface YearOverYearInsights {
  /** True once there are 2+ tax years of logged data — the soft gate. Below that a comparison is
   *  meaningless, so the UI shows a "come back next year" state rather than a near-empty screen. */
  hasEnoughData: boolean;
  yearsTracked: number;
  /** One summary per year with entries, sorted descending (summaries[0] is the most recent). */
  summaries: YearSummary[];
}

/**
 * Builds the year-over-year comparison from all logged entries. Pure aggregation over the existing
 * multi-year entry history — the app already retains entries across tax years, so no new storage is
 * needed. Soft-gated at 2+ years (hasEnoughData): with a single year there's nothing to compare to.
 */
export function computeYearOverYear(
  entries: Entry[],
  taxProfile: TaxProfile
): YearOverYearInsights {
  const years = yearsWithEntries(entries); // descending, distinct
  const summaries = years.map((year) => summarizeYear(entries, taxProfile, year));
  return {
    hasEnoughData: years.length >= 2,
    yearsTracked: years.length,
    summaries,
  };
}

/** The change in one metric between two years, for the year-over-year comparison rows. */
export interface MetricDelta {
  current: number;
  prior: number;
  /** current − prior. */
  change: number;
  /** Fractional change (0.25 = +25%), or undefined when prior is 0 — you can't take a percentage of
   *  nothing, so the UI shows a "new" treatment instead of a divide-by-zero infinity. */
  percentChange?: number;
}

/** Computes the delta between a current- and prior-year metric value. Pure. */
export function metricDelta(current: number, prior: number): MetricDelta {
  const change = current - prior;
  return {
    current,
    prior,
    change,
    percentChange: prior !== 0 ? change / prior : undefined,
  };
}

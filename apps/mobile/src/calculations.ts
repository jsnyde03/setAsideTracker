import {
  estimateTax,
  currentTaxYear,
  taxYearConfigs,
  type TaxEstimateResult,
} from "@gig-tax-tracker/tax-engine";
import type { Entry, PayFrequency, TaxProfile } from "./types";
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

function totalEntryExpenses(entry: Entry): number {
  return entry.expenses.parking + entry.expenses.tolls + entry.expenses.supplies + entry.expenses.phone;
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
 * supplies, phone). Mileage is handled separately by the tax engine via the standard mileage
 * rate, not as a dollar expense here.
 */
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
  const aggregate = aggregateEntries(entriesForYear(entries, year));
  const config = taxYearConfigs[year] ?? currentTaxYear;

  const w2Active = taxProfile.hasW2Job && w2JobActiveDuringYear(year, taxProfile.w2EndDate);
  const { w2FicaWages, w2FederalTaxableIncome } = deriveW2Incomes(taxProfile, w2Active);

  const estimate = estimateTax(
    {
      filingStatus: taxProfile.filingStatus,
      netSelfEmploymentProfit: aggregate.netSelfEmploymentProfit,
      businessMiles: aggregate.businessMiles,
      otherTaxableIncome: w2FederalTaxableIncome,
      otherFicaWages: w2FicaWages,
      stateCode: taxProfile.state,
      county: taxProfile.county,
      // Simplification: treats every declared dependent as a CTC-qualifying child — see the
      // caveat on TaxEstimateInput.numberOfChildren in the tax-engine.
      numberOfChildren: taxProfile.dependents,
    },
    config
  );

  // Withholding credit — how much W2 employer withholding will cover this year's tax bill.
  // The old approach (prorate by elapsed time) was wrong: it implied the user owed the
  // "not-yet-withheld" portion themselves, when future paychecks will withhold it automatically.
  //
  // Correct approach:
  // - If YTD actuals are available: ytdActual (already withheld) + model estimate for remaining
  //   pay periods (1 - elapsedFraction of the annual estimate).
  // - Otherwise: credit the full annual estimate — the gap between gig income tax and $0 is
  //   what the user actually needs to set aside, not a partial-year proration.
  let w2WithholdingYtdEstimate = 0;
  if (w2Active) {
    const annualEstimate = estimate.w2WithholdingEstimate.annualTotalEstimate;
    const hasYtdActuals =
      taxProfile.w2YtdFederalWithheld !== undefined || taxProfile.w2YtdStateWithheld !== undefined;
    if (hasYtdActuals) {
      const ytdActual = (taxProfile.w2YtdFederalWithheld ?? 0) + (taxProfile.w2YtdStateWithheld ?? 0);
      const elapsedFraction = w2WithholdingYearFraction(year, taxProfile.w2EndDate);
      w2WithholdingYtdEstimate = ytdActual + annualEstimate * Math.max(0, 1 - elapsedFraction);
    } else {
      w2WithholdingYtdEstimate = annualEstimate;
    }
  }

  const netAmountToSetAside = Math.max(0, estimate.totalEstimatedTax - w2WithholdingYtdEstimate);

  return {
    estimate,
    year,
    usedFallbackConfig: !taxYearConfigs[year],
    w2WithholdingYtdEstimate,
    netAmountToSetAside,
  };
}

import {
  estimateTax,
  currentTaxYear,
  taxYearConfigs,
  type TaxEstimateResult,
} from "@gig-tax-tracker/tax-engine";
import type { Entry, PayFrequency, TaxProfile } from "./types";

export interface EntryAggregate {
  netSelfEmploymentProfit: number;
  businessMiles: number;
  totalExpenses: number;
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
 * Fraction (0–1) of a W2 job's active period within `year` that has elapsed as of `now`. The
 * active period runs from Jan 1 of `year` through `w2EndDate` if it falls within `year`,
 * otherwise through Dec 31. A job that ends before today is fully elapsed (1); one that hasn't
 * started relative to `now` is 0 (not a real scenario here, but keeps the function well-defined).
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
      };
    },
    { netSelfEmploymentProfit: 0, businessMiles: 0, totalExpenses: 0 }
  );
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
  const w2Income = w2Active ? taxProfile.estimatedW2Income : 0;

  const estimate = estimateTax(
    {
      filingStatus: taxProfile.filingStatus,
      netSelfEmploymentProfit: aggregate.netSelfEmploymentProfit,
      businessMiles: aggregate.businessMiles,
      otherTaxableIncome: w2Income,
      stateCode: taxProfile.state,
      county: taxProfile.county,
      // Simplification: treats every declared dependent as a CTC-qualifying child — see the
      // caveat on TaxEstimateInput.numberOfChildren in the tax-engine.
      numberOfChildren: taxProfile.dependents,
    },
    config
  );

  const w2Fraction = w2Active ? w2WithholdingYearFraction(year, taxProfile.w2EndDate) : 0;
  const w2WithholdingYtdEstimate = estimate.w2WithholdingEstimate.annualTotalEstimate * w2Fraction;
  const netAmountToSetAside = Math.max(0, estimate.totalEstimatedTax - w2WithholdingYtdEstimate);

  return {
    estimate,
    year,
    usedFallbackConfig: !taxYearConfigs[year],
    w2WithholdingYtdEstimate,
    netAmountToSetAside,
  };
}

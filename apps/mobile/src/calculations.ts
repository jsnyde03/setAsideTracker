import {
  estimateTax,
  currentTaxYear,
  taxYearConfigs,
  type TaxEstimateResult,
} from "@gig-tax-tracker/tax-engine";
import type { Entry, TaxProfile } from "./types";

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

  const estimate = estimateTax(
    {
      filingStatus: taxProfile.filingStatus,
      netSelfEmploymentProfit: aggregate.netSelfEmploymentProfit,
      businessMiles: aggregate.businessMiles,
      otherTaxableIncome: taxProfile.hasW2Job ? taxProfile.estimatedW2Income : 0,
      stateCode: taxProfile.state,
      county: taxProfile.county,
      // Simplification: treats every declared dependent as a CTC-qualifying child — see the
      // caveat on TaxEstimateInput.numberOfChildren in the tax-engine.
      numberOfChildren: taxProfile.dependents,
    },
    config
  );

  return { estimate, year, usedFallbackConfig: !taxYearConfigs[year] };
}

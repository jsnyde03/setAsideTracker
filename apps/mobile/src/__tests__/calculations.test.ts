import { describe, expect, it } from "vitest";
import { estimateTax, currentTaxYear } from "@gig-tax-tracker/tax-engine";
import {
  aggregateEntries,
  annualIncomeFromPaycheck,
  computeTaxEstimate,
  entriesForYear,
  getCountiesForState,
  w2WithholdingYearFraction,
  yearsWithEntries,
} from "../calculations";
import type { Entry, TaxProfile } from "../types";

const thisYear = new Date().getFullYear();

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    platform: "amazonFlex",
    date: `${thisYear}-01-15`,
    grossPay: 100,
    tips: 10,
    mileage: 20,
    expenses: { parking: 0, tolls: 0, supplies: 0, phone: 0 },
    createdAt: `${thisYear}-01-15T00:00:00.000Z`,
    ...overrides,
  };
}

describe("aggregateEntries", () => {
  it("sums gross pay + tips and mileage across entries", () => {
    const entries = [
      makeEntry({ id: "e1", grossPay: 100, tips: 10, mileage: 20 }),
      makeEntry({ id: "e2", grossPay: 50, tips: 5, mileage: 10 }),
    ];

    const result = aggregateEntries(entries);
    expect(result.netSelfEmploymentProfit).toBe(165);
    expect(result.businessMiles).toBe(30);
  });

  it("returns zeros for no entries", () => {
    const result = aggregateEntries([]);
    expect(result.netSelfEmploymentProfit).toBe(0);
    expect(result.businessMiles).toBe(0);
    expect(result.totalExpenses).toBe(0);
  });

  it("subtracts non-mileage expenses (parking, tolls, supplies, phone) from net SE profit", () => {
    const entries = [
      makeEntry({
        grossPay: 200,
        tips: 0,
        mileage: 10,
        expenses: { parking: 5, tolls: 3, supplies: 12, phone: 8 },
      }),
    ];

    const result = aggregateEntries(entries);
    expect(result.totalExpenses).toBe(28);
    expect(result.netSelfEmploymentProfit).toBe(200 - 28);
    // Mileage isn't a dollar expense here — it's handled separately via the standard mileage rate.
    expect(result.businessMiles).toBe(10);
  });
});

describe("computeTaxEstimate", () => {
  const baseTaxProfile: TaxProfile = {
    filingStatus: "single",
    dependents: 0,
    hasW2Job: false,
    estimatedW2Income: 0,
    state: "CA",
  };

  it("feeds aggregated entries into the tax engine using the current tax year config", () => {
    const entries = [
      makeEntry({ id: "e1", grossPay: 700, tips: 50, mileage: 300 }),
      makeEntry({ id: "e2", grossPay: 50000, tips: 0, mileage: 700 }),
    ];
    const result = computeTaxEstimate(entries, baseTaxProfile);

    // Don't hardcode IRS dollar amounts here (that's covered by tax-engine's own
    // year-specific tests) — just verify the aggregation -> engine wiring is correct
    // by comparing against a direct estimateTax call with the same aggregated inputs.
    const expected = estimateTax(
      {
        filingStatus: baseTaxProfile.filingStatus,
        netSelfEmploymentProfit: 50750,
        businessMiles: 1000,
        otherTaxableIncome: 0,
        stateCode: baseTaxProfile.state,
      },
      currentTaxYear
    );

    expect(result.estimate.totalEstimatedTax).toBeCloseTo(expected.totalEstimatedTax, 6);
    expect(result.estimate.netProfitAfterMileage).toBeCloseTo(expected.netProfitAfterMileage, 6);
    expect(result.estimate.taxYear).toBe(currentTaxYear.year);
    expect(result.year).toBe(thisYear);
  });

  it("includes W2 income as other taxable income when hasW2Job is true", () => {
    const entries = [makeEntry({ grossPay: 20000, tips: 0, mileage: 0 })];
    const withW2 = computeTaxEstimate(entries, {
      ...baseTaxProfile,
      hasW2Job: true,
      estimatedW2Income: 40000,
    });
    const withoutW2 = computeTaxEstimate(entries, baseTaxProfile);

    expect(withW2.estimate.federalIncomeTax.taxableIncome).toBeGreaterThan(
      withoutW2.estimate.federalIncomeTax.taxableIncome
    );
  });

  it("credits estimated W2 withholding against the net amount to set aside", () => {
    const entries = [makeEntry({ grossPay: 80000, tips: 0, mileage: 0 })];
    const withW2 = computeTaxEstimate(entries, {
      ...baseTaxProfile,
      hasW2Job: true,
      estimatedW2Income: 50000,
    });

    expect(withW2.w2WithholdingYtdEstimate).toBeGreaterThan(0);
    expect(withW2.netAmountToSetAside).toBeLessThan(withW2.estimate.totalEstimatedTax);
    expect(withW2.netAmountToSetAside).toBeCloseTo(
      withW2.estimate.totalEstimatedTax - withW2.w2WithholdingYtdEstimate,
      6
    );
  });

  it("never produces a negative netAmountToSetAside even if withholding would exceed it", () => {
    const entries = [makeEntry({ grossPay: 100, tips: 0, mileage: 0 })];
    const result = computeTaxEstimate(entries, {
      ...baseTaxProfile,
      hasW2Job: true,
      estimatedW2Income: 200000,
    });
    expect(result.netAmountToSetAside).toBeGreaterThanOrEqual(0);
  });

  it("leaves netAmountToSetAside equal to the gross total when there's no W2 job", () => {
    const entries = [makeEntry({ grossPay: 50000, tips: 0, mileage: 0 })];
    const result = computeTaxEstimate(entries, baseTaxProfile);
    expect(result.w2WithholdingYtdEstimate).toBe(0);
    expect(result.netAmountToSetAside).toBe(result.estimate.totalEstimatedTax);
  });

  it("zeroes out W2 income/withholding entirely when the job ended in a prior tax year", () => {
    const entries = [makeEntry({ grossPay: 50000, tips: 0, mileage: 0 })];
    const result = computeTaxEstimate(
      entries,
      { ...baseTaxProfile, hasW2Job: true, estimatedW2Income: 50000, w2EndDate: `${thisYear - 1}-06-15` },
      thisYear
    );
    expect(result.w2WithholdingYtdEstimate).toBe(0);
    expect(result.estimate.federalIncomeTax.taxableIncome).toBeLessThan(50000 + 50000);
  });

  it("returns zero estimate for no entries", () => {
    const result = computeTaxEstimate([], baseTaxProfile);
    expect(result.estimate.totalEstimatedTax).toBe(0);
  });

  it("uses the tax profile's state to compute state tax (CA owes more than FL on the same income)", () => {
    const entries = [makeEntry({ grossPay: 60000, tips: 0, mileage: 0 })];

    const ca = computeTaxEstimate(entries, { ...baseTaxProfile, state: "CA" });
    const fl = computeTaxEstimate(entries, { ...baseTaxProfile, state: "FL" });

    expect(ca.estimate.stateTax.supported).toBe(true);
    expect(fl.estimate.stateTax.supported).toBe(true);
    expect(ca.estimate.stateTax.stateTax).toBeGreaterThan(0);
    expect(fl.estimate.stateTax.stateTax).toBe(0);
    expect(ca.estimate.totalEstimatedTax).toBeGreaterThan(fl.estimate.totalEstimatedTax);
  });

  it("flags unsupported jurisdictions rather than silently treating them as zero-tax", () => {
    // All 50 states + DC are covered now — use a real US territory that genuinely isn't modeled.
    const entries = [makeEntry({ grossPay: 60000, tips: 0, mileage: 0 })];
    const result = computeTaxEstimate(entries, { ...baseTaxProfile, state: "PR" });

    expect(result.estimate.stateTax.supported).toBe(false);
  });

  it("reduces the tax estimate when expenses are logged against an entry", () => {
    const withoutExpenses = computeTaxEstimate(
      [makeEntry({ grossPay: 60000, tips: 0, mileage: 0 })],
      baseTaxProfile
    );
    const withExpenses = computeTaxEstimate(
      [
        makeEntry({
          grossPay: 60000,
          tips: 0,
          mileage: 0,
          expenses: { parking: 200, tolls: 100, supplies: 500, phone: 300 },
        }),
      ],
      baseTaxProfile
    );

    expect(withExpenses.estimate.netProfitAfterMileage).toBeCloseTo(
      withoutExpenses.estimate.netProfitAfterMileage - 1100,
      2
    );
    expect(withExpenses.estimate.totalEstimatedTax).toBeLessThan(
      withoutExpenses.estimate.totalEstimatedTax
    );
  });

  it("passes the tax profile's dependents through as Child Tax Credit-qualifying children (previously dead data)", () => {
    const entries = [makeEntry({ grossPay: 80000, tips: 0, mileage: 0 })];

    const noDependents = computeTaxEstimate(entries, { ...baseTaxProfile, dependents: 0 });
    const twoDependents = computeTaxEstimate(entries, { ...baseTaxProfile, dependents: 2 });

    expect(twoDependents.estimate.childTaxCredit.numberOfChildren).toBe(2);
    expect(twoDependents.estimate.childTaxCredit.totalCredit).toBeGreaterThan(0);
    expect(twoDependents.estimate.totalEstimatedTax).toBeLessThan(noDependents.estimate.totalEstimatedTax);
  });

  it("includes Maryland county piggyback tax when a county is set", () => {
    const entries = [makeEntry({ grossPay: 60000, tips: 0, mileage: 0 })];

    const withCounty = computeTaxEstimate(entries, {
      ...baseTaxProfile,
      state: "MD",
      county: "Montgomery County",
    });
    const withoutCounty = computeTaxEstimate(entries, { ...baseTaxProfile, state: "MD" });

    expect(withCounty.estimate.stateTax.localTaxSupported).toBe(true);
    expect(withCounty.estimate.stateTax.localTax).toBeGreaterThan(0);
    expect(withoutCounty.estimate.stateTax.localTaxSupported).toBe(false);
    expect(withCounty.estimate.totalEstimatedTax).toBeGreaterThan(
      withoutCounty.estimate.totalEstimatedTax
    );
  });

  it("excludes entries from other years from the estimate (the tax-year-scoping fix)", () => {
    const thisYearEntry = makeEntry({ id: "e1", grossPay: 1000, tips: 0, mileage: 0 });
    const lastYearEntry = makeEntry({
      id: "e2",
      date: `${thisYear - 1}-12-31`,
      grossPay: 99999,
      tips: 0,
      mileage: 0,
    });

    const onlyThisYear = computeTaxEstimate([thisYearEntry], baseTaxProfile, thisYear);
    const mixedYears = computeTaxEstimate([thisYearEntry, lastYearEntry], baseTaxProfile, thisYear);

    // The huge prior-year entry must not leak into this year's estimate at all.
    expect(mixedYears.estimate.totalEstimatedTax).toBeCloseTo(
      onlyThisYear.estimate.totalEstimatedTax,
      6
    );
  });

  it("falls back to the current tax year config and flags it when no config exists for the requested year", () => {
    const farFutureYear = 2099;
    const entries = [makeEntry({ date: `${farFutureYear}-03-01`, grossPay: 1000, tips: 0, mileage: 0 })];

    const result = computeTaxEstimate(entries, baseTaxProfile, farFutureYear);

    expect(result.usedFallbackConfig).toBe(true);
    expect(result.year).toBe(farFutureYear);
    expect(result.estimate.taxYear).toBe(currentTaxYear.year);
  });

  it("does not use a fallback config for a year that has one", () => {
    const result = computeTaxEstimate(
      [makeEntry({ date: "2025-06-01", grossPay: 1000, tips: 0, mileage: 0 })],
      baseTaxProfile,
      2025
    );

    expect(result.usedFallbackConfig).toBe(false);
    expect(result.estimate.taxYear).toBe(2025);
  });
});

describe("annualIncomeFromPaycheck", () => {
  it("converts each pay frequency to its annual equivalent", () => {
    expect(annualIncomeFromPaycheck(1000, "weekly")).toBe(52000);
    expect(annualIncomeFromPaycheck(2000, "biweekly")).toBe(52000);
    expect(annualIncomeFromPaycheck(2166.67, "semimonthly")).toBeCloseTo(52000.08, 2);
    expect(annualIncomeFromPaycheck(4333.33, "monthly")).toBeCloseTo(51999.96, 2);
  });

  it("returns 0 for a 0 paycheck amount", () => {
    expect(annualIncomeFromPaycheck(0, "weekly")).toBe(0);
  });
});

describe("w2WithholdingYearFraction", () => {
  it("returns 0 before the year starts and 1 once the year (or end date) has fully passed", () => {
    expect(w2WithholdingYearFraction(2026, undefined, new Date(2025, 11, 1))).toBe(0);
    expect(w2WithholdingYearFraction(2026, undefined, new Date(2027, 0, 5))).toBe(1);
  });

  it("returns a fraction partway through the year with no end date", () => {
    // July 2 is roughly the midpoint of a year.
    const fraction = w2WithholdingYearFraction(2026, undefined, new Date(2026, 6, 2));
    expect(fraction).toBeGreaterThan(0.45);
    expect(fraction).toBeLessThan(0.55);
  });

  it("reaches 1 right after the job's end date, not at year-end, when an end date is set", () => {
    const justAfterEnd = w2WithholdingYearFraction(2026, "2026-03-01", new Date(2026, 2, 2));
    expect(justAfterEnd).toBe(1);
    // And it stays at 1 for the rest of the year — once the job's done, it's done.
    const muchLater = w2WithholdingYearFraction(2026, "2026-03-01", new Date(2026, 10, 1));
    expect(muchLater).toBe(1);
  });

  it("returns 0 when the end date falls before the year even starts", () => {
    expect(w2WithholdingYearFraction(2026, "2025-06-15", new Date(2026, 6, 1))).toBe(0);
  });
});

describe("entriesForYear", () => {
  it("keeps only entries dated within the given year", () => {
    const entries = [
      makeEntry({ id: "e1", date: "2025-03-01" }),
      makeEntry({ id: "e2", date: "2026-01-01" }),
      makeEntry({ id: "e3", date: "2026-12-31" }),
    ];

    const result = entriesForYear(entries, 2026);
    expect(result.map((e) => e.id)).toEqual(["e2", "e3"]);
  });
});

describe("yearsWithEntries", () => {
  it("returns distinct years present, most recent first", () => {
    const entries = [
      makeEntry({ id: "e1", date: "2025-03-01" }),
      makeEntry({ id: "e2", date: "2026-01-01" }),
      makeEntry({ id: "e3", date: "2025-12-31" }),
    ];

    expect(yearsWithEntries(entries)).toEqual([2026, 2025]);
  });

  it("returns an empty array for no entries", () => {
    expect(yearsWithEntries([])).toEqual([]);
  });
});

describe("getCountiesForState", () => {
  it("returns MD's county list, including the tiered counties", () => {
    const counties = getCountiesForState("MD");
    expect(counties).toContain("Montgomery County");
    expect(counties).toContain("Anne Arundel County");
    expect(counties).toContain("Nonresident");
  });

  it("returns undefined for states with no local tax layer", () => {
    expect(getCountiesForState("CA")).toBeUndefined();
    expect(getCountiesForState("TX")).toBeUndefined();
  });

  it("returns undefined for unsupported jurisdictions", () => {
    // All 50 states + DC are covered now — use a real US territory that genuinely isn't modeled.
    expect(getCountiesForState("PR")).toBeUndefined();
  });
});

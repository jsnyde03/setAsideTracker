import { describe, expect, it } from "vitest";
import { estimateTax, currentTaxYear } from "@gig-tax-tracker/tax-engine";
import {
  aggregateEntries,
  annualIncomeFromPaycheck,
  comparePlatforms,
  computeCatchUpStatus,
  computeSafeHarbor,
  computeTaxEstimate,
  computeW4Optimization,
  computeWhatIfEstimate,
  computeYearOverYear,
  effectiveHourlyRate,
  entriesForYear,
  getCountiesForState,
  metricDelta,
  summarizeYear,
  w2WithholdingYearFraction,
  whatIfAggregate,
  yearsWithEntries,
} from "../calculations";
import type { QuarterlyDueDate } from "../notifications/quarterlyDueDates";
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
    expect(result.totalHoursWorked).toBe(0);
  });

  it("sums hoursWorked across entries, treating entries without it as 0", () => {
    const entries = [
      makeEntry({ id: "e1", hoursWorked: 5 }),
      makeEntry({ id: "e2", hoursWorked: 3.5 }),
      makeEntry({ id: "e3" }), // no hoursWorked set
    ];
    expect(aggregateEntries(entries).totalHoursWorked).toBe(8.5);
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

  it("includes custom expense categories in the non-mileage expense total", () => {
    const entries = [
      makeEntry({
        grossPay: 200,
        tips: 0,
        expenses: { parking: 5, tolls: 0, supplies: 0, phone: 0 },
        customExpenses: [
          { label: "Car wash", amount: 10 },
          { label: "Hot bags", amount: 15 },
        ],
      }),
    ];

    const result = aggregateEntries(entries);
    expect(result.totalExpenses).toBe(30); // 5 parking + 10 + 15 custom
    expect(result.netSelfEmploymentProfit).toBe(200 - 30);
  });
});

describe("computeTaxEstimate", () => {
  const baseTaxProfile: TaxProfile = {
    filingStatus: "single",
    dependents: 0,
    hasW2Job: false,
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
      w2GrossPayPerPeriod: 40000 / 12,
      w2PayFrequency: "monthly",
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
      w2GrossPayPerPeriod: 50000 / 12,
      w2PayFrequency: "monthly",
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
      w2GrossPayPerPeriod: 200000 / 12,
      w2PayFrequency: "monthly",
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
      { ...baseTaxProfile, hasW2Job: true, w2GrossPayPerPeriod: 50000 / 12, w2PayFrequency: "monthly", w2EndDate: `${thisYear - 1}-06-15` },
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

  // ── W2 rebuild: YTD actuals withholding path ──────────────────────────────────────────────────

  it("YTD actuals from pay stub: adds modeled remaining withholding to the YTD amount when job is ongoing", () => {
    // No end date → job runs to year-end → elapsedFraction is between 0 and 1 → model remainder > 0
    // So w2WithholdingYtdEstimate = ytdActual + annualEstimate × (1 − elapsedFraction) > ytdActual
    const entries = [makeEntry({ grossPay: 50000, tips: 0, mileage: 0 })];
    const ytdFederal = 3000;
    const ytdState = 500;

    const withYtd = computeTaxEstimate(entries, {
      ...baseTaxProfile,
      hasW2Job: true,
      w2GrossPayPerPeriod: 4000,
      w2PayFrequency: "biweekly",
      w2YtdFederalWithheld: ytdFederal,
      w2YtdStateWithheld: ytdState,
    });
    const withoutYtd = computeTaxEstimate(entries, {
      ...baseTaxProfile,
      hasW2Job: true,
      w2GrossPayPerPeriod: 4000,
      w2PayFrequency: "biweekly",
    });

    // Without YTD actuals → full annual model estimate is the withholding credit
    expect(withoutYtd.w2WithholdingYtdEstimate).toBeCloseTo(
      withoutYtd.estimate.w2WithholdingEstimate.annualTotalEstimate, 6
    );
    // With YTD actuals + ongoing job → ytdActual + model remainder; must exceed ytdActual alone
    expect(withYtd.w2WithholdingYtdEstimate).toBeGreaterThan(ytdFederal + ytdState);
    expect(withYtd.netAmountToSetAside).toBeGreaterThanOrEqual(0);
  });

  it("YTD actuals: no model remainder when W2 job ended earlier in the current year (elapsed fraction = 1)", () => {
    // Job ended Jan 15 of this year — well before today, so elapsedFraction = 1 and
    // annualEstimate × (1 − 1) = 0. w2WithholdingYtdEstimate equals only the YTD actuals.
    const entries = [makeEntry({ grossPay: 50000, tips: 0, mileage: 0 })];
    const ytdFederal = 4500;
    const ytdState = 800;

    const result = computeTaxEstimate(entries, {
      ...baseTaxProfile,
      hasW2Job: true,
      w2GrossPayPerPeriod: 4000,
      w2PayFrequency: "biweekly",
      w2EndDate: `${thisYear}-01-15`, // ended Jan 15 — today (well into the year) is past this date
      w2YtdFederalWithheld: ytdFederal,
      w2YtdStateWithheld: ytdState,
    });

    expect(result.w2WithholdingYtdEstimate).toBeCloseTo(ytdFederal + ytdState, 2);
  });

  // ── W2 rebuild: 401k vs pretax benefits — FICA wage distinction ───────────────────────────────

  it("w2RetirementPerPeriod reduces W2 federal taxable income by periods × contribution (2026 SS base check)", () => {
    // A moderate W2 gross ($3k/biweekly = $78k/year) where FICA wages stay well below the
    // SS base regardless. Both retirement and pretax benefits reduce federal taxable income by the
    // same amount, but only benefits reduce FICA wages. At this income level the FICA distinction
    // doesn't change SE SS tax (base is far from exhausted), so the test focuses on the income-tax
    // reduction: taxableIncome must drop by exactly (retirement × 26 biweekly periods).
    const entries = [makeEntry({ date: `${thisYear}-06-01`, grossPay: 20000, tips: 0, mileage: 0 })];
    const gross = 3000;
    const retirement = 500;

    const noRetirement = computeTaxEstimate(entries, {
      ...baseTaxProfile,
      state: "TX",
      hasW2Job: true,
      w2GrossPayPerPeriod: gross,
      w2PayFrequency: "biweekly",
    });
    const with401k = computeTaxEstimate(entries, {
      ...baseTaxProfile,
      state: "TX",
      hasW2Job: true,
      w2GrossPayPerPeriod: gross,
      w2RetirementPerPeriod: retirement,
      w2PayFrequency: "biweekly",
    });

    // 401k reduces annual W2 taxable income by $500 × 26 = $13,000
    expect(with401k.estimate.federalIncomeTax.taxableIncome).toBeCloseTo(
      noRetirement.estimate.federalIncomeTax.taxableIncome - retirement * 26, 2
    );
    // But FICA wages are unchanged → SE SS and Medicare tax are unaffected
    expect(with401k.estimate.seTax.socialSecurityTax).toBeCloseTo(
      noRetirement.estimate.seTax.socialSecurityTax, 6
    );
    expect(with401k.estimate.seTax.medicareTax).toBeCloseTo(
      noRetirement.estimate.seTax.medicareTax, 6
    );
  });

  it("401k vs pretax benefits: different FICA wages — only 401k exhausts the SS base for SE earnings (2026)", () => {
    // Pin to 2026 (SS wage base = $184,500). W2 gross: $8k/biweekly = $208k/year (above base).
    // 401k $1k/period = $26k/year:          FICA wages = $208k (above $184.5k) → SS base exhausted
    //   by W2 alone → SE social security tax = $0.
    // Pretax benefits $1k/period = $26k/yr: FICA wages = $182k (below $184.5k) → $2.5k SS base
    //   remains; SE net earnings ($18,470) > $2.5k → SS on all $2,500 = $310.
    //
    // Secondary effect (correct, not a bug): 401k's higher FICA wages exhaust more of the AMT
    // threshold too, triggering more non-deductible AMT on SE earnings and raising AGI in the
    // 401k case — so federal taxable income ends up HIGHER with 401k than with benefits.
    const entries = [makeEntry({ date: "2026-06-01", grossPay: 20000, tips: 0, mileage: 0 })];
    const base = {
      ...baseTaxProfile,
      state: "TX",
      hasW2Job: true,
      w2GrossPayPerPeriod: 8000,
      w2PayFrequency: "biweekly" as const,
    };

    const with401k = computeTaxEstimate(entries, { ...base, w2RetirementPerPeriod: 1000 }, 2026);
    const withBenefits = computeTaxEstimate(entries, { ...base, w2PreTaxBenefitsPerPeriod: 1000 }, 2026);

    // 401k: W2 FICA wages = $208k > SS base $184.5k → SE SS tax = $0
    expect(with401k.estimate.seTax.socialSecurityTax).toBeCloseTo(0, 2);
    // Pretax benefits: W2 FICA wages = $182k < SS base $184.5k → $2,500 available → SE SS = $310
    expect(withBenefits.estimate.seTax.socialSecurityTax).toBeCloseTo(2500 * 0.124, 2);
    // Benefits case has more deductible SE tax → lower AGI → lower federal taxable income
    expect(withBenefits.estimate.federalIncomeTax.taxableIncome).toBeLessThan(
      with401k.estimate.federalIncomeTax.taxableIncome
    );
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

describe("metricDelta", () => {
  it("computes absolute and percent change", () => {
    const delta = metricDelta(1250, 1000);
    expect(delta.change).toBe(250);
    expect(delta.percentChange).toBeCloseTo(0.25);
  });

  it("reports a negative change for a decrease", () => {
    const delta = metricDelta(800, 1000);
    expect(delta.change).toBe(-200);
    expect(delta.percentChange).toBeCloseTo(-0.2);
  });

  it("leaves percentChange undefined when the prior value is 0 (no dividing by nothing)", () => {
    const delta = metricDelta(500, 0);
    expect(delta.change).toBe(500);
    expect(delta.percentChange).toBeUndefined();
  });
});

describe("summarizeYear", () => {
  const profile: TaxProfile = { filingStatus: "single", dependents: 0, hasW2Job: false, state: "TX" };

  it("scopes to the year and derives gross earnings, profit, and expenses", () => {
    const entries = [
      makeEntry({
        id: "a",
        date: "2025-04-01",
        grossPay: 1000,
        tips: 200,
        mileage: 50,
        hoursWorked: 10,
        expenses: { parking: 100, tolls: 0, supplies: 0, phone: 0 },
      }),
      makeEntry({ id: "b", date: "2026-04-01", grossPay: 9999, tips: 0, mileage: 0 }), // other year — excluded
    ];

    const summary = summarizeYear(entries, profile, 2025);
    expect(summary.year).toBe(2025);
    expect(summary.entryCount).toBe(1);
    expect(summary.grossEarnings).toBe(1200); // gross + tips
    expect(summary.netProfit).toBe(1100); // minus $100 expenses
    expect(summary.totalExpenses).toBe(100);
    expect(summary.businessMiles).toBe(50);
    expect(summary.totalHoursWorked).toBe(10);
    expect(summary.effectiveHourlyRate).toBeGreaterThan(0);
  });

  it("leaves the hourly rate undefined when no hours were logged", () => {
    const entries = [makeEntry({ date: "2025-04-01", grossPay: 1000, tips: 0, mileage: 0 })];
    expect(summarizeYear(entries, profile, 2025).effectiveHourlyRate).toBeUndefined();
  });

  it("surfaces the filed federal tax for the year when the user entered it, else undefined", () => {
    const entries = [makeEntry({ date: "2025-04-01", grossPay: 1000, tips: 0, mileage: 0 })];
    // No filed figure on record → undefined (not folded into the combined estimatedTax).
    expect(summarizeYear(entries, profile, 2025).filedFederalTax).toBeUndefined();

    const withFiled: TaxProfile = { ...profile, filedTaxByYear: { 2025: { totalTax: 3400 } } };
    const summary = summarizeYear(entries, withFiled, 2025);
    expect(summary.filedFederalTax).toBe(3400);
    // A filed figure keyed to a different year must not leak into this one.
    expect(summarizeYear(entries, { ...profile, filedTaxByYear: { 2024: { totalTax: 999 } } }, 2025).filedFederalTax).toBeUndefined();
  });
});

describe("computeYearOverYear", () => {
  const profile: TaxProfile = { filingStatus: "single", dependents: 0, hasW2Job: false, state: "TX" };

  it("is not enough data with a single year", () => {
    const entries = [
      makeEntry({ id: "a", date: "2026-01-01", grossPay: 500 }),
      makeEntry({ id: "b", date: "2026-06-01", grossPay: 500 }),
    ];
    const result = computeYearOverYear(entries, profile);
    expect(result.hasEnoughData).toBe(false);
    expect(result.yearsTracked).toBe(1);
    expect(result.summaries).toHaveLength(1);
  });

  it("has enough data and orders summaries most-recent-first once 2+ years exist", () => {
    const entries = [
      makeEntry({ id: "a", date: "2024-05-01", grossPay: 400, tips: 0 }),
      makeEntry({ id: "b", date: "2025-05-01", grossPay: 600, tips: 0 }),
      makeEntry({ id: "c", date: "2026-05-01", grossPay: 800, tips: 0 }),
    ];
    const result = computeYearOverYear(entries, profile);
    expect(result.hasEnoughData).toBe(true);
    expect(result.yearsTracked).toBe(3);
    expect(result.summaries.map((s) => s.year)).toEqual([2026, 2025, 2024]);
    expect(result.summaries[0].grossEarnings).toBe(800);
  });

  it("returns no summaries and not-enough-data for an empty history", () => {
    const result = computeYearOverYear([], profile);
    expect(result.hasEnoughData).toBe(false);
    expect(result.summaries).toEqual([]);
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

describe("computeCatchUpStatus", () => {
  const dueDate: QuarterlyDueDate = { label: "Q3 2026 estimated tax", dueDate: new Date(2026, 8, 15) };

  it("reports no weekly amount when exactly caught up", () => {
    const status = computeCatchUpStatus(1000, 1000, dueDate, new Date(2026, 7, 1));
    expect(status.gap).toBe(0);
    expect(status.weeklyCatchUpAmount).toBeUndefined();
  });

  it("reports no weekly amount when ahead of target", () => {
    const status = computeCatchUpStatus(1000, 1500, dueDate, new Date(2026, 7, 1));
    expect(status.gap).toBe(-500);
    expect(status.weeklyCatchUpAmount).toBeUndefined();
  });

  it("computes a weekly catch-up amount when behind, spread across the weeks remaining", () => {
    // Aug 1 to Sep 15, 2026 is 45 days = ceil(45/7) = 7 weeks remaining.
    const status = computeCatchUpStatus(1000, 300, dueDate, new Date(2026, 7, 1));
    expect(status.gap).toBe(700);
    expect(status.weeklyCatchUpAmount).toBeCloseTo(700 / 7, 2);
  });

  it("floors weeksRemaining at 1 when the due date is today or in the past", () => {
    const today = computeCatchUpStatus(1000, 300, dueDate, new Date(2026, 8, 15));
    expect(today.weeklyCatchUpAmount).toBeCloseTo(700, 2);

    const pastDueDate: QuarterlyDueDate = { label: "Q2 2026 estimated tax", dueDate: new Date(2026, 5, 15) };
    const past = computeCatchUpStatus(1000, 300, pastDueDate, new Date(2026, 7, 1));
    expect(past.weeklyCatchUpAmount).toBeCloseTo(700, 2);
  });

  it("returns the gap with no weekly amount when there's no next due date", () => {
    const status = computeCatchUpStatus(1000, 300, undefined, new Date(2026, 7, 1));
    expect(status.gap).toBe(700);
    expect(status.weeklyCatchUpAmount).toBeUndefined();
    expect(status.nextDueDate).toBeUndefined();
  });
});

describe("computeW4Optimization", () => {
  const baseTaxProfile: TaxProfile = {
    filingStatus: "single",
    dependents: 0,
    hasW2Job: false,
    state: "CA",
  };
  const w2Profile: TaxProfile = {
    ...baseTaxProfile,
    hasW2Job: true,
    w2GrossPayPerPeriod: 2000,
    w2PayFrequency: "biweekly",
  };

  it("is not applicable when there's no W2 job to adjust withholding on", () => {
    const estimate = computeTaxEstimate([makeEntry({ date: "2026-02-01", grossPay: 40000 })], baseTaxProfile, 2026);
    const result = computeW4Optimization(estimate, baseTaxProfile);
    expect(result.applicable).toBe(false);
    expect(result.extraPerPaycheck).toBe(0);
  });

  it("isolates the gig tax (total minus W2-only withholding) and spreads it over a full year of paychecks", () => {
    const entries = [makeEntry({ date: "2026-02-01", grossPay: 40000, tips: 0, mileage: 0 })];
    const estimate = computeTaxEstimate(entries, w2Profile, 2026);
    const result = computeW4Optimization(estimate, w2Profile);

    expect(result.applicable).toBe(true);
    expect(result.payPeriodsPerYear).toBe(26); // biweekly
    // annualGigTax = total tax − what the W2 job's withholding already targets
    expect(result.annualGigTax).toBeCloseTo(
      estimate.estimate.totalEstimatedTax - estimate.estimate.w2WithholdingEstimate.annualTotalEstimate,
      6
    );
    expect(result.annualGigTax).toBeGreaterThan(0);
    // The headline: that gig tax spread across the year's paychecks → W-4 Line 4(c) amount
    expect(result.extraPerPaycheck).toBeCloseTo(result.annualGigTax / 26, 6);
  });

  it("uses the W2 pay frequency for the per-period count (monthly = 12), defaulting to biweekly when unset", () => {
    const entries = [makeEntry({ date: "2026-02-01", grossPay: 40000 })];

    const monthly = computeW4Optimization(
      computeTaxEstimate(entries, { ...w2Profile, w2PayFrequency: "monthly" }, 2026),
      { ...w2Profile, w2PayFrequency: "monthly" }
    );
    expect(monthly.payPeriodsPerYear).toBe(12);

    const { w2PayFrequency, ...noFrequency } = w2Profile;
    const defaulted = computeW4Optimization(computeTaxEstimate(entries, noFrequency, 2026), noFrequency);
    expect(defaulted.payPeriodsPerYear).toBe(26); // biweekly fallback
  });

  it("reports 'already covered' (no W-4 change) when the W2 job has no gig income to cover", () => {
    // hasW2Job but zero gig entries → total tax equals W2-only withholding → nothing extra to withhold.
    const estimate = computeTaxEstimate([], w2Profile, 2026);
    const result = computeW4Optimization(estimate, w2Profile);
    expect(result.applicable).toBe(true);
    expect(result.alreadyCovered).toBe(true);
    expect(result.annualGigTax).toBe(0);
    expect(result.extraPerPaycheck).toBe(0);
  });

  it("steady-state per-paycheck is date-independent, but the catch-up amount rises as the year elapses", () => {
    const entries = [makeEntry({ date: "2026-02-01", grossPay: 40000, tips: 0, mileage: 0 })];
    const estimate = computeTaxEstimate(entries, w2Profile, 2026);

    const earlyYear = computeW4Optimization(estimate, w2Profile, new Date(2026, 0, 2));
    const midYear = computeW4Optimization(estimate, w2Profile, new Date(2026, 6, 2));

    // The standing W-4 amount doesn't depend on when you ask.
    expect(midYear.extraPerPaycheck).toBeCloseTo(earlyYear.extraPerPaycheck, 6);
    // But fewer paychecks remain mid-year, so catching this year up costs more per check.
    expect(earlyYear.remainingPayPeriods).toBe(26);
    expect(midYear.remainingPayPeriods).toBe(13);
    expect(midYear.catchUpPerPaycheck).toBeGreaterThan(earlyYear.catchUpPerPaycheck);
    expect(midYear.catchUpPerPaycheck).toBeCloseTo(estimate.netAmountToSetAside / 13, 6);
  });

  it("floors remaining paychecks at 1 once the year (or the job) has ended, so catch-up never divides by zero", () => {
    const entries = [makeEntry({ date: "2026-02-01", grossPay: 40000 })];
    const estimate = computeTaxEstimate(entries, w2Profile, 2026);
    const afterYearEnd = computeW4Optimization(estimate, w2Profile, new Date(2027, 0, 5));
    expect(afterYearEnd.remainingPayPeriods).toBe(1);
    expect(afterYearEnd.catchUpPerPaycheck).toBeCloseTo(afterYearEnd.remainingGigTaxThisYear, 6);
  });
});

describe("computeSafeHarbor", () => {
  // TX has no state income tax, so federal == combined — keeps the safe-harbor math easy to reason
  // about. The federal-vs-combined split is exercised separately with a CA profile below.
  const txSingle: TaxProfile = { filingStatus: "single", dependents: 0, hasW2Job: false, state: "TX" };
  const txW2: TaxProfile = {
    ...txSingle,
    hasW2Job: true,
    w2GrossPayPerPeriod: 2000,
    w2PayFrequency: "biweekly",
  };
  const gigEntries = [makeEntry({ date: "2026-02-01", grossPay: 40000, tips: 0, mileage: 0 })];

  it("falls back to the 90%-current requirement (and flags no prior year) when last year's tax is unknown", () => {
    const estimate = computeTaxEstimate(gigEntries, txSingle, 2026);
    const result = computeSafeHarbor(estimate, txSingle);

    expect(result.hasPriorYear).toBe(false);
    expect(result.currentYearFederalTax).toBeCloseTo(estimate.estimate.totalEstimatedTax, 6); // TX: no state tax
    expect(result.ninetyPctCurrent).toBeCloseTo(result.currentYearFederalTax * 0.9, 6);
    expect(result.requiredAnnualPayment).toBeCloseTo(result.ninetyPctCurrent, 6);
    expect(result.bindingTest).toBe("currentYear");
    expect(result.federalWithholding).toBe(0); // no W2 job
  });

  it("uses the (smaller) prior-year safe harbor when income jumped — the headline benefit", () => {
    const profile: TaxProfile = { ...txSingle, filedTaxByYear: { 2025: { totalTax: 1000 } } };
    const estimate = computeTaxEstimate(gigEntries, profile, 2026);
    const result = computeSafeHarbor(estimate, profile);

    expect(result.hasPriorYear).toBe(true);
    expect(result.priorYearMultiplier).toBe(1.0);
    expect(result.priorYearSafeHarbor).toBe(1000);
    // 100% of last year's $1,000 is far below 90% of this (much larger) year — so it's binding.
    expect(result.priorYearSafeHarbor).toBeLessThan(result.ninetyPctCurrent);
    expect(result.requiredAnnualPayment).toBe(1000);
    expect(result.bindingTest).toBe("priorYear");
    expect(result.estimatedPaymentsNeeded).toBe(1000); // no W2 withholding to offset it
    expect(result.perQuarter).toBe(250);
  });

  it("stays on the 90%-current requirement when last year's tax was higher than this year's", () => {
    const profile: TaxProfile = { ...txSingle, filedTaxByYear: { 2025: { totalTax: 999999 } } };
    const estimate = computeTaxEstimate(gigEntries, profile, 2026);
    const result = computeSafeHarbor(estimate, profile);

    expect(result.requiredAnnualPayment).toBeCloseTo(result.ninetyPctCurrent, 6);
    expect(result.bindingTest).toBe("currentYear");
  });

  it("applies the 110% prior-year multiplier above the high-income AGI line ($150k, $75k if MFS)", () => {
    const highEarner: TaxProfile = { ...txSingle, filedTaxByYear: { 2025: { totalTax: 1000, agi: 200000 } } };
    const estimate = computeTaxEstimate(gigEntries, highEarner, 2026);
    const result = computeSafeHarbor(estimate, highEarner);
    expect(result.priorYearMultiplier).toBe(1.1);
    expect(result.priorYearSafeHarbor).toBeCloseTo(1100, 6);

    // Married-filing-separately uses the halved $75k threshold.
    const mfs: TaxProfile = {
      ...txSingle,
      filingStatus: "marriedFilingSeparately",
      filedTaxByYear: { 2025: { totalTax: 1000, agi: 80000 } },
    };
    const mfsResult = computeSafeHarbor(computeTaxEstimate(gigEntries, mfs, 2026), mfs);
    expect(mfsResult.priorYearMultiplier).toBe(1.1);

    // Same $80k AGI for a single filer is under $150k → stays at 100%.
    const single: TaxProfile = { ...txSingle, filedTaxByYear: { 2025: { totalTax: 1000, agi: 80000 } } };
    const singleResult = computeSafeHarbor(computeTaxEstimate(gigEntries, single, 2026), single);
    expect(singleResult.priorYearMultiplier).toBe(1.0);
  });

  it("reports no penalty under the $1,000 de-minimis floor (tax after withholding < $1,000)", () => {
    // Small gig income → SE tax only, well under $1,000, no withholding to subtract.
    const smallGig = [makeEntry({ date: "2026-02-01", grossPay: 5000, tips: 0, mileage: 0 })];
    const estimate = computeTaxEstimate(smallGig, txSingle, 2026);
    const result = computeSafeHarbor(estimate, txSingle);

    expect(result.currentYearFederalTax).toBeLessThan(1000);
    expect(result.underDeMinimis).toBe(true);
    expect(result.noPenaltyExpected).toBe(true);
  });

  it("reports no penalty when W2 withholding alone already meets the (low prior-year) requirement", () => {
    // Tiny prior-year tax → required = $100; a real W2 job withholds far more than that.
    const profile: TaxProfile = { ...txW2, filedTaxByYear: { 2025: { totalTax: 100 } } };
    const estimate = computeTaxEstimate(gigEntries, profile, 2026);
    const result = computeSafeHarbor(estimate, profile);

    expect(result.requiredAnnualPayment).toBe(100);
    expect(result.federalWithholding).toBeGreaterThan(100);
    expect(result.estimatedPaymentsNeeded).toBe(0);
    expect(result.perQuarter).toBe(0);
    expect(result.underDeMinimis).toBe(false); // big gig tax means the balance due is well over $1,000
    expect(result.noPenaltyExpected).toBe(true); // ...but withholding already satisfies the harbor
  });

  it("is federal-only: state tax is excluded from the current-year figure", () => {
    const caSingle: TaxProfile = { ...txSingle, state: "CA" };
    const estimate = computeTaxEstimate(gigEntries, caSingle, 2026);
    const result = computeSafeHarbor(estimate, caSingle);

    expect(estimate.estimate.stateTax.stateTax).toBeGreaterThan(0); // CA does tax this income
    expect(result.currentYearFederalTax).toBeCloseTo(
      estimate.estimate.totalEstimatedTax - estimate.estimate.stateTax.stateTax,
      6
    );
    expect(result.currentYearFederalTax).toBeLessThan(estimate.estimate.totalEstimatedTax);
  });

  it("subtracts federal withholding (not the combined federal+state figure) from the requirement", () => {
    const caW2: TaxProfile = { ...txW2, state: "CA", filedTaxByYear: { 2025: { totalTax: 100 } } };
    const estimate = computeTaxEstimate(gigEntries, caW2, 2026);
    const result = computeSafeHarbor(estimate, caW2);
    // The federal-only withholding the safe harbor uses must be the federal slice, below the
    // combined federal+state withholding the rest of the app credits.
    expect(result.federalWithholding).toBeCloseTo(estimate.w2FederalWithholdingYtdEstimate, 6);
    expect(result.federalWithholding).toBeLessThan(estimate.w2WithholdingYtdEstimate);
  });
});

describe("computeWhatIfEstimate", () => {
  const baseTaxProfile: TaxProfile = {
    filingStatus: "single",
    dependents: 0,
    hasW2Job: false,
    state: "CA",
  };

  it("matches computeTaxEstimate on entries that produce the same aggregate", () => {
    // A hypothetical scenario and a real entry set with identical totals must yield identical
    // numbers — the What-if path is the same pipeline, just fed made-up inputs.
    const entries = [makeEntry({ grossPay: 40000, tips: 5000, mileage: 1200, expenses: { parking: 0, tolls: 0, supplies: 800, phone: 200 } })];
    const fromEntries = computeTaxEstimate(entries, baseTaxProfile, thisYear);
    const fromScenario = computeWhatIfEstimate(
      baseTaxProfile,
      { grossEarnings: 45000, businessExpenses: 1000, businessMiles: 1200, hoursWorked: 0 },
      thisYear
    );
    expect(fromScenario.estimate.totalEstimatedTax).toBeCloseTo(fromEntries.estimate.totalEstimatedTax, 2);
    expect(fromScenario.netAmountToSetAside).toBeCloseTo(fromEntries.netAmountToSetAside, 2);
  });

  it("higher earnings produce a higher set-aside (monotonic)", () => {
    const low = computeWhatIfEstimate(baseTaxProfile, { grossEarnings: 20000, businessExpenses: 0, businessMiles: 0, hoursWorked: 0 }, thisYear);
    const high = computeWhatIfEstimate(baseTaxProfile, { grossEarnings: 60000, businessExpenses: 0, businessMiles: 0, hoursWorked: 0 }, thisYear);
    expect(high.netAmountToSetAside).toBeGreaterThan(low.netAmountToSetAside);
  });

  it("applies the W2 withholding credit just like the dashboard does", () => {
    const w2Profile: TaxProfile = {
      ...baseTaxProfile,
      hasW2Job: true,
      w2GrossPayPerPeriod: 2000,
      w2PayFrequency: "biweekly",
    };
    const result = computeWhatIfEstimate(w2Profile, { grossEarnings: 30000, businessExpenses: 0, businessMiles: 0, hoursWorked: 0 }, thisYear);
    expect(result.w2WithholdingYtdEstimate).toBeGreaterThan(0);
    expect(result.netAmountToSetAside).toBeLessThan(result.estimate.totalEstimatedTax);
  });

  it("whatIfAggregate lets net profit go negative when expenses exceed earnings", () => {
    const aggregate = whatIfAggregate({ grossEarnings: 1000, businessExpenses: 1500, businessMiles: 0, hoursWorked: 0 });
    expect(aggregate.netSelfEmploymentProfit).toBe(-500);
    expect(aggregate.totalExpenses).toBe(1500);
  });
});

describe("comparePlatforms", () => {
  it("returns an empty list when there are no entries for the year", () => {
    expect(comparePlatforms([], thisYear)).toEqual([]);
  });

  it("groups entries by platform, summing earnings/expenses/hours/count", () => {
    const entries = [
      makeEntry({ id: "a", platform: "doordash", grossPay: 100, tips: 20, hoursWorked: 4, expenses: { parking: 5, tolls: 0, supplies: 0, phone: 0 } }),
      makeEntry({ id: "b", platform: "doordash", grossPay: 80, tips: 0, hoursWorked: 2 }),
      makeEntry({ id: "c", platform: "uber", grossPay: 200, tips: 0, hoursWorked: 5 }),
    ];
    const stats = comparePlatforms(entries, thisYear);
    const doordash = stats.find((s) => s.platform === "doordash")!;
    expect(doordash.entryCount).toBe(2);
    expect(doordash.totalEarnings).toBe(200); // 120 + 80
    expect(doordash.totalExpenses).toBe(5);
    expect(doordash.netEarnings).toBe(195);
    expect(doordash.totalHours).toBe(6);
  });

  it("ranks platforms by total earnings, highest first", () => {
    const entries = [
      makeEntry({ id: "a", platform: "uber", grossPay: 50 }),
      makeEntry({ id: "b", platform: "doordash", grossPay: 300 }),
      makeEntry({ id: "c", platform: "spark", grossPay: 150 }),
    ];
    expect(comparePlatforms(entries, thisYear).map((s) => s.platform)).toEqual(["doordash", "spark", "uber"]);
  });

  it("computes hourly rate from net earnings only when hours are logged", () => {
    const entries = [
      makeEntry({ id: "a", platform: "doordash", grossPay: 120, tips: 0, hoursWorked: 4, expenses: { parking: 20, tolls: 0, supplies: 0, phone: 0 } }),
      makeEntry({ id: "b", platform: "uber", grossPay: 100, tips: 0 }), // no hours
    ];
    const stats = comparePlatforms(entries, thisYear);
    const doordash = stats.find((s) => s.platform === "doordash")!;
    const uber = stats.find((s) => s.platform === "uber")!;
    expect(doordash.hourlyRate).toBeCloseTo((120 - 20) / 4, 2); // net 100 over 4 hrs = 25
    expect(uber.hourlyRate).toBeUndefined();
  });

  it("scopes to the requested year", () => {
    const entries = [
      makeEntry({ id: "a", platform: "uber", date: `${thisYear}-03-01`, grossPay: 100 }),
      makeEntry({ id: "b", platform: "doordash", date: `${thisYear - 1}-03-01`, grossPay: 999 }),
    ];
    const stats = comparePlatforms(entries, thisYear);
    expect(stats).toHaveLength(1);
    expect(stats[0].platform).toBe("uber");
  });
});

describe("effectiveHourlyRate", () => {
  it("returns undefined when no hours have been logged", () => {
    expect(effectiveHourlyRate(1000, 50, 200, 0)).toBeUndefined();
  });

  it("divides take-home pay (earnings minus expenses minus tax set-aside) by hours worked", () => {
    // (1000 - 50 - 200) / 25 = 30
    expect(effectiveHourlyRate(1000, 50, 200, 25)).toBeCloseTo(30, 2);
  });

  it("can return a negative rate if the tax set-aside exceeds take-home pay (a real, if rare, case)", () => {
    expect(effectiveHourlyRate(100, 0, 200, 10)).toBeCloseTo(-10, 2);
  });
});

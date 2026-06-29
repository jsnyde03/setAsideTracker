import { describe, expect, it } from "vitest";
import { estimateTax, currentTaxYear, type TaxEstimateResult } from "@gig-tax-tracker/tax-engine";
import { buildBreakdownDetail, type BreakdownDetailContext } from "../breakdownDetails";

function estimateFor(overrides: Partial<Parameters<typeof estimateTax>[0]> = {}): TaxEstimateResult {
  return estimateTax(
    {
      filingStatus: "single",
      netSelfEmploymentProfit: 50000,
      businessMiles: 1000,
      otherTaxableIncome: 0,
      stateCode: "CA",
      numberOfChildren: 0,
      ...overrides,
    },
    currentTaxYear
  );
}

function ctx(estimate: TaxEstimateResult, over: Partial<BreakdownDetailContext> = {}): BreakdownDetailContext {
  return { estimate, stateLabel: "CA", w2WithholdingYtd: 0, ...over };
}

/** The bottom-line "total" value, with currency formatting stripped to a number. */
function totalValue(lines: { value: string; kind?: string }[]): number {
  const total = lines.find((l) => l.kind === "total");
  if (!total) throw new Error("no total line");
  return Number(total.value.replace(/[−$,]/g, "")) * (total.value.includes("−") ? -1 : 1);
}

describe("buildBreakdownDetail", () => {
  it("SE-tax detail's total matches the engine's totalSeTax and lists SS + Medicare", () => {
    const estimate = estimateFor();
    const detail = buildBreakdownDetail("seTax", ctx(estimate));

    expect(detail.title).toBe("Self-employment tax");
    expect(totalValue(detail.lines)).toBeCloseTo(estimate.seTax.totalSeTax, 2);
    expect(detail.lines.some((l) => l.label.startsWith("Social Security"))).toBe(true);
    expect(detail.lines.some((l) => l.label.startsWith("Medicare"))).toBe(true);
    // The deductible-half footnote is always present.
    expect(detail.footnote).toContain("deducted before your income tax");
  });

  it("federal-tax detail renders one line per applied bracket and totals to incomeTax", () => {
    const estimate = estimateFor();
    const detail = buildBreakdownDetail("federalIncomeTax", ctx(estimate));

    // One labelled line per bracket the income reached (e.g. "10% on $...", "12% on $...").
    const bracketLines = detail.lines.filter((l) => /^\d/.test(l.label) && l.label.includes(" on "));
    expect(bracketLines).toHaveLength(estimate.federalIncomeTax.bracketsApplied.length);
    expect(bracketLines.length).toBeGreaterThan(0);
    expect(totalValue(detail.lines)).toBeCloseTo(estimate.federalIncomeTax.incomeTax, 2);
    // Standard deduction is shown as a subtraction.
    expect(detail.lines.some((l) => l.label === "Standard deduction" && l.value.includes("−"))).toBe(true);
  });

  it("state-tax detail for a no-income-tax state explains there's nothing to set aside", () => {
    const estimate = estimateFor({ stateCode: "TX" });
    const detail = buildBreakdownDetail("stateTax", ctx(estimate, { stateLabel: "TX" }));
    expect(detail.intro).toContain("no state income tax");
    expect(totalValue(detail.lines)).toBe(0);
  });

  it("state-tax detail for an unsupported state warns and shows no math", () => {
    // PR is not in the config map → unsupported.
    const estimate = estimateFor({ stateCode: "PR" });
    const detail = buildBreakdownDetail("stateTax", ctx(estimate, { stateLabel: "PR" }));
    expect(estimate.stateTax.supported).toBe(false);
    expect(detail.intro).toContain("isn't supported");
    expect(detail.lines).toEqual([]);
  });

  it("state-tax detail for a progressive state totals to stateTax and lists brackets", () => {
    const estimate = estimateFor({ stateCode: "CA", netSelfEmploymentProfit: 120000 });
    const detail = buildBreakdownDetail("stateTax", ctx(estimate));
    const bracketLines = detail.lines.filter((l) => l.label.includes(" on "));
    expect(bracketLines.length).toBeGreaterThan(0);
    expect(totalValue(detail.lines)).toBeCloseTo(estimate.stateTax.stateTax, 2);
  });

  it("child-tax-credit detail splits nonrefundable vs refundable and totals to the credit", () => {
    const estimate = estimateFor({ numberOfChildren: 2, netSelfEmploymentProfit: 30000 });
    const detail = buildBreakdownDetail("childTaxCredit", ctx(estimate));
    expect(detail.lines[0]).toMatchObject({ label: "Qualifying children", value: "2" });
    expect(totalValue(detail.lines)).toBeCloseTo(-estimate.childTaxCredit.totalCredit, 2);
  });

  it("W-2 withholding detail credits the YTD figure passed in, not the raw annual estimate", () => {
    const estimate = estimateFor({ otherTaxableIncome: 60000 });
    const detail = buildBreakdownDetail("w2Withholding", ctx(estimate, { w2WithholdingYtd: 1234.56 }));
    expect(totalValue(detail.lines)).toBeCloseTo(-1234.56, 2);
  });
});

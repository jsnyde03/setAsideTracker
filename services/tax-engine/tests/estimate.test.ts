import { describe, expect, it } from "vitest";
import { estimateTax } from "../src/estimate";
import { taxYear2025 } from "../src/taxYears/2025";

describe("estimateTax (2025)", () => {
  it("nets out mileage deduction before computing SE tax and income tax", () => {
    const result = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 50700,
        businessMiles: 1000, // $700 deduction at $0.70/mile -> net profit after mileage = $50,000
        otherTaxableIncome: 0,
        stateCode: "TX", // no state income tax, keeps this test focused on federal/SE math
      },
      taxYear2025
    );

    expect(result.mileageDeduction.deductionAmount).toBeCloseTo(700, 2);
    expect(result.netProfitAfterMileage).toBeCloseTo(50000, 2);
    expect(result.seTax.totalSeTax).toBeCloseTo(7064.775, 3);
    expect(result.federalIncomeTax.incomeTax).toBeCloseTo(3537.6135, 3);
    expect(result.stateTax.stateTax).toBe(0); // TX has no state income tax
    expect(result.stateTax.supported).toBe(true);
    expect(result.totalEstimatedTax).toBeCloseTo(10602.3885, 3);
    expect(result.effectiveSetAsideRate).toBeCloseTo(10602.3885 / 50000, 4);
  });

  it("produces a sensible result for a typical part-time gig worker week scaled to a year", () => {
    const result = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 15000,
        businessMiles: 0,
        otherTaxableIncome: 0,
        stateCode: "TX",
      },
      taxYear2025
    );

    // Sanity bounds rather than brittle exact match: SE tax + income tax should be
    // well under the net profit, and the set-aside rate should be a reasonable percentage.
    expect(result.totalEstimatedTax).toBeGreaterThan(0);
    expect(result.totalEstimatedTax).toBeLessThan(15000);
    expect(result.effectiveSetAsideRate).toBeGreaterThan(0.1);
    expect(result.effectiveSetAsideRate).toBeLessThan(0.35);
  });

  it("handles zero income without error", () => {
    const result = estimateTax(
      { filingStatus: "single", netSelfEmploymentProfit: 0, businessMiles: 0, otherTaxableIncome: 0, stateCode: "TX" },
      taxYear2025
    );
    expect(result.totalEstimatedTax).toBe(0);
    expect(result.effectiveSetAsideRate).toBe(0);
  });

  it("defaults to zero children (no behavior change) when numberOfChildren is omitted", () => {
    const withoutField = estimateTax(
      { filingStatus: "single", netSelfEmploymentProfit: 50000, businessMiles: 0, otherTaxableIncome: 0, stateCode: "TX" },
      taxYear2025
    );
    const withZero = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 50000,
        businessMiles: 0,
        otherTaxableIncome: 0,
        stateCode: "TX",
        numberOfChildren: 0,
      },
      taxYear2025
    );
    expect(withoutField.totalEstimatedTax).toBe(withZero.totalEstimatedTax);
    expect(withoutField.childTaxCredit.totalCredit).toBe(0);
  });

  it("reduces the income tax component, but never SE tax, via the nonrefundable Child Tax Credit", () => {
    const withoutKids = estimateTax(
      { filingStatus: "single", netSelfEmploymentProfit: 80000, businessMiles: 0, otherTaxableIncome: 0, stateCode: "TX" },
      taxYear2025
    );
    const withTwoKids = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 80000,
        businessMiles: 0,
        otherTaxableIncome: 0,
        stateCode: "TX",
        numberOfChildren: 2,
      },
      taxYear2025
    );

    // SE tax depends only on net profit, never on dependents.
    expect(withTwoKids.seTax.totalSeTax).toBeCloseTo(withoutKids.seTax.totalSeTax, 6);
    // The credit must reduce total estimated tax by a meaningful, bounded amount.
    expect(withTwoKids.totalEstimatedTax).toBeLessThan(withoutKids.totalEstimatedTax);
    expect(withTwoKids.childTaxCredit.totalCredit).toBeGreaterThan(0);
    expect(withoutKids.totalEstimatedTax - withTwoKids.totalEstimatedTax).toBeCloseTo(
      withTwoKids.childTaxCredit.totalCredit,
      6
    );
  });

  it("lets the refundable ACTC offset SE/state tax, floored at zero, for a low-income parent with little income tax liability", () => {
    const result = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 8000,
        businessMiles: 0,
        otherTaxableIncome: 0,
        stateCode: "TX",
        numberOfChildren: 2,
      },
      taxYear2025
    );

    // Standard deduction wipes out income tax entirely at this income level, so the entire
    // credit (if any survives the phase-out/earned-income caps) must come through as refundable.
    expect(result.federalIncomeTax.incomeTax).toBe(0);
    expect(result.childTaxCredit.nonrefundableCredit).toBe(0);
    expect(result.childTaxCredit.refundableCredit).toBeGreaterThan(0);
    expect(result.totalEstimatedTax).toBeGreaterThanOrEqual(0);
  });

  it("includes a w2WithholdingEstimate based on otherTaxableIncome, unaffected by SE income", () => {
    const result = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 50000,
        businessMiles: 0,
        otherTaxableIncome: 60000,
        stateCode: "CA",
      },
      taxYear2025
    );

    expect(result.w2WithholdingEstimate.annualTotalEstimate).toBeGreaterThan(0);
    // It's an isolated-income estimate — adding SE income on top must not change it, even though
    // it changes the combined bracket calculation used for federalIncomeTax/stateTax above.
    const withMoreSeIncome = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 200000,
        businessMiles: 0,
        otherTaxableIncome: 60000,
        stateCode: "CA",
      },
      taxYear2025
    );
    expect(withMoreSeIncome.w2WithholdingEstimate.annualTotalEstimate).toBeCloseTo(
      result.w2WithholdingEstimate.annualTotalEstimate,
      6
    );
  });

  it("returns a zero w2WithholdingEstimate when there's no other taxable income", () => {
    const result = estimateTax(
      { filingStatus: "single", netSelfEmploymentProfit: 50000, businessMiles: 0, otherTaxableIncome: 0, stateCode: "TX" },
      taxYear2025
    );
    expect(result.w2WithholdingEstimate.annualTotalEstimate).toBe(0);
  });
});

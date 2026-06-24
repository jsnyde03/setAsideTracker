import { describe, expect, it } from "vitest";
import { calculateSeTax } from "../src/seTax";
import { calculateFederalIncomeTax } from "../src/federalIncomeTax";
import { taxYear2025 } from "../src/taxYears/2025";

describe("calculateFederalIncomeTax (2025)", () => {
  it("matches a hand-verified single-filer scenario at $50,000 net SE profit", () => {
    const seTax = calculateSeTax(50000, "single", taxYear2025);
    const result = calculateFederalIncomeTax(
      50000,
      seTax.deductibleSeTaxPortion,
      0,
      "single",
      taxYear2025
    );

    expect(result.adjustedGrossIncome).toBeCloseTo(46467.6125, 3);
    expect(result.taxableIncome).toBeCloseTo(31467.6125, 3);
    // 11925 * 10% + (31467.6125 - 11925) * 12%
    expect(result.incomeTax).toBeCloseTo(3537.6135, 3);
  });

  it("matches a hand-verified scenario spanning multiple brackets at $300,000 net SE profit", () => {
    const seTax = calculateSeTax(300000, "single", taxYear2025);
    const result = calculateFederalIncomeTax(
      300000,
      seTax.deductibleSeTaxPortion,
      0,
      "single",
      taxYear2025
    );

    expect(result.taxableIncome).toBeCloseTo(270064.575, 2);
    expect(result.incomeTax).toBeCloseTo(64069.85125, 1);
  });

  it("never produces negative taxable income when deductions exceed income", () => {
    const result = calculateFederalIncomeTax(1000, 0, 0, "single", taxYear2025);
    expect(result.taxableIncome).toBe(0);
    expect(result.incomeTax).toBe(0);
  });

  it("adds other taxable income (e.g. a W2 job) on top of SE profit", () => {
    const seTax = calculateSeTax(20000, "single", taxYear2025);
    const withOtherIncome = calculateFederalIncomeTax(
      20000,
      seTax.deductibleSeTaxPortion,
      40000,
      "single",
      taxYear2025
    );
    const withoutOtherIncome = calculateFederalIncomeTax(
      20000,
      seTax.deductibleSeTaxPortion,
      0,
      "single",
      taxYear2025
    );

    expect(withOtherIncome.taxableIncome).toBeCloseTo(withoutOtherIncome.taxableIncome + 40000, 3);
    expect(withOtherIncome.incomeTax).toBeGreaterThan(withoutOtherIncome.incomeTax);
  });
});

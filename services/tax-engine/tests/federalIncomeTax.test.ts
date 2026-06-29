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

    // Standard deduction is $15,750 (the OBBBA-corrected 2025 figure, not the stale pre-OBBBA
    // $15,000 Rev. Proc. 2024-40 figure) — see taxYears/2025.ts's file-level comment.
    expect(result.adjustedGrossIncome).toBeCloseTo(46467.6125, 3);
    expect(result.taxableIncome).toBeCloseTo(30717.6125, 3);
    // 11925 * 10% + (30717.6125 - 11925) * 12%
    expect(result.incomeTax).toBeCloseTo(3447.6135, 3);

    // Show-your-math detail: the standard deduction used and the two brackets this income reached.
    expect(result.standardDeductionUsed).toBe(15750);
    expect(result.bracketsApplied).toHaveLength(2);
    expect(result.bracketsApplied[0]).toMatchObject({ rate: 0.1, amountInBracket: 11925 });
    expect(result.bracketsApplied[0].taxFromBracket).toBeCloseTo(1192.5, 4);
    expect(result.bracketsApplied[1].rate).toBe(0.12);
    expect(result.bracketsApplied[1].amountInBracket).toBeCloseTo(30717.6125 - 11925, 3);
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

    expect(result.taxableIncome).toBeCloseTo(269314.575, 2);
    expect(result.incomeTax).toBeCloseTo(63807.35125, 1);
  });

  it("never produces negative taxable income when deductions exceed income", () => {
    const result = calculateFederalIncomeTax(1000, 0, 0, "single", taxYear2025);
    expect(result.taxableIncome).toBe(0);
    expect(result.incomeTax).toBe(0);
    // Standard deduction is still reported even when it fully zeroes out taxable income.
    expect(result.standardDeductionUsed).toBe(15750);
    expect(result.bracketsApplied).toEqual([]);
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

  it("HoH standard deduction ($23,625) is larger than single ($15,750) for 2025", () => {
    const single = calculateFederalIncomeTax(80000, 0, 0, "single", taxYear2025);
    const hoh = calculateFederalIncomeTax(80000, 0, 0, "headOfHousehold", taxYear2025);
    expect(hoh.taxableIncome).toBeCloseTo(80000 - 23625, 2);
    expect(hoh.taxableIncome).toBeLessThan(single.taxableIncome);
    expect(hoh.incomeTax).toBeLessThan(single.incomeTax);
  });

  it("MFS standard deduction equals single ($15,750) for 2025", () => {
    const single = calculateFederalIncomeTax(80000, 0, 0, "single", taxYear2025);
    const mfs = calculateFederalIncomeTax(80000, 0, 0, "marriedFilingSeparately", taxYear2025);
    expect(mfs.taxableIncome).toBeCloseTo(single.taxableIncome, 2);
  });
});

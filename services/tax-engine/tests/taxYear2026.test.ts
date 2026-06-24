import { describe, expect, it } from "vitest";
import { calculateSeTax } from "../src/seTax";
import { calculateFederalIncomeTax } from "../src/federalIncomeTax";
import { estimateTax } from "../src/estimate";
import { taxYear2026 } from "../src/taxYears/2026";

describe("taxYear2026 config", () => {
  it("applies the 2026 standard mileage rate of $0.725/mile", () => {
    expect(taxYear2026.standardMileageRate).toBe(0.725);
  });

  it("applies the 2026 Social Security wage base of $184,500", () => {
    expect(taxYear2026.socialSecurityWageBase).toBe(184500);
  });

  it("computes SE tax under the SS wage base, single filer", () => {
    const result = calculateSeTax(50000, "single", taxYear2026);

    // netEarningsFromSE = 50000 * 0.9235
    expect(result.netEarningsFromSE).toBeCloseTo(46175, 2);
    expect(result.socialSecurityTax).toBeCloseTo(46175 * 0.124, 3);
    expect(result.medicareTax).toBeCloseTo(46175 * 0.029, 3);
    expect(result.additionalMedicareTax).toBe(0);
  });

  it("caps the Social Security portion at the higher 2026 wage base", () => {
    // Net earnings from SE land between the 2025 ($176,100) and 2026 ($184,500) wage bases,
    // so the full amount should still be taxed at 12.4% under the 2026 config.
    const netProfit = 184500 / 0.9235 - 1000; // net earnings from SE just under the 2026 cap
    const result = calculateSeTax(netProfit, "single", taxYear2026);

    expect(result.netEarningsFromSE).toBeLessThan(184500);
    expect(result.socialSecurityTax).toBeCloseTo(result.netEarningsFromSE * 0.124, 2);
  });

  it("matches a hand-verified single-filer scenario at $50,000 net SE profit (2026 brackets/standard deduction)", () => {
    const seTax = calculateSeTax(50000, "single", taxYear2026);
    const result = calculateFederalIncomeTax(
      50000,
      seTax.deductibleSeTaxPortion,
      0,
      "single",
      taxYear2026
    );

    // AGI = 50000 - deductibleSeTaxPortion; standard deduction (2026, single) = 16100
    const expectedAgi = 50000 - seTax.deductibleSeTaxPortion;
    expect(result.adjustedGrossIncome).toBeCloseTo(expectedAgi, 3);
    expect(result.taxableIncome).toBeCloseTo(expectedAgi - 16100, 3);

    // 2026 single brackets: 10% to $12,400, then 12% up to $50,400 — taxable income here falls in the 12% bracket.
    const taxableIncome = expectedAgi - 16100;
    const expectedTax = 12400 * 0.1 + (taxableIncome - 12400) * 0.12;
    expect(result.incomeTax).toBeCloseTo(expectedTax, 3);
  });

  it("produces a full estimate consistent with the 2026 config end to end", () => {
    const result = estimateTax(
      { filingStatus: "single", netSelfEmploymentProfit: 50000, businessMiles: 0, otherTaxableIncome: 0, stateCode: "TX" },
      taxYear2026
    );

    expect(result.taxYear).toBe(2026);
    expect(result.totalEstimatedTax).toBeGreaterThan(0);
    expect(result.effectiveSetAsideRate).toBeGreaterThan(0.1);
    expect(result.effectiveSetAsideRate).toBeLessThan(0.35);
  });
});

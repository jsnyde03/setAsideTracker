import { describe, expect, it } from "vitest";
import { calculateSeTax } from "../src/seTax";
import { taxYear2025 } from "../src/taxYears/2025";

describe("calculateSeTax (2025)", () => {
  it("computes SE tax under the SS wage base, single filer", () => {
    const result = calculateSeTax(50000, "single", taxYear2025);

    expect(result.netEarningsFromSE).toBeCloseTo(46175, 2);
    expect(result.socialSecurityTax).toBeCloseTo(5725.7, 2);
    expect(result.medicareTax).toBeCloseTo(1339.075, 3);
    expect(result.additionalMedicareTax).toBeCloseTo(0, 2);
    expect(result.totalSeTax).toBeCloseTo(7064.775, 3);
    expect(result.deductibleSeTaxPortion).toBeCloseTo(3532.3875, 4);
  });

  it("caps the Social Security portion at the wage base and applies Additional Medicare Tax above threshold", () => {
    const result = calculateSeTax(300000, "single", taxYear2025);

    expect(result.netEarningsFromSE).toBeCloseTo(277050, 2);
    expect(result.socialSecurityTax).toBeCloseTo(176100 * 0.124, 2);
    expect(result.medicareTax).toBeCloseTo(277050 * 0.029, 2);
    expect(result.additionalMedicareTax).toBeCloseTo((277050 - 200000) * 0.009, 2);
    expect(result.totalSeTax).toBeCloseTo(30564.3, 1);
  });

  it("returns all zeros for zero or negative net profit", () => {
    const result = calculateSeTax(0, "single", taxYear2025);
    expect(result.totalSeTax).toBe(0);

    const negative = calculateSeTax(-500, "single", taxYear2025);
    expect(negative.totalSeTax).toBe(0);
  });

  it("zero otherFicaWages produces identical results to omitting the parameter", () => {
    const withZero = calculateSeTax(50000, "single", taxYear2025, 0);
    const withoutParam = calculateSeTax(50000, "single", taxYear2025);
    expect(withZero.totalSeTax).toBeCloseTo(withoutParam.totalSeTax, 6);
  });
});

describe("calculateSeTax with W2 wages (otherFicaWages)", () => {
  // 2025: SS wage base = $176,100 | AMT threshold (single) = $200,000

  it("reduces available SS wage base by W2 wages — partial reduction", () => {
    // $100k W2 wages already counted; SE net earnings = $100k × 0.9235 = $92,350
    // Available SS base = $176,100 - $100,000 = $76,100
    // SS tax = $76,100 × 0.124 = $9,436.40
    // Medicare = $92,350 × 0.029 = $2,678.15
    // AMT threshold remaining = $200,000 - $100,000 = $100,000; $92,350 < $100,000 → no AMT
    const result = calculateSeTax(100000, "single", taxYear2025, 100000);
    expect(result.netEarningsFromSE).toBeCloseTo(92350, 2);
    expect(result.socialSecurityTax).toBeCloseTo(76100 * 0.124, 2);
    expect(result.medicareTax).toBeCloseTo(92350 * 0.029, 2);
    expect(result.additionalMedicareTax).toBeCloseTo(0, 2);
    expect(result.totalSeTax).toBeCloseTo(76100 * 0.124 + 92350 * 0.029, 2);
  });

  it("zeroes out SS tax when W2 wages already meet or exceed the wage base", () => {
    // $190k W2 wages ≥ $176,100 base → available SS base = $0 → no SS tax on SE portion
    // SE net earnings = $50k × 0.9235 = $46,175
    // AMT threshold remaining = $200,000 - $190,000 = $10,000
    // AMT taxable = $46,175 - $10,000 = $36,175
    const result = calculateSeTax(50000, "single", taxYear2025, 190000);
    expect(result.socialSecurityTax).toBeCloseTo(0, 6);
    expect(result.medicareTax).toBeCloseTo(46175 * 0.029, 2);
    expect(result.additionalMedicareTax).toBeCloseTo(36175 * 0.009, 2);
    expect(result.totalSeTax).toBeCloseTo(46175 * 0.029 + 36175 * 0.009, 2);
  });

  it("applies AMT to all SE earnings when W2 wages already exceed the AMT threshold", () => {
    // $250k W2 wages > $200k threshold → available AMT threshold = $0
    // All SE net earnings ($46,175) are subject to additional Medicare
    // SS wage base also exhausted: $250k > $176,100
    const result = calculateSeTax(50000, "single", taxYear2025, 250000);
    expect(result.socialSecurityTax).toBeCloseTo(0, 6);
    expect(result.additionalMedicareTax).toBeCloseTo(46175 * 0.009, 2);
  });

  it("uses MFS Additional Medicare threshold ($125,000) for married filing separately", () => {
    // MFS threshold = $125,000; W2 = $100,000 → remaining = $25,000
    // SE net = $50k × 0.9235 = $46,175 → AMT taxable = $46,175 - $25,000 = $21,175
    const result = calculateSeTax(50000, "marriedFilingSeparately", taxYear2025, 100000);
    expect(result.additionalMedicareTax).toBeCloseTo(21175 * 0.009, 2);
  });
});

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
});

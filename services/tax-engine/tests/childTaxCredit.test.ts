import { describe, expect, it } from "vitest";
import { calculateChildTaxCredit } from "../src/childTaxCredit";
import { taxYear2026 } from "../src/taxYears/2026";

describe("calculateChildTaxCredit (2026: $2,200/child, $1,700 refundable cap)", () => {
  it("returns all zeros when there are no qualifying children", () => {
    const result = calculateChildTaxCredit(0, 50000, 50000, 10000, "single", taxYear2026);
    expect(result).toEqual({
      numberOfChildren: 0,
      nonrefundableCredit: 0,
      refundableCredit: 0,
      totalCredit: 0,
    });
  });

  it("fully absorbs the credit nonrefundably when income tax owed is large enough", () => {
    const result = calculateChildTaxCredit(1, 50000, 50000, 10000, "single", taxYear2026);
    expect(result.nonrefundableCredit).toBeCloseTo(2200, 2);
    expect(result.refundableCredit).toBe(0);
    expect(result.totalCredit).toBeCloseTo(2200, 2);
  });

  it("falls back to the refundable ACTC, capped per child, when income tax owed is zero", () => {
    const result = calculateChildTaxCredit(2, 20000, 40000, 0, "single", taxYear2026);
    // creditAfterPhaseOut = 4400; refundableCap = 2 * 1700 = 3400; earnedIncomeLimit = 0.15 * 37500 = 5625
    expect(result.nonrefundableCredit).toBe(0);
    expect(result.refundableCredit).toBeCloseTo(3400, 2);
    expect(result.totalCredit).toBeCloseTo(3400, 2);
  });

  it("caps the refundable ACTC by the 15%-of-earned-income-over-$2,500 formula when that's the binding constraint", () => {
    const result = calculateChildTaxCredit(2, 5000, 5000, 0, "single", taxYear2026);
    // earnedIncomeLimit = 0.15 * (5000 - 2500) = 375, well under the $3,400 per-child cap
    expect(result.refundableCredit).toBeCloseTo(375, 2);
  });

  it("phases the credit out completely for a high earner well above the threshold", () => {
    const result = calculateChildTaxCredit(1, 300000, 300000, 50000, "single", taxYear2026);
    // excess = 100,000 -> 100 * $50 = $5,000 reduction, more than wipes out the $2,200 base credit
    expect(result.totalCredit).toBe(0);
  });

  it("applies a partial phase-out reduction just above the threshold", () => {
    const result = calculateChildTaxCredit(1, 210000, 210000, 10000, "single", taxYear2026);
    // excess = 10,000 -> 10 * $50 = $500 reduction -> credit = 2200 - 500 = 1700
    expect(result.nonrefundableCredit).toBeCloseTo(1700, 2);
    expect(result.refundableCredit).toBe(0);
  });
});

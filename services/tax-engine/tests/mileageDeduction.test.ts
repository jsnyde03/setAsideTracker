import { describe, expect, it } from "vitest";
import { calculateMileageDeduction } from "../src/mileageDeduction";
import { taxYear2025 } from "../src/taxYears/2025";

describe("calculateMileageDeduction (2025)", () => {
  it("applies the 2025 standard mileage rate of $0.70/mile", () => {
    const result = calculateMileageDeduction(1000, taxYear2025);
    expect(result.ratePerMile).toBe(0.7);
    expect(result.deductionAmount).toBeCloseTo(700, 2);
  });

  it("treats negative miles as zero", () => {
    const result = calculateMileageDeduction(-50, taxYear2025);
    expect(result.miles).toBe(0);
    expect(result.deductionAmount).toBe(0);
  });
});

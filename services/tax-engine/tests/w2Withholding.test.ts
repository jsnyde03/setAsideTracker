import { describe, expect, it } from "vitest";
import { estimateW2Withholding } from "../src/w2Withholding";
import { taxYear2026 } from "../src/taxYears/2026";
import { calculateFederalIncomeTax } from "../src/federalIncomeTax";
import { calculateStateTax } from "../src/stateTax";

describe("estimateW2Withholding (2026)", () => {
  it("returns all zeros for zero or negative income", () => {
    expect(estimateW2Withholding(0, "single", "TX", taxYear2026)).toEqual({
      annualFederalEstimate: 0,
      annualStateEstimate: 0,
      annualTotalEstimate: 0,
    });
    expect(estimateW2Withholding(-100, "single", "TX", taxYear2026)).toEqual({
      annualFederalEstimate: 0,
      annualStateEstimate: 0,
      annualTotalEstimate: 0,
    });
  });

  it("matches a direct federal+state calculation on the income in isolation (no state tax)", () => {
    const result = estimateW2Withholding(60000, "single", "TX", taxYear2026);
    const expectedFederal = calculateFederalIncomeTax(0, 0, 60000, "single", taxYear2026);
    const expectedState = calculateStateTax(0, 0, 60000, "single", "TX", taxYear2026);

    expect(result.annualFederalEstimate).toBeCloseTo(expectedFederal.incomeTax, 6);
    expect(result.annualStateEstimate).toBe(0); // TX has no income tax
    expect(result.annualTotalEstimate).toBeCloseTo(expectedFederal.incomeTax, 6);
  });

  it("includes state tax when the state has one", () => {
    const result = estimateW2Withholding(60000, "single", "CA", taxYear2026);
    const expectedState = calculateStateTax(0, 0, 60000, "single", "CA", taxYear2026);

    expect(result.annualStateEstimate).toBeCloseTo(expectedState.stateTax, 6);
    expect(result.annualStateEstimate).toBeGreaterThan(0);
    expect(result.annualTotalEstimate).toBeCloseTo(
      result.annualFederalEstimate + result.annualStateEstimate,
      6
    );
  });

  it("never applies SE tax to W2 income — only federal/state income tax", () => {
    // A W2-only estimate should be meaningfully less than what SE tax + income tax would be on
    // the same amount, since W2 wages aren't subject to the 15.3% self-employment tax at all.
    const result = estimateW2Withholding(50000, "single", "TX", taxYear2026);
    expect(result.annualTotalEstimate).toBeLessThan(50000 * 0.153);
  });

  it("scales up with income (higher salary -> higher estimated withholding)", () => {
    const lower = estimateW2Withholding(40000, "single", "CA", taxYear2026);
    const higher = estimateW2Withholding(120000, "single", "CA", taxYear2026);
    expect(higher.annualTotalEstimate).toBeGreaterThan(lower.annualTotalEstimate);
  });
});

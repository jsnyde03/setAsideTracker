import { describe, expect, it } from "vitest";
import { calculateStateTax } from "../src/stateTax";
import { estimateTax } from "../src/estimate";
import { taxYear2026 } from "../src/taxYears/2026";

describe("calculateStateTax (2026)", () => {
  it("returns zero state tax for states with no income tax (FL, TX)", () => {
    const fl = calculateStateTax(50000, 3000, 0, "single", "FL", taxYear2026);
    expect(fl.supported).toBe(true);
    expect(fl.stateTax).toBe(0);

    const tx = calculateStateTax(50000, 3000, 0, "single", "TX", taxYear2026);
    expect(tx.supported).toBe(true);
    expect(tx.stateTax).toBe(0);
  });

  it("normalizes state code casing and whitespace", () => {
    const result = calculateStateTax(50000, 3000, 0, "single", " fl ", taxYear2026);
    expect(result.stateCode).toBe("FL");
    expect(result.supported).toBe(true);
  });

  it("applies PA's flat 3.07% rate with no standard deduction", () => {
    const result = calculateStateTax(50000, 3000, 0, "single", "PA", taxYear2026);
    // PA taxable income = 50000 - 3000 (no standard deduction)
    expect(result.taxableIncome).toBeCloseTo(47000, 2);
    expect(result.stateTax).toBeCloseTo(47000 * 0.0307, 2);
  });

  it("applies UT's flat 4.50% rate with no standard deduction (its exemption is credit-style, not modeled)", () => {
    const result = calculateStateTax(50000, 3000, 0, "single", "UT", taxYear2026);
    expect(result.supported).toBe(true);
    expect(result.taxableIncome).toBeCloseTo(47000, 2);
    expect(result.stateTax).toBeCloseTo(47000 * 0.045, 2);
  });

  it("applies the correct flat rate and standard deduction for each of the other flat-rate states", () => {
    const cases: { stateCode: string; rate: number; deduction: number }[] = [
      { stateCode: "AZ", rate: 0.025, deduction: 16100 },
      { stateCode: "IL", rate: 0.0495, deduction: 2925 },
      { stateCode: "MI", rate: 0.0425, deduction: 5900 },
      { stateCode: "CO", rate: 0.044, deduction: 16100 },
      { stateCode: "GA", rate: 0.0519, deduction: 12000 },
      { stateCode: "IN", rate: 0.0295, deduction: 1000 },
      { stateCode: "KY", rate: 0.035, deduction: 3360 },
    ];

    for (const { stateCode, rate, deduction } of cases) {
      const result = calculateStateTax(50000, 3000, 0, "single", stateCode, taxYear2026);
      const expectedTaxableIncome = 50000 - 3000 - deduction;
      expect(result.supported).toBe(true);
      expect(result.taxableIncome).toBeCloseTo(expectedTaxableIncome, 2);
      expect(result.stateTax).toBeCloseTo(expectedTaxableIncome * rate, 2);
    }
  });

  it("applies NC's flat 3.99% rate with its standard deduction", () => {
    const result = calculateStateTax(50000, 3000, 0, "single", "NC", taxYear2026);
    const expectedTaxableIncome = 50000 - 3000 - 12750;
    expect(result.taxableIncome).toBeCloseTo(expectedTaxableIncome, 2);
    expect(result.stateTax).toBeCloseTo(expectedTaxableIncome * 0.0399, 2);
  });

  it("applies the threshold-as-deduction flat states (ID, IA, MS, OH, LA) correctly", () => {
    const cases: { stateCode: string; rate: number; deduction: number }[] = [
      { stateCode: "ID", rate: 0.053, deduction: 4811 + 16100 },
      { stateCode: "IA", rate: 0.038, deduction: 16100 },
      { stateCode: "MS", rate: 0.04, deduction: 10000 + 2300 },
      { stateCode: "OH", rate: 0.0275, deduction: 26050 + 2400 },
      { stateCode: "LA", rate: 0.03, deduction: 14600 },
    ];

    for (const { stateCode, rate, deduction } of cases) {
      const result = calculateStateTax(80000, 3000, 0, "single", stateCode, taxYear2026);
      const expectedTaxableIncome = Math.max(0, 80000 - 3000 - deduction);
      expect(result.supported).toBe(true);
      expect(result.taxableIncome).toBeCloseTo(expectedTaxableIncome, 2);
      expect(result.stateTax).toBeCloseTo(expectedTaxableIncome * rate, 2);
    }
  });

  it("applies progressive brackets correctly for a representative sample of the newly added states", () => {
    // Alabama: simple 3-bracket structure, easy to hand-verify.
    const al = calculateStateTax(50000, 3000, 0, "single", "AL", taxYear2026);
    const alTaxableIncome = 50000 - 3000 - 4500; // 3000 std deduction + 1500 personal exemption
    const alExpectedTax = 500 * 0.02 + (3000 - 500) * 0.04 + (alTaxableIncome - 3000) * 0.05;
    expect(al.taxableIncome).toBeCloseTo(alTaxableIncome, 2);
    expect(al.stateTax).toBeCloseTo(alExpectedTax, 2);

    // Massachusetts: flat 5% below the millionaire's-tax threshold.
    const ma = calculateStateTax(80000, 3000, 0, "single", "MA", taxYear2026);
    const maTaxableIncome = 80000 - 3000 - 4400;
    expect(ma.stateTax).toBeCloseTo(maTaxableIncome * 0.05, 2);

    // Massachusetts: confirm the 9% surtax bracket actually kicks in above $1,083,150.
    const maHighEarner = calculateStateTax(1200000, 3000, 0, "single", "MA", taxYear2026);
    const maHighTaxableIncome = 1200000 - 3000 - 4400;
    const maHighExpectedTax =
      1083150 * 0.05 + (maHighTaxableIncome - 1083150) * 0.09;
    expect(maHighEarner.stateTax).toBeCloseTo(maHighExpectedTax, 2);

    // Delaware: confirm a small income is fully absorbed by the standard deduction (2500 - 3250
    // would be negative, so taxableIncome floors at 0 rather than going negative).
    const de = calculateStateTax(2500, 0, 0, "single", "DE", taxYear2026);
    expect(de.taxableIncome).toBe(0);
    expect(de.stateTax).toBe(0);
  });

  it("treats DC as supported now that all 50 states + DC are covered", () => {
    const result = calculateStateTax(60000, 3000, 0, "single", "DC", taxYear2026);
    expect(result.supported).toBe(true);
    expect(result.stateTax).toBeGreaterThan(0);
  });

  it("applies CA's progressive brackets and standard deduction for a single filer", () => {
    const result = calculateStateTax(60000, 3500, 0, "single", "CA", taxYear2026);
    const expectedTaxableIncome = 60000 - 3500 - 5706; // = 50,794

    expect(result.taxableIncome).toBeCloseTo(expectedTaxableIncome, 2);

    // 50,794 falls partway into the 6% bracket (40,245-55,866) for a single filer.
    const expectedTax =
      10756 * 0.01 +
      (25499 - 10756) * 0.02 +
      (40245 - 25499) * 0.04 +
      (expectedTaxableIncome - 40245) * 0.06;
    expect(result.stateTax).toBeCloseTo(expectedTax, 2);
  });

  it("applies NY's progressive brackets and standard deduction for a single filer", () => {
    const result = calculateStateTax(40000, 2000, 0, "single", "NY", taxYear2026);
    const expectedTaxableIncome = 40000 - 2000 - 8000;
    expect(result.taxableIncome).toBeCloseTo(expectedTaxableIncome, 2);

    // Falls in the 5.4% bracket (13,900-80,650) for a single filer.
    const expectedTax =
      8500 * 0.039 + (11700 - 8500) * 0.044 + (13900 - 11700) * 0.0515 + (expectedTaxableIncome - 13900) * 0.054;
    expect(result.stateTax).toBeCloseTo(expectedTax, 2);
  });

  it("applies MD's progressive brackets and standard deduction for a single filer", () => {
    const result = calculateStateTax(60000, 3500, 0, "single", "MD", taxYear2026);
    const expectedTaxableIncome = 60000 - 3500 - 3350; // = 53,150

    expect(result.taxableIncome).toBeCloseTo(expectedTaxableIncome, 2);

    // 53,150 falls partway into the 4.75% bracket (3,000-100,000) for a single filer.
    const expectedStateLevelTax =
      1000 * 0.02 + 1000 * 0.03 + 1000 * 0.04 + (expectedTaxableIncome - 3000) * 0.0475;
    expect(result.stateLevelTax).toBeCloseTo(expectedStateLevelTax, 2);

    // No county provided — MD has a local tax layer, so this must be flagged, not silently $0.
    expect(result.localTaxSupported).toBe(false);
    expect(result.localTax).toBe(0);
    expect(result.stateTax).toBeCloseTo(expectedStateLevelTax, 2);
  });

  describe("Maryland county piggyback tax", () => {
    it("applies a flat-rate county (Montgomery, 3.2%) on top of the state tax", () => {
      const result = calculateStateTax(60000, 3500, 0, "single", "MD", taxYear2026, "Montgomery County");
      const expectedTaxableIncome = 60000 - 3500 - 3350; // = 53,150
      const expectedStateLevelTax =
        1000 * 0.02 + 1000 * 0.03 + 1000 * 0.04 + (expectedTaxableIncome - 3000) * 0.0475;
      const expectedLocalTax = expectedTaxableIncome * 0.032;

      expect(result.localTaxSupported).toBe(true);
      expect(result.county).toBe("Montgomery County");
      expect(result.localTax).toBeCloseTo(expectedLocalTax, 2);
      expect(result.stateTax).toBeCloseTo(expectedStateLevelTax + expectedLocalTax, 2);
    });

    it("matches county names case-insensitively and trims whitespace", () => {
      const result = calculateStateTax(60000, 3500, 0, "single", "MD", taxYear2026, " montgomery county ");
      expect(result.localTaxSupported).toBe(true);
      expect(result.county).toBe("Montgomery County");
    });

    it("applies Frederick County's graduated/tiered local rate structure", () => {
      const result = calculateStateTax(200000, 10000, 0, "single", "MD", taxYear2026, "Frederick County");
      const taxableIncome = 200000 - 10000 - 3350; // = 186,650

      expect(result.taxableIncome).toBeCloseTo(taxableIncome, 2);

      // Frederick single tiers: 2.25% to 25k, 2.75% to 50k, 2.96% to 150k, 3.20% above.
      const expectedLocalTax =
        25000 * 0.0225 + 25000 * 0.0275 + 100000 * 0.0296 + (taxableIncome - 150000) * 0.032;
      expect(result.localTax).toBeCloseTo(expectedLocalTax, 2);
    });

    it("flags an unrecognized county name rather than silently charging $0 local tax", () => {
      const result = calculateStateTax(60000, 3500, 0, "single", "MD", taxYear2026, "Notarealcounty");
      expect(result.localTaxSupported).toBe(false);
      expect(result.localTax).toBe(0);
    });

    it("ignores a county argument for states with no local tax layer", () => {
      const result = calculateStateTax(60000, 3500, 0, "single", "CA", taxYear2026, "Some County");
      expect(result.localTaxSupported).toBe(true);
      expect(result.localTax).toBe(0);
      expect(result.county).toBeUndefined();
    });
  });

  it("flags unsupported jurisdictions instead of silently returning zero as if verified", () => {
    // All 50 states + DC are covered as of this revision, so there's no real state left to use
    // as an "unsupported" example — use a clearly invalid code (e.g. a US territory not modeled,
    // or a typo) to confirm the fallback path still works correctly.
    const result = calculateStateTax(50000, 3000, 0, "single", "PR", taxYear2026);
    expect(result.supported).toBe(false);
    expect(result.stateTax).toBe(0);
  });

  it("returns zero state tax for the rest of the no-income-tax states (AK, NV, SD, TN, WA, WY, NH)", () => {
    for (const stateCode of ["AK", "NV", "SD", "TN", "WA", "WY", "NH"]) {
      const result = calculateStateTax(50000, 3000, 0, "single", stateCode, taxYear2026);
      expect(result.supported).toBe(true);
      expect(result.stateTax).toBe(0);
    }
  });
});

describe("estimateTax with state tax (2026)", () => {
  it("adds state tax into the total for a CA gig worker", () => {
    const ca = estimateTax(
      { filingStatus: "single", netSelfEmploymentProfit: 60000, businessMiles: 0, otherTaxableIncome: 0, stateCode: "CA" },
      taxYear2026
    );
    const fl = estimateTax(
      { filingStatus: "single", netSelfEmploymentProfit: 60000, businessMiles: 0, otherTaxableIncome: 0, stateCode: "FL" },
      taxYear2026
    );

    expect(ca.stateTax.stateTax).toBeGreaterThan(0);
    expect(fl.stateTax.stateTax).toBe(0);
    // Same federal/SE tax (same income, same state-agnostic inputs); CA total should be higher by exactly the CA state tax.
    expect(ca.totalEstimatedTax - fl.totalEstimatedTax).toBeCloseTo(ca.stateTax.stateTax, 2);
  });
});

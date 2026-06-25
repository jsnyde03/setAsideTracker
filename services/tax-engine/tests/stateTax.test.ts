import { describe, expect, it } from "vitest";
import { calculateStateTax } from "../src/stateTax";
import { estimateTax } from "../src/estimate";
import { taxYear2026 } from "../src/taxYears/2026";
import { taxYear2025 } from "../src/taxYears/2025";

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

  it("applies UT's flat 4.50% rate with no standard deduction but its approximated $966 credit", () => {
    const result = calculateStateTax(50000, 3000, 0, "single", "UT", taxYear2026);
    expect(result.supported).toBe(true);
    expect(result.taxableIncome).toBeCloseTo(47000, 2);
    const grossTax = 47000 * 0.045;
    expect(result.stateLevelTax).toBeCloseTo(grossTax, 2);
    expect(result.creditApplied).toBeCloseTo(966, 2);
    expect(result.stateTax).toBeCloseTo(grossTax - 966, 2);
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

  describe("nonrefundable state tax credits", () => {
    it("applies Georgia's $4,000/dependent credit, which is material (not a rounding error)", () => {
      // High enough income that the $8,000 credit isn't capped by the gross tax owed — the
      // capped/floored scenario is covered separately below.
      const noKids = calculateStateTax(300000, 3000, 0, "single", "GA", taxYear2026, undefined, 0);
      const twoKids = calculateStateTax(300000, 3000, 0, "single", "GA", taxYear2026, undefined, 2);

      expect(noKids.creditApplied).toBe(0);
      expect(twoKids.creditApplied).toBeCloseTo(8000, 2);
      expect(noKids.stateTax - twoKids.stateTax).toBeCloseTo(8000, 2);
      // stateLevelTax (the gross, pre-credit figure) must be identical regardless of dependents —
      // only stateTax (the net total) should differ.
      expect(noKids.stateLevelTax).toBeCloseTo(twoKids.stateLevelTax, 2);
    });

    it("applies Minnesota's and South Carolina's per-dependent credits", () => {
      const mn = calculateStateTax(200000, 3000, 0, "single", "MN", taxYear2026, undefined, 1);
      expect(mn.creditApplied).toBeCloseTo(5300, 2);

      const sc = calculateStateTax(150000, 3000, 0, "single", "SC", taxYear2026, undefined, 1);
      expect(sc.creditApplied).toBeCloseTo(4930, 2);
    });

    it("combines a per-filer credit with a per-dependent credit (Arkansas)", () => {
      const result = calculateStateTax(50000, 3000, 0, "marriedFilingJointly", "AR", taxYear2026, undefined, 3);
      // $58 per-filer (MFJ) + 3 x $29 per-dependent = $145
      expect(result.creditApplied).toBeCloseTo(145, 2);
    });

    it("floors the nonrefundable credit at the state tax otherwise owed — never produces a refund", () => {
      // A tiny income with several dependents could otherwise compute a credit larger than the
      // gross tax; the applied amount must cap at stateLevelTax, and stateTax must floor at 0.
      const result = calculateStateTax(100, 0, 0, "single", "GA", taxYear2026, undefined, 5);
      expect(result.creditApplied).toBeLessThanOrEqual(result.stateLevelTax);
      expect(result.stateTax).toBeGreaterThanOrEqual(0);
    });

    it("defaults to 0 dependents when the parameter is omitted, matching pre-credit behavior", () => {
      const result = calculateStateTax(50000, 3000, 0, "single", "GA", taxYear2026);
      expect(result.creditApplied).toBe(0);
    });
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
      // LA's deduction is Louisiana's own figure ($12,875, first CPI-U-adjusted from $12,500 for
      // 2026) — not the federal conformity figure this test previously (incorrectly) assumed.
      { stateCode: "LA", rate: 0.03, deduction: 12875 },
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

  it("hand-verifies bracket math for the 19 progressive-bracket states added without a dedicated test", () => {
    // Connecticut: 3 brackets crossed (2% / 4.5% / 5.5%).
    const ct = calculateStateTax(75000, 0, 0, "single", "CT", taxYear2026);
    const ctTaxableIncome = 75000 - 15000;
    expect(ctTaxableIncome).toBeCloseTo(60000, 2);
    expect(ct.stateTax).toBeCloseTo(10000 * 0.02 + 40000 * 0.045 + 10000 * 0.055, 2);

    // Hawaii: 4 brackets crossed (1.4% / 3.2% / 5.5% / 6.4%).
    const hi = calculateStateTax(25544, 0, 0, "single", "HI", taxYear2026);
    const hiTaxableIncome = 25544 - (4400 + 1144);
    expect(hiTaxableIncome).toBeCloseTo(20000, 2);
    expect(hi.stateTax).toBeCloseTo(9600 * 0.014 + 4800 * 0.032 + 4800 * 0.055 + 800 * 0.064, 2);

    // Kansas: 2 brackets crossed (5.2% / 5.58%).
    const ks = calculateStateTax(42765, 0, 0, "single", "KS", taxYear2026);
    const ksTaxableIncome = 42765 - (3605 + 9160);
    expect(ksTaxableIncome).toBeCloseTo(30000, 2);
    expect(ks.stateTax).toBeCloseTo(23000 * 0.052 + 7000 * 0.0558, 2);

    // Maine: 2 brackets crossed (5.8% / 6.75%). Deduction is Maine's own COLA-indexed figure
    // ($15,300 + $5,300 personal exemption for 2026), not federal conformity.
    const me = calculateStateTax(50600, 0, 0, "single", "ME", taxYear2026);
    const meTaxableIncome = 50600 - (15300 + 5300);
    expect(meTaxableIncome).toBeCloseTo(30000, 2);
    expect(me.stateTax).toBeCloseTo(27399 * 0.058 + 2601 * 0.0675, 2);

    // Maine: confirm the new 2% surcharge bracket kicks in above $1M taxable income. At this
    // income the standard deduction is also fully phased out (income $1,020,600 is well past the
    // $102,250 threshold + $75,000 additional limit), so taxable income equals AGI.
    const meHighEarner = calculateStateTax(1020600, 0, 0, "single", "ME", taxYear2026);
    const meHighTaxableIncome = 1020600;
    const meHighExpectedTax =
      27399 * 0.058 + (64849 - 27399) * 0.0675 + (1000000 - 64849) * 0.0715 + (meHighTaxableIncome - 1000000) * 0.0915;
    expect(meHighEarner.stateTax).toBeCloseTo(meHighExpectedTax, 2);

    // Maine: deduction phaseout in the partial range, single filer $40,000 over the $102,250
    // threshold — ratio = 40000/75000, deduction reduced proportionally.
    const meMidPhaseout = calculateStateTax(142250, 0, 0, "single", "ME", taxYear2026);
    const meMidPhaseoutRatio = 40000 / 75000;
    const meMidPhaseoutDeduction = (15300 + 5300) * (1 - meMidPhaseoutRatio);
    const meMidPhaseoutTaxableIncome = 142250 - meMidPhaseoutDeduction;
    expect(meMidPhaseout.stateTax).toBeCloseTo(
      27399 * 0.058 + (64849 - 27399) * 0.0675 + (meMidPhaseoutTaxableIncome - 64849) * 0.0715,
      2
    );

    // Minnesota: 2 brackets crossed (5.35% / 6.8%) — separate from the credit-focused tests above.
    const mn = calculateStateTax(65300, 0, 0, "single", "MN", taxYear2026);
    const mnTaxableIncome = 65300 - 15300;
    expect(mnTaxableIncome).toBeCloseTo(50000, 2);
    expect(mn.stateLevelTax).toBeCloseTo(33310 * 0.0535 + 16690 * 0.068, 2);

    // Missouri: 7 non-zero brackets crossed, each exactly $1,348 wide.
    const mo = calculateStateTax(26100, 0, 0, "single", "MO", taxYear2026);
    const moTaxableIncome = 26100 - 16100;
    expect(moTaxableIncome).toBeCloseTo(10000, 2);
    const moExpectedTax =
      1348 * 0.02 + 1348 * 0.025 + 1348 * 0.03 + 1348 * 0.035 + 1348 * 0.04 + 1348 * 0.045 + 564 * 0.047;
    expect(mo.stateTax).toBeCloseTo(moExpectedTax, 2);

    // Montana: 2 brackets crossed (4.7% / 5.65%).
    const mt = calculateStateTax(76100, 0, 0, "single", "MT", taxYear2026);
    const mtTaxableIncome = 76100 - 16100;
    expect(mtTaxableIncome).toBeCloseTo(60000, 2);
    expect(mt.stateTax).toBeCloseTo(47500 * 0.047 + 12500 * 0.0565, 2);

    // Nebraska: all 3 brackets crossed (2.46% / 3.51% / 4.55%).
    const ne = calculateStateTax(38850, 0, 0, "single", "NE", taxYear2026);
    const neTaxableIncome = 38850 - 8850;
    expect(neTaxableIncome).toBeCloseTo(30000, 2);
    expect(ne.stateLevelTax).toBeCloseTo(4130 * 0.0246 + 20630 * 0.0351 + 5240 * 0.0455, 2);

    // New Jersey: 4 brackets crossed (1.4% / 1.75% / 3.5% / 5.53%).
    const nj = calculateStateTax(51000, 0, 0, "single", "NJ", taxYear2026);
    const njTaxableIncome = 51000 - 1000;
    expect(njTaxableIncome).toBeCloseTo(50000, 2);
    expect(nj.stateTax).toBeCloseTo(20000 * 0.014 + 15000 * 0.0175 + 5000 * 0.035 + 10000 * 0.0553, 2);

    // New Mexico: 3 brackets crossed (1.5% / 3.2% / 4.3%).
    const nm = calculateStateTax(36100, 0, 0, "single", "NM", taxYear2026);
    const nmTaxableIncome = 36100 - 16100;
    expect(nmTaxableIncome).toBeCloseTo(20000, 2);
    expect(nm.stateTax).toBeCloseTo(5500 * 0.015 + 11000 * 0.032 + 3500 * 0.043, 2);

    // North Dakota: 0% bracket then 1.95% above $48,475.
    const nd = calculateStateTax(76100, 0, 0, "single", "ND", taxYear2026);
    const ndTaxableIncome = 76100 - 16100;
    expect(ndTaxableIncome).toBeCloseTo(60000, 2);
    expect(nd.stateTax).toBeCloseTo(11525 * 0.0195, 2);

    // Oklahoma: 0% bracket then 2.5% and 3.5% brackets crossed.
    const ok = calculateStateTax(13350, 0, 0, "single", "OK", taxYear2026);
    const okTaxableIncome = 13350 - (6350 + 1000);
    expect(okTaxableIncome).toBeCloseTo(6000, 2);
    expect(ok.stateTax).toBeCloseTo(1150 * 0.025 + 1100 * 0.035, 2);

    // Oregon: 3 brackets crossed (4.75% / 6.75% / 8.75%).
    const or_ = calculateStateTax(17910, 0, 0, "single", "OR", taxYear2026);
    const orTaxableIncome = 17910 - 2910;
    expect(orTaxableIncome).toBeCloseTo(15000, 2);
    expect(or_.stateLevelTax).toBeCloseTo(4550 * 0.0475 + 6850 * 0.0675 + 3600 * 0.0875, 2);

    // Rhode Island: 2 brackets crossed (3.75% / 4.75%).
    const ri = calculateStateTax(116450, 0, 0, "single", "RI", taxYear2026);
    const riTaxableIncome = 116450 - (11200 + 5250);
    expect(riTaxableIncome).toBeCloseTo(100000, 2);
    expect(ri.stateTax).toBeCloseTo(82050 * 0.0375 + 17950 * 0.0475, 2);

    // South Carolina: 0% bracket then 3% and 6% brackets crossed — separate from the
    // credit-focused tests above.
    const sc = calculateStateTax(28350, 0, 0, "single", "SC", taxYear2026);
    const scTaxableIncome = 28350 - 8350;
    expect(scTaxableIncome).toBeCloseTo(20000, 2);
    expect(sc.stateLevelTax).toBeCloseTo(14590 * 0.03 + 1770 * 0.06, 2);

    // Vermont: 2 brackets crossed (3.35% / 6.6%).
    const vt = calculateStateTax(72950, 0, 0, "single", "VT", taxYear2026);
    const vtTaxableIncome = 72950 - 12950;
    expect(vtTaxableIncome).toBeCloseTo(60000, 2);
    expect(vt.stateTax).toBeCloseTo(49400 * 0.0335 + 10600 * 0.066, 2);

    // Virginia: 3 brackets crossed (2% / 3% / 5%).
    const va = calculateStateTax(19680, 0, 0, "single", "VA", taxYear2026);
    const vaTaxableIncome = 19680 - 9680;
    expect(vaTaxableIncome).toBeCloseTo(10000, 2);
    expect(va.stateTax).toBeCloseTo(3000 * 0.02 + 2000 * 0.03 + 5000 * 0.05, 2);

    // West Virginia: 3 brackets crossed (2.22% / 2.96% / 3.33%).
    const wv = calculateStateTax(32000, 0, 0, "single", "WV", taxYear2026);
    const wvTaxableIncome = 32000 - 2000;
    expect(wvTaxableIncome).toBeCloseTo(30000, 2);
    expect(wv.stateTax).toBeCloseTo(10000 * 0.0222 + 15000 * 0.0296 + 5000 * 0.0333, 2);

    // Wisconsin: 2 brackets crossed (3.5% / 4.4%).
    const wi = calculateStateTax(34660, 0, 0, "single", "WI", taxYear2026);
    const wiTaxableIncome = 34660 - (13960 + 700);
    expect(wiTaxableIncome).toBeCloseTo(20000, 2);
    expect(wi.stateTax).toBeCloseTo(15110 * 0.035 + 4890 * 0.044, 2);
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

    // 50,794 falls partway into the 6% bracket (41,452-57,542) for a single filer.
    const expectedTax =
      11079 * 0.01 +
      (26264 - 11079) * 0.02 +
      (41452 - 26264) * 0.04 +
      (expectedTaxableIncome - 41452) * 0.06;
    expect(result.stateTax).toBeCloseTo(expectedTax, 2);
  });

  it("applies CA's flat (non-doubled) $1M MHSA surcharge threshold for MFJ, not $2M", () => {
    // MFJ taxable income of $1,200,000 falls inside the statutory 11.3% bracket (891,542 to
    // 1,485,906), but the surcharge threshold is flat at $1,000,000 regardless of filing status —
    // so income from $1,000,000 to $1,200,000 should be taxed at 12.3% (11.3% + 1% surcharge),
    // not 11.3% as it would be if the surcharge were incorrectly doubled to $2M for joint filers.
    const result = calculateStateTax(1200000 + 11412, 0, 0, "marriedFilingJointly", "CA", taxYear2026);
    const taxableIncome = 1200000;
    const expectedTax =
      22158 * 0.01 +
      (52528 - 22158) * 0.02 +
      (82904 - 52528) * 0.04 +
      (115084 - 82904) * 0.06 +
      (145448 - 115084) * 0.08 +
      (742958 - 145448) * 0.093 +
      (891542 - 742958) * 0.103 +
      (1000000 - 891542) * 0.113 +
      (taxableIncome - 1000000) * 0.123;
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

  describe("PA and NY local tax", () => {
    it("flags PA local tax as unsupported (not silently $0) when no municipality is given", () => {
      const result = calculateStateTax(50000, 3000, 0, "single", "PA", taxYear2026);
      expect(result.supported).toBe(true);
      expect(result.localTaxSupported).toBe(false);
      expect(result.localTax).toBe(0);
    });

    it("applies Philadelphia's flat 3.72% blended local wage tax on top of PA state tax", () => {
      const result = calculateStateTax(50000, 3000, 0, "single", "PA", taxYear2026, "Philadelphia");
      const taxableIncome = 47000;
      const expectedLocalTax = taxableIncome * 0.0372;

      expect(result.localTaxSupported).toBe(true);
      expect(result.localTax).toBeCloseTo(expectedLocalTax, 2);
      expect(result.stateTax).toBeCloseTo(taxableIncome * 0.0307 + expectedLocalTax, 2);
    });

    it("applies Pittsburgh's flat 3.0% combined city + school district EIT", () => {
      const result = calculateStateTax(50000, 3000, 0, "single", "PA", taxYear2026, "Pittsburgh");
      const taxableIncome = 47000;
      expect(result.localTaxSupported).toBe(true);
      expect(result.localTax).toBeCloseTo(taxableIncome * 0.03, 2);
    });

    it("flags an unrecognized PA municipality rather than silently charging $0 local tax", () => {
      const result = calculateStateTax(50000, 3000, 0, "single", "PA", taxYear2026, "Some Small Township");
      expect(result.localTaxSupported).toBe(false);
      expect(result.localTax).toBe(0);
    });

    it("flags NY local tax as unsupported (not silently $0) when no city is given", () => {
      const result = calculateStateTax(50000, 3000, 0, "single", "NY", taxYear2026);
      expect(result.supported).toBe(true);
      expect(result.localTaxSupported).toBe(false);
      expect(result.localTax).toBe(0);
    });

    it("applies NYC's graduated local resident tax on top of NY state tax", () => {
      const result = calculateStateTax(80000, 4000, 0, "single", "NY", taxYear2026, "New York City");
      const taxableIncome = 80000 - 4000 - 8000; // = 68,000

      expect(result.localTaxSupported).toBe(true);
      const expectedLocalTax =
        12000 * 0.03078 + 13000 * 0.03762 + 25000 * 0.03819 + (taxableIncome - 50000) * 0.03876;
      expect(result.localTax).toBeCloseTo(expectedLocalTax, 2);
    });

    it("flags an unrecognized NY city rather than silently charging $0 local tax", () => {
      const result = calculateStateTax(50000, 3000, 0, "single", "NY", taxYear2026, "Buffalo");
      expect(result.localTaxSupported).toBe(false);
      expect(result.localTax).toBe(0);
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

describe("calculateStateTax (2025 backfill)", () => {
  it("covers all 50 states + DC for 2025, not just the original 10-jurisdiction set", () => {
    const allJurisdictions = [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
      "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
      "VA", "WA", "WV", "WI", "WY", "DC",
    ];
    for (const stateCode of allJurisdictions) {
      const result = calculateStateTax(50000, 3000, 0, "single", stateCode, taxYear2025);
      expect(result.supported).toBe(true);
    }
  });

  it("applies GA's pre-phase-down 5.39% rate for 2025 (vs 5.19% for 2026)", () => {
    const result = calculateStateTax(60000, 4000, 0, "single", "GA", taxYear2025, undefined, 0);
    const taxableIncome = 60000 - 4000 - 12000;
    expect(result.stateLevelTax).toBeCloseTo(taxableIncome * 0.0539, 2);
  });

  it("applies KY's flat $3,270 standard deduction, not doubled for joint filers", () => {
    const single = calculateStateTax(50000, 3000, 0, "single", "KY", taxYear2025);
    const mfj = calculateStateTax(50000, 3000, 0, "marriedFilingJointly", "KY", taxYear2025);
    expect(single.taxableIncome).toBeCloseTo(50000 - 3000 - 3270, 2);
    expect(mfj.taxableIncome).toBeCloseTo(50000 - 3000 - 3270, 2);
  });

  it("models OH as graduated brackets for 2025 (pre-2026 simplification to a single flat rate)", () => {
    const result = calculateStateTax(150000, 8000, 0, "single", "OH", taxYear2025);
    const taxableIncome = 150000 - 8000; // = 142,000
    // 0% up to 28,450; 2.75% from 28,450 to 102,400; 3.5% above 102,400.
    const expectedTax = (102400 - 28450) * 0.0275 + (taxableIncome - 102400) * 0.035;
    expect(result.stateLevelTax).toBeCloseTo(expectedTax, 2);
  });

  it("applies Maryland's retroactive 10-bracket structure for 2025, same as 2026", () => {
    const result2025 = calculateStateTax(200000, 10000, 0, "single", "MD", taxYear2025, "Montgomery County");
    const result2026 = calculateStateTax(200000, 10000, 0, "single", "MD", taxYear2026, "Montgomery County");
    expect(result2025.stateTax).toBeCloseTo(result2026.stateTax, 2);
  });

  it("wires up Philadelphia local tax for PA in 2025 (not silently $0)", () => {
    const result = calculateStateTax(50000, 3000, 0, "single", "PA", taxYear2025, "Philadelphia");
    expect(result.localTaxSupported).toBe(true);
    expect(result.localTax).toBeGreaterThan(0);
  });

  it("uses the OBBBA-corrected $15,750/$31,500 federal-conforming standard deduction for 2025 (CO)", () => {
    const result = calculateStateTax(50000, 3000, 0, "single", "CO", taxYear2025);
    expect(result.taxableIncome).toBeCloseTo(50000 - 3000 - 15750, 2);
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

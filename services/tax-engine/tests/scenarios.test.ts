import { describe, expect, it } from "vitest";
import { estimateTax } from "../src/estimate";
import { taxYear2026 } from "../src/taxYears/2026";

/**
 * Full-pipeline regression scenarios — each calls estimateTax() with a realistic user persona
 * and asserts hand-verified expected values computed from first principles (see inline comments).
 *
 * The goal is pre-submission confidence that every major code path through the engine is correct:
 * filing-status-specific deductions/brackets (all four statuses), the SS wage base cap and
 * Additional Medicare Tax, the Child Tax Credit (nonrefundable and refundable ACTC paths), state
 * tax for representative states, state tax credits (OR per-filer + per-dependent), and the
 * otherFicaWages vs. otherTaxableIncome distinction for W2+SE combined filers.
 *
 * All scenarios use the 2026 tax year config (the current default). Where values are computed
 * from a multi-step bracket formula the intermediate breakdown is shown in comments so a reader
 * can re-derive them independently rather than just trusting the number.
 */
describe("Regression scenarios — full estimateTax() pipeline (2026)", () => {
  // ─── Scenario 1: MFJ, TX, $100k SE ──────────────────────────────────────────────────────────
  // Purpose: verifies MFJ standard deduction ($32,200, double the single $16,100) and the MFJ
  // bracket structure, in the simplest possible setting (no state tax, no children, no mileage).
  it("MFJ, TX, $100k pure SE — MFJ standard deduction and brackets, no state tax", () => {
    const result = estimateTax(
      {
        filingStatus: "marriedFilingJointly",
        netSelfEmploymentProfit: 100000,
        businessMiles: 0,
        otherTaxableIncome: 0,
        stateCode: "TX",
      },
      taxYear2026
    );

    // SE tax (2026 SS wage base = $184,500 — 2026 AMT threshold MFJ = $250,000):
    //   netEarningsFromSE = 100000 × 0.9235 = 92,350
    //   SS = 92,350 × 0.124 = 11,451.40 (under $184,500 base — no cap)
    //   Medicare = 92,350 × 0.029 = 2,678.15
    //   Additional Medicare: 92,350 < 250,000 → 0
    //   totalSeTax = 14,129.55; deductibleSeTaxPortion = 7,064.775
    expect(result.seTax.netEarningsFromSE).toBeCloseTo(92350, 2);
    expect(result.seTax.socialSecurityTax).toBeCloseTo(11451.4, 2);
    expect(result.seTax.medicareTax).toBeCloseTo(2678.15, 2);
    expect(result.seTax.additionalMedicareTax).toBe(0);
    expect(result.seTax.totalSeTax).toBeCloseTo(14129.55, 2);
    expect(result.seTax.deductibleSeTaxPortion).toBeCloseTo(7064.775, 3);

    // Federal income tax:
    //   AGI = 100,000 − 7,064.775 = 92,935.225
    //   MFJ standard deduction (2026) = $32,200
    //   taxableIncome = 92,935.225 − 32,200 = 60,735.225
    //   10% on $0–$24,800:       2,480.000
    //   12% on $24,800–$60,735.225: 35,935.225 × 0.12 = 4,312.227
    //   incomeTax = 6,792.227
    expect(result.federalIncomeTax.adjustedGrossIncome).toBeCloseTo(92935.225, 3);
    expect(result.federalIncomeTax.taxableIncome).toBeCloseTo(60735.225, 3);
    expect(result.federalIncomeTax.incomeTax).toBeCloseTo(6792.227, 2);

    expect(result.stateTax.stateTax).toBe(0); // TX — no state income tax
    expect(result.childTaxCredit.totalCredit).toBe(0); // no children
    expect(result.totalEstimatedTax).toBeCloseTo(20921.777, 2);
    expect(result.effectiveSetAsideRate).toBeCloseTo(20921.777 / 100000, 4);
  });

  // ─── Scenario 2: HoH, OR, $75k SE, 2 kids ───────────────────────────────────────────────────
  // Purpose: exercises Head of Household brackets and standard deduction ($24,150), the CTC fully
  // absorbed as nonrefundable (income tax > credit), and Oregon's per-filer + per-dependent credit
  // mechanism (256 + 2×256 = $768 credit applied against state tax).
  it("HoH, OR, $75k SE, 2 kids — HoH brackets, nonrefundable CTC, OR per-filer + per-dependent credit", () => {
    const result = estimateTax(
      {
        filingStatus: "headOfHousehold",
        netSelfEmploymentProfit: 75000,
        businessMiles: 0,
        otherTaxableIncome: 0,
        stateCode: "OR",
        numberOfChildren: 2,
      },
      taxYear2026
    );

    // SE tax (AMT threshold HoH = $200,000):
    //   netEarningsFromSE = 75,000 × 0.9235 = 69,262.50
    //   SS = 69,262.50 × 0.124 = 8,588.55; Medicare = 69,262.50 × 0.029 = 2,008.6125
    //   Additional Medicare: 69,262.50 < 200,000 → 0
    //   totalSeTax = 10,597.1625; deductibleSeTaxPortion = 5,298.58125
    expect(result.seTax.netEarningsFromSE).toBeCloseTo(69262.5, 2);
    expect(result.seTax.totalSeTax).toBeCloseTo(10597.1625, 3);

    // Federal income tax:
    //   AGI = 75,000 − 5,298.58125 = 69,701.41875
    //   HoH standard deduction (2026) = $24,150
    //   taxableIncome = 69,701.41875 − 24,150 = 45,551.41875
    //   10% on $0–$17,700:            1,770.000
    //   12% on $17,700–$45,551.41875: 27,851.41875 × 0.12 = 3,342.170
    //   incomeTax = 5,112.170
    expect(result.federalIncomeTax.taxableIncome).toBeCloseTo(45551.41875, 3);
    expect(result.federalIncomeTax.incomeTax).toBeCloseTo(5112.170, 2);

    // Child Tax Credit (2026: $2,200/child, phase-out threshold $200,000 for non-MFJ):
    //   creditBeforePhaseOut = 2 × $2,200 = $4,400 (AGI $69,701 << $200,000 → no phase-out)
    //   incomeTax $5,112 > $4,400 → fully nonrefundable; refundable portion = 0
    expect(result.childTaxCredit.nonrefundableCredit).toBeCloseTo(4400, 2);
    expect(result.childTaxCredit.refundableCredit).toBe(0);
    expect(result.childTaxCredit.totalCredit).toBeCloseTo(4400, 2);

    // OR state tax (2026 standard deduction = $2,910 for single/HoH):
    //   state taxable income = 75,000 − 5,298.58125 − 2,910 = 66,791.41875
    //   4.75% on $0–$4,550:          216.125
    //   6.75% on $4,550–$11,400:     6,850 × 0.0675 = 462.375
    //   8.75% on $11,400–$66,791.42: 55,391.41875 × 0.0875 = 4,846.749
    //   stateLevelTax = 5,525.249
    //   Per-filer credit (HoH) = $256 + 2 × $256 per-dependent = $768
    //   creditApplied = 768 (stateLevelTax >> credit → no cap); stateTax = 5,525.249 − 768 = 4,757.249
    expect(result.stateTax.stateLevelTax).toBeCloseTo(5525.249, 2);
    expect(result.stateTax.creditApplied).toBeCloseTo(768, 2);
    expect(result.stateTax.stateTax).toBeCloseTo(4757.249, 2);

    // Total: seTax + (incomeTax − nonrefundableCTC) + stateTax
    //      = 10,597.1625 + (5,112.170 − 4,400) + 4,757.249
    //      = 10,597.1625 + 712.170 + 4,757.249 = 16,066.582
    expect(result.totalEstimatedTax).toBeCloseTo(16066.58, 1);
  });

  // ─── Scenario 3: MFS, NY, $80k SE ───────────────────────────────────────────────────────────
  // Purpose: verifies Married Filing Separately uses the same bracket/deduction as single (not
  // MFJ halved amounts — that would be wrong), the lower MFS Additional Medicare Tax threshold
  // ($125,000 vs. $200,000 for single), and New York's progressive state tax.
  it("MFS, NY, $80k SE — MFS uses single-equivalent brackets, MFS AMT threshold, NY state tax", () => {
    const result = estimateTax(
      {
        filingStatus: "marriedFilingSeparately",
        netSelfEmploymentProfit: 80000,
        businessMiles: 0,
        otherTaxableIncome: 0,
        stateCode: "NY",
      },
      taxYear2026
    );

    // SE tax (MFS AMT threshold = $125,000 — lower than single/HoH $200,000):
    //   netEarningsFromSE = 80,000 × 0.9235 = 73,880
    //   SS = 73,880 × 0.124 = 9,161.12; Medicare = 73,880 × 0.029 = 2,142.52
    //   Additional Medicare: 73,880 < 125,000 → 0 (the MFS threshold is lower, but still not triggered here)
    //   totalSeTax = 11,303.64; deductibleSeTaxPortion = 5,651.82
    expect(result.seTax.netEarningsFromSE).toBeCloseTo(73880, 2);
    expect(result.seTax.socialSecurityTax).toBeCloseTo(9161.12, 2);
    expect(result.seTax.medicareTax).toBeCloseTo(2142.52, 2);
    expect(result.seTax.additionalMedicareTax).toBe(0);
    expect(result.seTax.totalSeTax).toBeCloseTo(11303.64, 2);

    // Federal income tax (MFS = same brackets and deduction as single for 2026):
    //   AGI = 80,000 − 5,651.82 = 74,348.18
    //   MFS standard deduction (2026) = $16,100 (same as single — MFS is NOT half of MFJ $32,200)
    //   taxableIncome = 74,348.18 − 16,100 = 58,248.18
    //   10%: $12,400 × 0.10 = 1,240
    //   12%: $38,000 × 0.12 = 4,560   (12400 to 50400)
    //   22%: $7,848.18 × 0.22 = 1,726.60  (50400 to 58248.18)
    //   incomeTax = 7,526.60
    expect(result.federalIncomeTax.taxableIncome).toBeCloseTo(58248.18, 2);
    expect(result.federalIncomeTax.incomeTax).toBeCloseTo(7526.60, 2);

    // NY state tax (MFS uses same standard deduction as single — $8,000):
    //   state taxable income = 80,000 − 5,651.82 − 8,000 = 66,348.18
    //   3.9% on $0–$8,500:            331.50
    //   4.4% on $8,500–$11,700:       140.80
    //   5.15% on $11,700–$13,900:     113.30
    //   5.4% on $13,900–$66,348.18:   52,448.18 × 0.054 = 2,832.20
    //   NY stateTax = 3,417.80
    expect(result.stateTax.taxableIncome).toBeCloseTo(66348.18, 2);
    expect(result.stateTax.stateTax).toBeCloseTo(3417.80, 2);

    expect(result.childTaxCredit.totalCredit).toBe(0);
    // Total = 11,303.64 + 7,526.60 + 3,417.80 = 22,248.04
    expect(result.totalEstimatedTax).toBeCloseTo(22248.04, 2);
  });

  // ─── Scenario 4: Single, TX, $300k SE — SS wage base cap + Additional Medicare Tax ──────────
  // Purpose: at $300k net SE profit, the net earnings from SE ($277,050) blow past both the 2026
  // SS wage base ($184,500) and the single AMT threshold ($200,000). This verifies the SS cap
  // is applied correctly and the 0.9% Additional Medicare Tax fires on the excess.
  it("Single, TX, $300k SE — SS wage base cap (2026: $184,500) and Additional Medicare Tax", () => {
    const result = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 300000,
        businessMiles: 0,
        otherTaxableIncome: 0,
        stateCode: "TX",
      },
      taxYear2026
    );

    // SE tax:
    //   netEarningsFromSE = 300,000 × 0.9235 = 277,050
    //   SS = 184,500 × 0.124 = 22,878 (capped at 2026 wage base of $184,500)
    //   Medicare = 277,050 × 0.029 = 8,034.45
    //   Additional Medicare: (277,050 − 200,000) × 0.009 = 77,050 × 0.009 = 693.45
    //   totalSeTax = 22,878 + 8,034.45 + 693.45 = 31,605.90
    //   deductibleSeTaxPortion = (22,878 + 8,034.45) / 2 = 15,456.225 (AMT portion not deductible)
    expect(result.seTax.netEarningsFromSE).toBeCloseTo(277050, 2);
    expect(result.seTax.socialSecurityTax).toBeCloseTo(22878, 2);
    expect(result.seTax.medicareTax).toBeCloseTo(8034.45, 2);
    expect(result.seTax.additionalMedicareTax).toBeCloseTo(693.45, 2);
    expect(result.seTax.totalSeTax).toBeCloseTo(31605.9, 1);
    expect(result.seTax.deductibleSeTaxPortion).toBeCloseTo(15456.225, 3);

    // Federal income tax (crossing five brackets):
    //   AGI = 300,000 − 15,456.225 = 284,543.775
    //   standard deduction = $16,100; taxableIncome = 268,443.775
    //   10% on $0–$12,400:             1,240.00
    //   12% on $12,400–$50,400:        4,560.00
    //   22% on $50,400–$105,700:      12,166.00
    //   24% on $105,700–$201,775:     23,058.00   (96,075 × 0.24)
    //   32% on $201,775–$256,225:     17,424.00   (54,450 × 0.32)
    //   35% on $256,225–$268,443.775:  4,276.57   (12,218.775 × 0.35)
    //   incomeTax = 62,724.57
    expect(result.federalIncomeTax.taxableIncome).toBeCloseTo(268443.775, 2);
    expect(result.federalIncomeTax.incomeTax).toBeCloseTo(62724.57, 2);

    expect(result.stateTax.stateTax).toBe(0); // TX
    // Total = 31,605.90 + 62,724.57 = 94,330.47
    expect(result.totalEstimatedTax).toBeCloseTo(94330.47, 2);
  });

  // ─── Scenario 5: Single, CA, $50k SE + $60k W2 (otherFicaWages) ─────────────────────────────
  // Purpose: the combined W2+SE persona. The $60k W2 income pushes SE income into higher federal
  // brackets. The otherFicaWages parameter (= W2 FICA-taxable wages) reduces the available SS
  // wage base before SE earnings are charged SS — here $60k is well under $184,500 so the SS
  // base isn't exhausted. CA state tax stacks on top of the combined income.
  it("Single, CA, $50k SE + $60k W2 — W2 bracket-push, FICA base interaction, CA state tax", () => {
    const result = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 50000,
        businessMiles: 0,
        otherTaxableIncome: 60000,
        otherFicaWages: 60000, // W2 gross minus pretax benefits (no benefits in this case)
        stateCode: "CA",
      },
      taxYear2026
    );

    // SE tax (otherFicaWages = $60k reduces available SS base and AMT threshold):
    //   netEarningsFromSE = 50,000 × 0.9235 = 46,175
    //   availableSsBase = 184,500 − 60,000 = 124,500; 46,175 < 124,500 → no SS cap
    //   SS = 46,175 × 0.124 = 5,725.70
    //   Medicare = 46,175 × 0.029 = 1,339.075
    //   availableAmtThreshold = 200,000 − 60,000 = 140,000; 46,175 < 140,000 → no AMT
    //   totalSeTax = 7,064.775; deductibleSeTaxPortion = 3,532.3875
    expect(result.seTax.socialSecurityTax).toBeCloseTo(5725.7, 2);
    expect(result.seTax.additionalMedicareTax).toBeCloseTo(0, 2);
    expect(result.seTax.totalSeTax).toBeCloseTo(7064.775, 3);

    // Federal income tax (W2 income stacks on top — both income sources taxed at combined bracket):
    //   AGI = 50,000 − 3,532.3875 + 60,000 = 106,467.6125
    //   standard deduction = $16,100; taxableIncome = 90,367.6125
    //   10% on $0–$12,400:           1,240.00
    //   12% on $12,400–$50,400:      4,560.00
    //   22% on $50,400–$90,367.61:  39,967.61 × 0.22 = 8,792.87
    //   incomeTax = 14,592.87
    expect(result.federalIncomeTax.adjustedGrossIncome).toBeCloseTo(106467.6125, 3);
    expect(result.federalIncomeTax.taxableIncome).toBeCloseTo(90367.6125, 3);
    expect(result.federalIncomeTax.incomeTax).toBeCloseTo(14592.87, 2);

    // CA state tax (single, standard deduction = $5,706):
    //   state taxable income = 50,000 − 3,532.3875 + 60,000 − 5,706 = 100,761.6125
    //   Falls in the 9.3% bracket ($72,724–$371,479):
    //   1%:   $11,079 × 0.01 =   110.79
    //   2%:   $15,185 × 0.02 =   303.70  (11079 to 26264)
    //   4%:   $15,188 × 0.04 =   607.52  (26264 to 41452)
    //   6%:   $16,090 × 0.06 =   965.40  (41452 to 57542)
    //   8%:   $15,182 × 0.08 = 1,214.56  (57542 to 72724)
    //   9.3%: $28,037.61 × 0.093 = 2,607.50  (72724 to 100761.61)
    //   CA stateTax ≈ 5,809.47
    expect(result.stateTax.stateTax).toBeCloseTo(5809.47, 1);

    // W2 withholding estimate is for the $60k W2 income in isolation (independent of SE income)
    expect(result.w2WithholdingEstimate.annualTotalEstimate).toBeGreaterThan(0);

    // Total = 7,064.775 + 14,592.87 + 5,809.47 = 27,467.12
    expect(result.totalEstimatedTax).toBeCloseTo(27467.12, 1);
  });

  // ─── Scenario 6: Single, OR, $12k SE, 2 kids — refundable ACTC + OR credit caps at state tax ─
  // Purpose: at low income, the standard deduction ($16,100) exceeds AGI → federal income tax = 0.
  // With zero income tax, the nonrefundable CTC is $0 and the refundable ACTC formula applies,
  // limited by 15% of earned income over $2,500. OR's per-filer + per-dependent credit ($768)
  // exceeds the state-level tax ($465.35), so OR stateTax is floored at $0 (credit caps at
  // stateLevelTax — the nonrefundable credit can never generate a net refund). The refundable
  // ACTC ($1,425) partially offsets SE tax, leaving a small positive total.
  it("Single, OR, $12k SE, 2 kids — ACTC earned-income formula; OR credit caps at stateLevelTax", () => {
    const result = estimateTax(
      {
        filingStatus: "single",
        netSelfEmploymentProfit: 12000,
        businessMiles: 0,
        otherTaxableIncome: 0,
        stateCode: "OR",
        numberOfChildren: 2,
      },
      taxYear2026
    );

    // SE tax:
    //   netEarningsFromSE = 12,000 × 0.9235 = 11,082
    //   SS = 11,082 × 0.124 = 1,374.168; Medicare = 11,082 × 0.029 = 321.378
    //   totalSeTax = 1,695.546; deductibleSeTaxPortion = 847.773
    expect(result.seTax.totalSeTax).toBeCloseTo(1695.546, 2);

    // Federal income tax:
    //   AGI = 12,000 − 847.773 = 11,152.227
    //   standard deduction = $16,100; taxableIncome = max(0, 11,152.227 − 16,100) = 0
    //   incomeTax = 0
    expect(result.federalIncomeTax.taxableIncome).toBe(0);
    expect(result.federalIncomeTax.incomeTax).toBe(0);

    // Child Tax Credit:
    //   nonrefundableCredit = min($4,400, incomeTax=$0) = 0
    //   ACTC (refundable): min(creditBeforePhaseOut=$4,400, refundableCap=2×$1,700=$3,400,
    //                          earnedIncomeLimit=0.15×(12,000−2,500)=$1,425) = 1,425
    expect(result.childTaxCredit.nonrefundableCredit).toBe(0);
    expect(result.childTaxCredit.refundableCredit).toBeCloseTo(1425, 2);

    // OR state tax:
    //   state taxable income = 12,000 − 847.773 − 2,910 = 8,242.227
    //   4.75% on $0–$4,550:       216.125
    //   6.75% on $4,550–$8,242.23: 3,692.23 × 0.0675 = 249.226
    //   stateLevelTax = 465.351
    //   OR credit = $256 (per-filer, single) + 2 × $256 (per-dependent) = $768
    //   $768 > $465.351 → creditApplied is capped at stateLevelTax; stateTax = 0
    expect(result.stateTax.stateLevelTax).toBeCloseTo(465.35, 1);
    expect(result.stateTax.creditApplied).toBeCloseTo(result.stateTax.stateLevelTax, 2);
    expect(result.stateTax.stateTax).toBe(0);

    // Total = max(0, 1,695.546 + 0 + 0 − 1,425) = 270.546
    expect(result.totalEstimatedTax).toBeCloseTo(270.546, 2);
  });
});

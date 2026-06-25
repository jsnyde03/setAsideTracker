import type { TaxYearConfig } from "../types";

/**
 * 2025 tax year figures (IRS Rev. Proc. 2024-40 for brackets/standard deduction,
 * IRS Notice 2025-5 for the standard mileage rate, SSA wage base announcement for SS cap).
 * MUST be reviewed and updated for each new tax year — see ROADMAP §6 (annual review process).
 */
export const taxYear2025: TaxYearConfig = {
  year: 2025,
  federalBrackets: {
    single: [
      { min: 0, max: 11925, rate: 0.1 },
      { min: 11925, max: 48475, rate: 0.12 },
      { min: 48475, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 },
      { min: 197300, max: 250525, rate: 0.32 },
      { min: 250525, max: 626350, rate: 0.35 },
      { min: 626350, max: null, rate: 0.37 },
    ],
    marriedFilingJointly: [
      { min: 0, max: 23850, rate: 0.1 },
      { min: 23850, max: 96950, rate: 0.12 },
      { min: 96950, max: 206700, rate: 0.22 },
      { min: 206700, max: 394600, rate: 0.24 },
      { min: 394600, max: 501050, rate: 0.32 },
      { min: 501050, max: 751600, rate: 0.35 },
      { min: 751600, max: null, rate: 0.37 },
    ],
  },
  standardDeduction: {
    single: 15000,
    marriedFilingJointly: 30000,
  },
  socialSecurityWageBase: 176100,
  additionalMedicareThreshold: {
    single: 200000,
    marriedFilingJointly: 250000,
  },
  standardMileageRate: 0.7,
  // Only the structurally stable, high-confidence states are backfilled for 2025 — CA/NY 2025
  // bracket data wasn't re-verified when the state tax module was added (it was built against
  // 2026, the current default). CA/NY under this 2025 config will report supported: false until
  // someone backfills verified 2025 figures.
  stateTaxConfigs: {
    TX: { type: "none" },
    FL: { type: "none" },
    PA: { type: "flat", rate: 0.0307 },
    // Equally stable/no-income-tax for 2025 as for 2026 — see stateTaxConfigs/2026.ts's doc
    // comment for per-state notes (NH's repeal took effect Jan 1, 2025, so it applies for this
    // year too; WA's capital-gains-only excise tax doesn't apply to wage/SE income).
    AK: { type: "none" },
    NV: { type: "none" },
    SD: { type: "none" },
    TN: { type: "none" },
    WA: { type: "none" },
    WY: { type: "none" },
    NH: { type: "none" },
  },
  // Per the One Big Beautiful Bill Act (signed July 2025), the Child Tax Credit is permanently
  // $2,200/child starting this tax year (no longer reverting to the pre-TCJA $1,000 figure).
  // Refundable ACTC cap and phase-out mechanics carried forward from pre-OBBBA TCJA figures —
  // verify against the official 2025 indexed amounts before relying on this for real filings.
  childTaxCredit: {
    amountPerChild: 2200,
    refundableCapPerChild: 1700,
    phaseOutThreshold: { single: 200000, marriedFilingJointly: 400000 },
    phaseOutReductionPer1000: 50,
  },
};

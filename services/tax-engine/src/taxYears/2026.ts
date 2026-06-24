import type { TaxYearConfig } from "../types";
import { stateTaxConfigs2026 } from "../stateTaxConfigs/2026";

/**
 * 2026 tax year figures, confirmed via:
 * - IRS Rev. Proc. 2025-32 (federal brackets/standard deduction, includes One Big Beautiful Bill Act amendments)
 * - IRS Notice 2026-10 (standard mileage rate, effective Jan 1, 2026: 72.5 cents/mile, up from 70 cents in 2025)
 * - SSA 2026 COLA Fact Sheet (Social Security wage base: $184,500, up from $176,100 in 2025)
 * Additional Medicare Tax thresholds are fixed by statute (not inflation-adjusted) and unchanged from 2025.
 * MUST be reviewed and updated for each new tax year — see ROADMAP §6 (annual review process).
 */
export const taxYear2026: TaxYearConfig = {
  year: 2026,
  federalBrackets: {
    single: [
      { min: 0, max: 12400, rate: 0.1 },
      { min: 12400, max: 50400, rate: 0.12 },
      { min: 50400, max: 105700, rate: 0.22 },
      { min: 105700, max: 201775, rate: 0.24 },
      { min: 201775, max: 256225, rate: 0.32 },
      { min: 256225, max: 640600, rate: 0.35 },
      { min: 640600, max: null, rate: 0.37 },
    ],
    marriedFilingJointly: [
      { min: 0, max: 24800, rate: 0.1 },
      { min: 24800, max: 100800, rate: 0.12 },
      { min: 100800, max: 211400, rate: 0.22 },
      { min: 211400, max: 403550, rate: 0.24 },
      { min: 403550, max: 512450, rate: 0.32 },
      { min: 512450, max: 768700, rate: 0.35 },
      { min: 768700, max: null, rate: 0.37 },
    ],
  },
  standardDeduction: {
    single: 16100,
    marriedFilingJointly: 32200,
  },
  socialSecurityWageBase: 184500,
  additionalMedicareThreshold: {
    single: 200000,
    marriedFilingJointly: 250000,
  },
  standardMileageRate: 0.725,
  stateTaxConfigs: stateTaxConfigs2026,
  // Carried forward from the 2025 OBBBA-set $2,200/child figure — the IRS hadn't published the
  // 2026 inflation-indexed amount at build time. Likely a small upward adjustment; verify against
  // the official figure once published, same caveat as the provisional NY brackets above.
  childTaxCredit: {
    amountPerChild: 2200,
    refundableCapPerChild: 1700,
    phaseOutThreshold: { single: 200000, marriedFilingJointly: 400000 },
    phaseOutReductionPer1000: 50,
  },
};

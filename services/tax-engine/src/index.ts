import type { TaxYearConfig } from "./types";
import { taxYear2025 } from "./taxYears/2025";
import { taxYear2026 } from "./taxYears/2026";

export * from "./types";
export { calculateSeTax } from "./seTax";
export { calculateFederalIncomeTax } from "./federalIncomeTax";
export { calculateChildTaxCredit } from "./childTaxCredit";
export { calculateMileageDeduction } from "./mileageDeduction";
export { calculateStateTax } from "./stateTax";
export { estimateW2Withholding } from "./w2Withholding";
export { estimateTax } from "./estimate";
export { taxYear2025 } from "./taxYears/2025";
export { taxYear2026 } from "./taxYears/2026";
/** Current default tax year config. Bump this when a new year's figures are confirmed. */
export const currentTaxYear = taxYear2026;

/** Every available tax-year config, keyed by year — lets callers pick the config matching a
 * given calendar year instead of always using `currentTaxYear`. */
export const taxYearConfigs: Record<number, TaxYearConfig> = {
  2025: taxYear2025,
  2026: taxYear2026,
};

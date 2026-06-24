import type { MileageDeductionResult, TaxYearConfig } from "./types";

export function calculateMileageDeduction(
  businessMiles: number,
  config: TaxYearConfig
): MileageDeductionResult {
  const miles = Math.max(0, businessMiles);
  const ratePerMile = config.standardMileageRate;
  return {
    miles,
    ratePerMile,
    deductionAmount: miles * ratePerMile,
  };
}

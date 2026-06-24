import { calculateFederalIncomeTax } from "./federalIncomeTax";
import { calculateStateTax } from "./stateTax";
import type { FilingStatus, TaxYearConfig, W2WithholdingEstimate } from "./types";

/**
 * Estimates the full-year federal + state tax on W2 income in isolation — a proxy for what a
 * correctly-filled-out W-4 targets withholding at across the year, since the IRS's own
 * withholding tables are calibrated assuming this is a person's only income. Used so the app can
 * credit back what's likely already been withheld from paychecks, rather than telling someone
 * with a W2 job to set aside money for tax their employer is already covering.
 *
 * Simplification: assumes withholding is well-calibrated (an accurate W-4) and evenly spread
 * across the year. Real per-paycheck withholding can be lumpy or based on a stale/incorrect W-4 —
 * this is a planning estimate, not a substitute for checking actual paystub withholding.
 */
export function estimateW2Withholding(
  annualW2Income: number,
  filingStatus: FilingStatus,
  stateCode: string,
  config: TaxYearConfig,
  county?: string
): W2WithholdingEstimate {
  if (annualW2Income <= 0) {
    return { annualFederalEstimate: 0, annualStateEstimate: 0, annualTotalEstimate: 0 };
  }

  const federal = calculateFederalIncomeTax(0, 0, annualW2Income, filingStatus, config);
  const state = calculateStateTax(0, 0, annualW2Income, filingStatus, stateCode, config, county);

  return {
    annualFederalEstimate: federal.incomeTax,
    annualStateEstimate: state.stateTax,
    annualTotalEstimate: federal.incomeTax + state.stateTax,
  };
}

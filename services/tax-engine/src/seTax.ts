import type { FilingStatus, SeTaxResult, TaxYearConfig } from "./types";

const SOCIAL_SECURITY_RATE = 0.124;
const MEDICARE_RATE = 0.029;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const NET_EARNINGS_FACTOR = 0.9235;

/**
 * Self-employment tax per IRS Schedule SE: 15.3% (12.4% SS + 2.9% Medicare) on
 * 92.35% of net profit, with the 12.4% portion capped at the SS wage base and
 * an additional 0.9% Medicare surtax above the filing-status threshold.
 */
export function calculateSeTax(
  netSelfEmploymentProfit: number,
  filingStatus: FilingStatus,
  config: TaxYearConfig
): SeTaxResult {
  const netEarningsFromSE = Math.max(0, netSelfEmploymentProfit) * NET_EARNINGS_FACTOR;

  const socialSecurityTaxableAmount = Math.min(netEarningsFromSE, config.socialSecurityWageBase);
  const socialSecurityTax = socialSecurityTaxableAmount * SOCIAL_SECURITY_RATE;

  const medicareTax = netEarningsFromSE * MEDICARE_RATE;

  const additionalMedicareThreshold = config.additionalMedicareThreshold[filingStatus];
  const additionalMedicareTaxableAmount = Math.max(0, netEarningsFromSE - additionalMedicareThreshold);
  const additionalMedicareTax = additionalMedicareTaxableAmount * ADDITIONAL_MEDICARE_RATE;

  const totalSeTax = socialSecurityTax + medicareTax + additionalMedicareTax;

  // Additional Medicare Tax has no employer-equivalent deduction; only the base 15.3% portion is halved.
  const deductibleSeTaxPortion = (socialSecurityTax + medicareTax) / 2;

  return {
    netEarningsFromSE,
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    totalSeTax,
    deductibleSeTaxPortion,
  };
}

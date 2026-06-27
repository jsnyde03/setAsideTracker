import type { FilingStatus, SeTaxResult, TaxYearConfig } from "./types";

const SOCIAL_SECURITY_RATE = 0.124;
const MEDICARE_RATE = 0.029;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const NET_EARNINGS_FACTOR = 0.9235;

/**
 * Self-employment tax per IRS Schedule SE: 15.3% (12.4% SS + 2.9% Medicare) on
 * 92.35% of net profit, with the 12.4% portion capped at the SS wage base and
 * an additional 0.9% Medicare surtax above the filing-status threshold.
 *
 * otherFicaWages: W2 gross wages subject to FICA (gross pay minus pretax insurance/HSA,
 * but NOT minus 401k — 401k reduces income tax but not FICA). When provided, reduces both
 * the available SS wage base and the Additional Medicare Tax threshold before applying
 * them to SE earnings, per Schedule SE Line 8 and IRC §3101(b)(2). Defaults to 0.
 */
export function calculateSeTax(
  netSelfEmploymentProfit: number,
  filingStatus: FilingStatus,
  config: TaxYearConfig,
  otherFicaWages: number = 0
): SeTaxResult {
  const netEarningsFromSE = Math.max(0, netSelfEmploymentProfit) * NET_EARNINGS_FACTOR;

  const availableSsWageBase = Math.max(0, config.socialSecurityWageBase - otherFicaWages);
  const socialSecurityTaxableAmount = Math.min(netEarningsFromSE, availableSsWageBase);
  const socialSecurityTax = socialSecurityTaxableAmount * SOCIAL_SECURITY_RATE;

  const medicareTax = netEarningsFromSE * MEDICARE_RATE;

  const additionalMedicareThreshold = config.additionalMedicareThreshold[filingStatus];
  const availableAmtThreshold = Math.max(0, additionalMedicareThreshold - otherFicaWages);
  const additionalMedicareTaxableAmount = Math.max(0, netEarningsFromSE - availableAmtThreshold);
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

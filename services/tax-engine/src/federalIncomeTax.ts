import type { FederalIncomeTaxResult, FilingStatus, TaxYearConfig } from "./types";
import { applyBracketsDetailed } from "./bracketMath";

/**
 * Federal income tax on combined SE profit (less the deductible half of SE tax)
 * plus any other taxable income, less the standard deduction.
 */
export function calculateFederalIncomeTax(
  netSelfEmploymentProfit: number,
  deductibleSeTaxPortion: number,
  otherTaxableIncome: number,
  filingStatus: FilingStatus,
  config: TaxYearConfig
): FederalIncomeTaxResult {
  const adjustedGrossIncome = Math.max(
    0,
    netSelfEmploymentProfit - deductibleSeTaxPortion + otherTaxableIncome
  );

  const standardDeduction = config.standardDeduction[filingStatus];
  const taxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction);

  const brackets = config.federalBrackets[filingStatus];
  const { tax: incomeTax, applied: bracketsApplied } = applyBracketsDetailed(taxableIncome, brackets);

  return {
    adjustedGrossIncome,
    taxableIncome,
    incomeTax,
    standardDeductionUsed: standardDeduction,
    bracketsApplied,
  };
}

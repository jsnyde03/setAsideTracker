import type { ChildTaxCreditResult, FilingStatus, TaxYearConfig } from "./types";

/**
 * Federal Child Tax Credit: a nonrefundable credit per qualifying child that offsets income tax
 * down to zero, plus a refundable Additional Child Tax Credit (ACTC) portion — capped per child
 * and limited to 15% of earned income over $2,500 — that can produce a refund even past zero
 * income tax liability. This is the scenario that matters most here: many gig workers have little
 * or no federal income tax liability (SE tax is their dominant tax component, and the CTC does
 * NOT offset SE tax, matching real IRS treatment), so the refundable ACTC is often the only part
 * of this credit that actually applies to them.
 */
export function calculateChildTaxCredit(
  numberOfChildren: number,
  adjustedGrossIncome: number,
  earnedIncome: number,
  incomeTaxBeforeCredits: number,
  filingStatus: FilingStatus,
  config: TaxYearConfig
): ChildTaxCreditResult {
  if (numberOfChildren <= 0) {
    return { numberOfChildren: 0, nonrefundableCredit: 0, refundableCredit: 0, totalCredit: 0 };
  }

  const { amountPerChild, refundableCapPerChild, phaseOutThreshold, phaseOutReductionPer1000 } =
    config.childTaxCredit;

  const baseCredit = numberOfChildren * amountPerChild;
  const threshold = phaseOutThreshold[filingStatus];
  const excessThousands = Math.ceil(Math.max(0, adjustedGrossIncome - threshold) / 1000);
  const creditAfterPhaseOut = Math.max(0, baseCredit - excessThousands * phaseOutReductionPer1000);

  const nonrefundableCredit = Math.min(creditAfterPhaseOut, incomeTaxBeforeCredits);
  const remainingCredit = creditAfterPhaseOut - nonrefundableCredit;

  const refundableCap = numberOfChildren * refundableCapPerChild;
  const earnedIncomeLimit = Math.max(0, earnedIncome - 2500) * 0.15;
  const refundableCredit = Math.min(remainingCredit, refundableCap, earnedIncomeLimit);

  return {
    numberOfChildren,
    nonrefundableCredit,
    refundableCredit,
    totalCredit: nonrefundableCredit + refundableCredit,
  };
}

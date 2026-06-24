import { calculateSeTax } from "./seTax";
import { calculateFederalIncomeTax } from "./federalIncomeTax";
import { calculateChildTaxCredit } from "./childTaxCredit";
import { calculateMileageDeduction } from "./mileageDeduction";
import { calculateStateTax } from "./stateTax";
import type { TaxEstimateInput, TaxEstimateResult, TaxYearConfig } from "./types";

export function estimateTax(input: TaxEstimateInput, config: TaxYearConfig): TaxEstimateResult {
  const mileageDeduction = calculateMileageDeduction(input.businessMiles, config);

  const netProfitAfterMileage = Math.max(
    0,
    input.netSelfEmploymentProfit - mileageDeduction.deductionAmount
  );

  const seTax = calculateSeTax(netProfitAfterMileage, input.filingStatus, config);

  const federalIncomeTax = calculateFederalIncomeTax(
    netProfitAfterMileage,
    seTax.deductibleSeTaxPortion,
    input.otherTaxableIncome,
    input.filingStatus,
    config
  );

  const childTaxCredit = calculateChildTaxCredit(
    input.numberOfChildren ?? 0,
    federalIncomeTax.adjustedGrossIncome,
    netProfitAfterMileage + input.otherTaxableIncome,
    federalIncomeTax.incomeTax,
    input.filingStatus,
    config
  );

  const stateTax = calculateStateTax(
    netProfitAfterMileage,
    seTax.deductibleSeTaxPortion,
    input.otherTaxableIncome,
    input.filingStatus,
    input.stateCode,
    config,
    input.county
  );

  // federalIncomeTax.incomeTax is left as the pre-credit gross amount so the UI can show it
  // alongside a separate "Child Tax Credit" line; the credit is only netted out here, in the
  // total. nonrefundableCredit is already capped at incomeTax, so this never goes negative.
  const federalIncomeTaxAfterCredit = federalIncomeTax.incomeTax - childTaxCredit.nonrefundableCredit;

  // The refundable ACTC portion offsets total tax liability on the return as a whole (not just
  // income tax) — including SE tax — which is why it's subtracted here rather than from
  // federalIncomeTaxAfterCredit. Floored at 0: this app doesn't model the "expected refund"
  // scenario where credits exceed total tax owed, only "how much you still owe."
  const totalEstimatedTax = Math.max(
    0,
    seTax.totalSeTax +
      federalIncomeTaxAfterCredit +
      stateTax.stateTax -
      childTaxCredit.refundableCredit
  );

  const effectiveSetAsideRate =
    netProfitAfterMileage > 0 ? totalEstimatedTax / netProfitAfterMileage : 0;

  return {
    taxYear: config.year,
    netProfitAfterMileage,
    seTax,
    mileageDeduction,
    federalIncomeTax,
    childTaxCredit,
    stateTax,
    totalEstimatedTax,
    effectiveSetAsideRate,
  };
}

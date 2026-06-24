export type FilingStatus = "single" | "marriedFilingJointly";

export interface TaxBracket {
  /** Inclusive lower bound of taxable income for this bracket. */
  min: number;
  /** Exclusive upper bound; null means no upper bound (top bracket). */
  max: number | null;
  rate: number;
}

/** No state income tax at all (e.g. TX, FL). */
export interface NoStateTax {
  type: "none";
}

/**
 * A local (e.g. county) income tax layered on top of state tax, applied to the same taxable
 * income base as the state-level calculation. Used for jurisdictions like Maryland's mandatory
 * county "piggyback" tax.
 */
export type LocalTaxConfig =
  | { type: "flat"; rate: number }
  | { type: "bracket"; brackets: Record<FilingStatus, TaxBracket[]> };

/** A single flat rate applied to taxable income regardless of filing status (e.g. PA). */
export interface FlatStateTax {
  type: "flat";
  rate: number;
  /** Most flat-tax states have no standard deduction; omit if so. */
  standardDeduction?: Record<FilingStatus, number>;
  /** Local/county tax jurisdictions, keyed by jurisdiction name (e.g. "Montgomery County"). */
  localTaxJurisdictions?: Record<string, LocalTaxConfig>;
}

/** Progressive brackets, keyed by filing status (e.g. CA, NY, MD). */
export interface BracketStateTax {
  type: "bracket";
  brackets: Record<FilingStatus, TaxBracket[]>;
  standardDeduction: Record<FilingStatus, number>;
  /** Local/county tax jurisdictions, keyed by jurisdiction name (e.g. "Montgomery County"). */
  localTaxJurisdictions?: Record<string, LocalTaxConfig>;
}

export type StateTaxConfig = NoStateTax | FlatStateTax | BracketStateTax;

/**
 * Federal Child Tax Credit figures for a tax year. Modeled as: a nonrefundable credit per
 * qualifying child (offsets income tax down to zero), plus a refundable Additional Child Tax
 * Credit (ACTC) portion that can produce a refund even when income tax liability is zero — the
 * scenario that matters most for lower-income gig workers, since SE tax (not modeled as
 * creditable here, matching real IRS treatment) is often their dominant tax component.
 */
export interface ChildTaxCreditConfig {
  /** Base nonrefundable credit amount per qualifying child. */
  amountPerChild: number;
  /** Cap on the refundable (ACTC) portion, per child. */
  refundableCapPerChild: number;
  /** AGI above which the credit begins phasing out, keyed by filing status. */
  phaseOutThreshold: Record<FilingStatus, number>;
  /** Credit reduced by this amount for each $1,000 of AGI over the phase-out threshold. */
  phaseOutReductionPer1000: number;
}

export interface TaxYearConfig {
  year: number;
  /** Federal income tax brackets, keyed by filing status. */
  federalBrackets: Record<FilingStatus, TaxBracket[]>;
  /** Standard deduction amount, keyed by filing status. */
  standardDeduction: Record<FilingStatus, number>;
  /** Social Security wage base — SE earnings above this are not subject to the 12.4% SS portion. */
  socialSecurityWageBase: number;
  /** Threshold above which the 0.9% Additional Medicare Tax applies, keyed by filing status. */
  additionalMedicareThreshold: Record<FilingStatus, number>;
  /** IRS standard mileage rate for business use, in dollars per mile. */
  standardMileageRate: number;
  /** State tax configs by two-letter state code. A state missing from this map is "unsupported" — see StateTaxResult.supported. */
  stateTaxConfigs: Record<string, StateTaxConfig>;
  /** Federal Child Tax Credit figures for this tax year. */
  childTaxCredit: ChildTaxCreditConfig;
}

export interface SeTaxResult {
  /** Net earnings from self-employment, i.e. 92.35% of net profit. */
  netEarningsFromSE: number;
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  totalSeTax: number;
  /** Half of totalSeTax (excluding Additional Medicare Tax, which has no deduction) — deductible against income tax. */
  deductibleSeTaxPortion: number;
}

export interface FederalIncomeTaxResult {
  adjustedGrossIncome: number;
  taxableIncome: number;
  incomeTax: number;
}

export interface StateTaxResult {
  stateCode: string;
  /** False if this state isn't in the config's stateTaxConfigs map — stateTax will be 0 and should be flagged in UI, not trusted. */
  supported: boolean;
  taxableIncome: number;
  /** State-level tax only, excluding any local/county tax. */
  stateLevelTax: number;
  /** Jurisdiction name passed in, normalized. Undefined if not applicable/not provided. */
  county?: string;
  /** Local/county tax amount. 0 if the state has no local tax layer, or if localTaxSupported is false. */
  localTax: number;
  /**
   * True if either this state has no local tax layer at all, or a recognized county was matched
   * and localTax was computed. False if this state DOES have a local tax layer (e.g. MD) but no
   * county was provided or it didn't match a known jurisdiction — in that case localTax is 0 and
   * should be flagged in UI as an unknown/missing amount, not a verified $0.
   */
  localTaxSupported: boolean;
  /** Combined state + local tax owed — stateLevelTax + localTax. */
  stateTax: number;
}

export interface MileageDeductionResult {
  miles: number;
  ratePerMile: number;
  deductionAmount: number;
}

export interface TaxEstimateInput {
  filingStatus: FilingStatus;
  /** Net profit from self-employment (gig income minus business expenses), before the mileage deduction. */
  netSelfEmploymentProfit: number;
  /** Business miles driven, deductible via the standard mileage rate (already excluded from netSelfEmploymentProfit if using actual-expense method elsewhere). */
  businessMiles: number;
  /** Any other taxable income outside of self-employment, e.g. a W2 job, already net of its own withholding. */
  otherTaxableIncome: number;
  /** Two-letter state code the user primarily works in, e.g. "CA", "TX". */
  stateCode: string;
  /** County/local jurisdiction name, required for states with a local tax layer (e.g. MD). */
  county?: string;
  /**
   * Number of qualifying children for the federal Child Tax Credit. Simplification: treats every
   * declared dependent as a CTC-qualifying child under 17 — the real IRS rules give non-qualifying
   * dependents (e.g. an elderly parent) only the much smaller $500 Credit for Other Dependents,
   * which isn't modeled here. Defaults to 0 if omitted.
   */
  numberOfChildren?: number;
}

export interface ChildTaxCreditResult {
  numberOfChildren: number;
  /** Portion applied directly against income tax, capped at the income tax otherwise owed. */
  nonrefundableCredit: number;
  /** Additional Child Tax Credit — the portion that can be refunded even past zero income tax. */
  refundableCredit: number;
  /** nonrefundableCredit + refundableCredit. */
  totalCredit: number;
}

export interface TaxEstimateResult {
  taxYear: number;
  netProfitAfterMileage: number;
  seTax: SeTaxResult;
  mileageDeduction: MileageDeductionResult;
  federalIncomeTax: FederalIncomeTaxResult;
  childTaxCredit: ChildTaxCreditResult;
  stateTax: StateTaxResult;
  totalEstimatedTax: number;
  /** Suggested amount to set aside per dollar of net SE profit, for quick "set aside this week" UI. */
  effectiveSetAsideRate: number;
}

export type FilingStatus = "single" | "marriedFilingJointly" | "headOfHousehold" | "marriedFilingSeparately";

export interface TaxBracket {
  /** Inclusive lower bound of taxable income for this bracket. */
  min: number;
  /** Exclusive upper bound; null means no upper bound (top bracket). */
  max: number | null;
  rate: number;
}

/**
 * One bracket actually reached when taxing income, with the slice of income that fell inside it
 * and the resulting tax — the per-bracket detail behind a progressive tax figure, surfaced for
 * the "show your math" audit trail. Only brackets the income actually reached are emitted.
 */
export interface AppliedBracket {
  /** Inclusive lower bound of the bracket (same as the source TaxBracket). */
  min: number;
  /** Exclusive upper bound; null for the top bracket. */
  max: number | null;
  rate: number;
  /** Portion of taxable income that fell within this bracket's [min, upperBound) range. */
  amountInBracket: number;
  /** amountInBracket * rate — the tax contributed by this bracket alone. */
  taxFromBracket: number;
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

/**
 * A nonrefundable state tax credit — reduces tax owed directly (unlike standardDeduction, which
 * reduces taxable income before the rate/brackets are applied). Modeled as a flat per-filer
 * amount and/or a flat per-dependent amount, both optional and additive. Nonrefundable: the
 * applied amount is capped at the state-level tax otherwise owed and can't take it below zero —
 * real per-state rules vary on refundability, but nonrefundable is the more common case and the
 * safer assumption (never overstates the credit). Applied only against stateLevelTax, not local
 * tax, mirroring how the federal Child Tax Credit only offsets income tax, not SE tax.
 */
export interface StateCreditConfig {
  perFiler?: Record<FilingStatus, number>;
  perDependent?: number;
}

/**
 * Income-based reduction of a state's standard deduction above a threshold (e.g. Maine's
 * statutory phaseout under 36 M.R.S. 5124-C(2)/5125(7)). Mirrors the state's own worksheet
 * formula: ratio = min(1, max(0, (stateAdjustedGrossIncome - threshold) / additionalLimit)),
 * and the standard deduction is reduced by (deduction * ratio). Applied against the full
 * standardDeduction figure, including any personal-exemption amount folded into it — a known
 * simplification where a state's actual exemption phaseout uses different thresholds, since
 * conflating them overstates tax slightly at high incomes rather than understating it.
 */
export interface StandardDeductionPhaseout {
  threshold: Record<FilingStatus, number>;
  additionalLimit: Record<FilingStatus, number>;
}

/**
 * A per-dependent **exemption**, subtracted from income *before* brackets apply — which is a
 * different mechanism from {@link StateCreditConfig}, and the distinction is worth thousands.
 *
 * ⚠️ **This type exists because three states had it wrong.** GA, SC and MN model dependent
 * exemptions of $4,000–$5,300, and those figures were sitting in `credit.perDependent`, i.e. being
 * applied as dollar-for-dollar reductions of **tax owed**. A GA filer with two dependents on $40k
 * of profit was told **$0** state tax instead of roughly $891 — an understatement, the dangerous
 * direction. Found by the 2026-09-20 gap scan and confirmed against O.C.G.A. §48-7-26, SC Code
 * §12-6-1140 and the Minnesota Department of Revenue.
 *
 * **The tell, if you are adding a state:** a real per-dependent *credit* is small — the ones modeled
 * here are AR $29, DE $110, NE $176, OR $256. A four-figure per-dependent number is almost certainly
 * an exemption and belongs here instead.
 *
 * Note that a state's *personal* (per-filer) exemption is folded into `standardDeduction` rather
 * than modeled here — see VT, whose `7650 + 5300` doubles for MFJ because two filers claim it.
 * Only the part that scales with dependents belongs in this type.
 */
export interface StateExemptionConfig {
  /** Dollars subtracted from state taxable income for each dependent. */
  perDependent?: number;
}

/** A single flat rate applied to taxable income regardless of filing status (e.g. PA). */
export interface FlatStateTax {
  type: "flat";
  rate: number;
  /** Most flat-tax states have no standard deduction; omit if so. */
  standardDeduction?: Record<FilingStatus, number>;
  /** Local/county tax jurisdictions, keyed by jurisdiction name (e.g. "Montgomery County"). */
  localTaxJurisdictions?: Record<string, LocalTaxConfig>;
  /** Nonrefundable per-filer/per-dependent tax credit, if this state has one modeled. */
  credit?: StateCreditConfig;
  /** Per-dependent exemption subtracted from INCOME, not from tax owed. See {@link StateExemptionConfig}. */
  exemption?: StateExemptionConfig;
}

/** Progressive brackets, keyed by filing status (e.g. CA, NY, MD). */
export interface BracketStateTax {
  type: "bracket";
  brackets: Record<FilingStatus, TaxBracket[]>;
  standardDeduction: Record<FilingStatus, number>;
  /** If set, standardDeduction phases out above an income threshold (e.g. ME). */
  standardDeductionPhaseout?: StandardDeductionPhaseout;
  /** Local/county tax jurisdictions, keyed by jurisdiction name (e.g. "Montgomery County"). */
  localTaxJurisdictions?: Record<string, LocalTaxConfig>;
  /** Nonrefundable per-filer/per-dependent tax credit, if this state has one modeled. */
  credit?: StateCreditConfig;
  /** Per-dependent exemption subtracted from INCOME, not from tax owed. See {@link StateExemptionConfig}. */
  exemption?: StateExemptionConfig;
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
  /**
   * ISO date (YYYY-MM-DD) this year's figures were last checked against the authorities cited in
   * the config file's own header.
   *
   * ⚠️ **Required, and machine-read by `npm run audit:staleness`.** Tax figures change mid-year,
   * not only at year boundaries: Georgia raised its dependent exemption $4,000 → $5,000 effective
   * TY2026, and nothing in this repo noticed — it was found by a web search during an unrelated
   * audit on 2026-09-21. Prose like "MUST be reviewed each year" had been sitting at the top of
   * the file the whole time and changed nothing, because nothing could read it.
   *
   * **Bump this only after actually re-checking the figures**, never to quiet the gate. A date that
   * is newer than the last real review is worse than a stale one: it converts a loud, correct
   * failure into silent, false confidence.
   */
  reviewedOn: string;
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
  /** Standard deduction subtracted from AGI to reach taxableIncome — the figure used, exposed for
   * the "show your math" breakdown so the UI doesn't have to re-derive it from the config. */
  standardDeductionUsed: number;
  /** Per-bracket detail behind incomeTax — only the brackets this taxable income actually reached.
   * Empty when taxableIncome is 0. */
  bracketsApplied: AppliedBracket[];
}

export interface StateTaxResult {
  stateCode: string;
  /** False if this state isn't in the config's stateTaxConfigs map — stateTax will be 0 and should be flagged in UI, not trusted. */
  supported: boolean;
  taxableIncome: number;
  /** State-level tax only, excluding any local/county tax. Left as the pre-credit gross amount —
   * same convention as federalIncomeTax.incomeTax — so the UI can show a separate credit line
   * rather than silently baking it in; creditApplied is only netted out in the final stateTax. */
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
  /** Combined state + local tax owed, net of creditApplied — max(0, stateLevelTax - creditApplied) + localTax. */
  stateTax: number;
  /** Nonrefundable state credit actually applied (already netted into stateTax, not stateLevelTax) —
   * exposed separately for "show your math" transparency. 0 if this state has no credit modeled. */
  creditApplied: number;
  /** State standard deduction subtracted to reach taxableIncome (after any income-based phaseout).
   * 0 for no-income-tax states, unsupported states, and flat-tax states with no standard deduction. */
  standardDeductionUsed: number;
  /** Per-dependent exemption subtracted to reach taxableIncome, alongside the standard deduction —
   * `exemption.perDependent × dependents`. 0 for states with no dependent exemption modeled, and
   * for filers with no dependents. Exposed separately from standardDeductionUsed so "show your
   * math" can name it, and so a regression that silently drops it is visible in the result rather
   * than only in the final dollar figure. */
  dependentExemptionUsed: number;
  /** Per-bracket detail behind stateLevelTax. For a flat-tax state, a single synthetic entry
   * spanning the whole taxable base at the flat rate. Empty for no-tax/unsupported states or when
   * taxableIncome is 0. */
  bracketsApplied: AppliedBracket[];
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
  /** W2 federal taxable income for the year (gross minus 401k minus pretax insurance/HSA). Used for
   * federal/state income tax bracket-pushing and withholding estimates. */
  otherTaxableIncome: number;
  /**
   * W2 FICA wages for the year (gross minus pretax insurance/HSA, but NOT minus 401k — 401k
   * reduces income tax but not Social Security/Medicare wages). Used to reduce the available SS wage
   * base and Additional Medicare Tax threshold before applying them to SE earnings, per Schedule SE
   * Line 8. Defaults to otherTaxableIncome when omitted (conservative approximation — slightly
   * understates FICA wages when 401k is in play, overstating SS tax for high earners).
   */
  otherFicaWages?: number;
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

/**
 * Estimates what a W2 employer's payroll withholding is likely targeting across the full year,
 * by computing federal + state tax on the W2 income as if it were the only income — this mirrors
 * how IRS withholding tables are calibrated for a single-job employee. This is the full-year
 * figure; callers that need a year-to-date amount (e.g. the mobile app, which knows the current
 * date and whether the job has an end date) prorate it themselves.
 */
export interface W2WithholdingEstimate {
  annualFederalEstimate: number;
  annualStateEstimate: number;
  annualTotalEstimate: number;
}

export interface TaxEstimateResult {
  taxYear: number;
  netProfitAfterMileage: number;
  seTax: SeTaxResult;
  mileageDeduction: MileageDeductionResult;
  federalIncomeTax: FederalIncomeTaxResult;
  childTaxCredit: ChildTaxCreditResult;
  stateTax: StateTaxResult;
  w2WithholdingEstimate: W2WithholdingEstimate;
  totalEstimatedTax: number;
  /** Suggested amount to set aside per dollar of net SE profit, for quick "set aside this week" UI. */
  effectiveSetAsideRate: number;
}

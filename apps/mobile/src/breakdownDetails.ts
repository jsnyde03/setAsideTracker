import type { TaxEstimateResult } from "@gig-tax-tracker/tax-engine";
import type { GlossaryTermKey } from "./glossary";

/**
 * "Show your math" — turns a computed tax estimate into a plain-language, line-by-line breakdown
 * of how each headline number on the dashboard was derived. Pure and presentation-only: it formats
 * numbers and assembles explanatory copy, but does no tax math itself (the engine already exposes
 * every intermediate value it needs). Kept separate from the sheet component so it's unit-testable
 * and reusable by the upcoming What-if simulator.
 */

/** The dashboard breakdown rows that open a detail sheet. */
export type BreakdownRowKey =
  | "seTax"
  | "federalIncomeTax"
  | "childTaxCredit"
  | "stateTax"
  | "w2Withholding";

export interface DetailLine {
  label: string;
  value: string;
  /**
   * Visual treatment:
   * - "subtle": an intermediate figure (AGI, taxable income) shown muted
   * - "credit": a reduction/credit, rendered green and negative
   * - "total": the bold bottom-line figure that matches the dashboard row
   * - "normal" (default): a contributing amount (e.g. one tax bracket)
   */
  kind?: "normal" | "subtle" | "credit" | "total";
}

export interface BreakdownDetail {
  title: string;
  /** Plain-language explanation of what this tax/credit is and how it's figured. */
  intro: string;
  lines: DetailLine[];
  footnote?: string;
  /** Glossary terms relevant to this breakdown, rendered as tappable "what does this mean?" pills
   * — the in-app tax-literacy layer. Ordered most-to-least central to the figure. */
  terms: GlossaryTermKey[];
}

export interface BreakdownDetailContext {
  estimate: TaxEstimateResult;
  /** Two-letter state code used in headings/labels (e.g. "CA"). */
  stateLabel: string;
  /** Withholding actually credited against the bill so far — the YTD figure the dashboard computes
   * (may differ from the raw annual estimate when pay-stub YTD actuals are present). */
  w2WithholdingYtd: number;
}

function money(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** A subtraction/credit, shown as a negative dollar amount with a true minus sign (U+2212). */
function negative(amount: number): string {
  return `−${money(amount)}`;
}

/** A rate as a trimmed percentage: 0.1 → "10%", 0.0307 → "3.07%". */
function percent(rate: number): string {
  const trimmed = (rate * 100).toFixed(2).replace(/\.?0+$/, "");
  return `${trimmed}%`;
}

function seTaxDetail(estimate: TaxEstimateResult): BreakdownDetail {
  const se = estimate.seTax;
  const lines: DetailLine[] = [
    { label: "Net self-employment profit", value: money(estimate.netProfitAfterMileage), kind: "subtle" },
    { label: "Net earnings (× 92.35%)", value: money(se.netEarningsFromSE), kind: "subtle" },
    { label: "Social Security (12.4%)", value: money(se.socialSecurityTax) },
    { label: "Medicare (2.9%)", value: money(se.medicareTax) },
  ];
  const terms: GlossaryTermKey[] = ["selfEmploymentTax", "socialSecurity", "medicare"];
  if (se.additionalMedicareTax > 0) {
    lines.push({ label: "Additional Medicare (0.9%)", value: money(se.additionalMedicareTax) });
    terms.push("additionalMedicare");
  }
  terms.push("netProfit", "standardMileageRate");
  lines.push({ label: "Self-employment tax", value: money(se.totalSeTax), kind: "total" });

  return {
    title: "Self-employment tax",
    intro:
      "You pay Social Security and Medicare tax on your gig profit yourself, since no employer withholds it for you. It's figured on 92.35% of your net profit.",
    lines,
    footnote: `Half of this (${money(
      se.deductibleSeTaxPortion
    )}) is deducted before your income tax is figured, so the same dollars aren't taxed twice.`,
    terms,
  };
}

function federalIncomeTaxDetail(estimate: TaxEstimateResult): BreakdownDetail {
  const fit = estimate.federalIncomeTax;
  const lines: DetailLine[] = [
    { label: "Adjusted gross income", value: money(fit.adjustedGrossIncome), kind: "subtle" },
    { label: "Standard deduction", value: negative(fit.standardDeductionUsed), kind: "subtle" },
    { label: "Taxable income", value: money(fit.taxableIncome), kind: "subtle" },
  ];
  for (const bracket of fit.bracketsApplied) {
    lines.push({
      label: `${percent(bracket.rate)} on ${money(bracket.amountInBracket)}`,
      value: money(bracket.taxFromBracket),
    });
  }
  lines.push({ label: "Federal income tax", value: money(fit.incomeTax), kind: "total" });

  const terms: GlossaryTermKey[] = [
    "federalIncomeTax",
    "adjustedGrossIncome",
    "standardDeduction",
    "taxableIncome",
    "marginalBracket",
  ];
  if (estimate.childTaxCredit.totalCredit > 0) terms.push("childTaxCredit");

  return {
    title: "Federal income tax",
    intro:
      "Your income is taxed in tiers. The first slice is taxed at the lowest rate, and each higher slice at a higher rate — only the income above each threshold is taxed at that bracket's rate, not all of it.",
    lines,
    footnote:
      estimate.childTaxCredit.totalCredit > 0
        ? "Your Child Tax Credit is then applied against this amount — see the Child Tax Credit line."
        : undefined,
    terms,
  };
}

function childTaxCreditDetail(estimate: TaxEstimateResult): BreakdownDetail {
  const ctc = estimate.childTaxCredit;
  const lines: DetailLine[] = [
    { label: "Qualifying children", value: String(ctc.numberOfChildren), kind: "subtle" },
  ];
  if (ctc.nonrefundableCredit > 0) {
    lines.push({ label: "Applied against income tax", value: negative(ctc.nonrefundableCredit), kind: "credit" });
  }
  if (ctc.refundableCredit > 0) {
    lines.push({ label: "Refundable portion", value: negative(ctc.refundableCredit), kind: "credit" });
  }
  lines.push({ label: "Total credit", value: negative(ctc.totalCredit), kind: "total" });

  return {
    title: "Child Tax Credit",
    intro:
      "The Child Tax Credit lowers your tax for each qualifying child. Part of it reduces your income tax (down to zero), and a further refundable portion can come back to you even when you owe no income tax.",
    lines,
    terms: ["childTaxCredit", "federalIncomeTax"],
  };
}

function stateTaxDetail(estimate: TaxEstimateResult, stateLabel: string): BreakdownDetail {
  const st = estimate.stateTax;
  const title = `${stateLabel} state tax`;

  if (!st.supported) {
    return {
      title,
      intro: `${stateLabel} isn't supported yet, so state income tax shows as $0 and is not included in your set-aside number. Account for it manually until this state is added.`,
      lines: [],
      terms: ["stateIncomeTax"],
    };
  }

  // No-income-tax state (e.g. TX, FL): nothing was deducted, no brackets, nothing owed.
  if (st.stateLevelTax === 0 && st.localTax === 0 && st.bracketsApplied.length === 0 && st.standardDeductionUsed === 0) {
    return {
      title,
      intro: `${stateLabel} has no state income tax, so there's nothing to set aside for the state.`,
      lines: [{ label: "State income tax", value: money(0), kind: "total" }],
      terms: ["stateIncomeTax"],
    };
  }

  const lines: DetailLine[] = [];
  const terms: GlossaryTermKey[] = ["stateIncomeTax"];
  if (st.standardDeductionUsed > 0) {
    lines.push({ label: "Standard deduction applied", value: money(st.standardDeductionUsed), kind: "subtle" });
    terms.push("standardDeduction");
  }
  lines.push({ label: "State taxable income", value: money(st.taxableIncome), kind: "subtle" });
  terms.push("taxableIncome");
  for (const bracket of st.bracketsApplied) {
    lines.push({
      label: `${percent(bracket.rate)} on ${money(bracket.amountInBracket)}`,
      value: money(bracket.taxFromBracket),
    });
  }
  if (st.bracketsApplied.length > 1) terms.push("marginalBracket");
  if (st.creditApplied > 0) {
    lines.push({ label: `${stateLabel} tax credit`, value: negative(st.creditApplied), kind: "credit" });
  }
  if (st.county && st.localTaxSupported && st.localTax > 0) {
    lines.push({ label: `${st.county} local tax`, value: money(st.localTax) });
    terms.push("localTax");
  }
  lines.push({ label: "State & local tax", value: money(st.stateTax), kind: "total" });

  return {
    title,
    intro:
      "Your state taxes your income too. This shows the state's standard deduction, the rate (or brackets) applied to what's left, and any state credit or local county tax.",
    lines,
    footnote:
      !st.localTaxSupported
        ? `${stateLabel} has a local county income tax that isn't included here — your county isn't set or wasn't recognized, so this estimate is missing that amount.`
        : undefined,
    terms,
  };
}

function w2WithholdingDetail(estimate: TaxEstimateResult, w2WithholdingYtd: number): BreakdownDetail {
  const w2 = estimate.w2WithholdingEstimate;
  return {
    title: "W-2 withholding credit",
    intro:
      "Your W-2 job already withholds federal and state tax from each paycheck. We credit that estimated amount against your total, so you're not setting money aside twice for tax that's already being paid.",
    lines: [
      { label: "Est. annual federal withholding", value: money(w2.annualFederalEstimate), kind: "subtle" },
      { label: "Est. annual state withholding", value: money(w2.annualStateEstimate), kind: "subtle" },
      { label: "Withholding credited", value: negative(w2WithholdingYtd), kind: "total" },
    ],
    footnote: "This is an estimate from your pay-stub figures — your actual withholding is shown on your pay stub.",
    terms: ["withholding", "estimatedTax"],
  };
}

/** Builds the detail breakdown for a tapped dashboard row. */
export function buildBreakdownDetail(key: BreakdownRowKey, ctx: BreakdownDetailContext): BreakdownDetail {
  switch (key) {
    case "seTax":
      return seTaxDetail(ctx.estimate);
    case "federalIncomeTax":
      return federalIncomeTaxDetail(ctx.estimate);
    case "childTaxCredit":
      return childTaxCreditDetail(ctx.estimate);
    case "stateTax":
      return stateTaxDetail(ctx.estimate, ctx.stateLabel);
    case "w2Withholding":
      return w2WithholdingDetail(ctx.estimate, ctx.w2WithholdingYtd);
  }
}

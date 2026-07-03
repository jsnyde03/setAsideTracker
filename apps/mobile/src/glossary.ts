/**
 * In-app tax literacy — plain-language explainers for the tax vocabulary that shows up in the
 * dashboard breakdown and its "show your math" detail sheets. Most users are first-time
 * self-employed and don't have this vocabulary yet, so definitions deliberately avoid jargon and
 * IRS form numbers. Pure data: no logic, no formatting, reused by breakdownDetails.ts (which tags
 * each breakdown with the terms relevant to it) and rendered inline by BreakdownDetailSheet.
 */

export type GlossaryTermKey =
  | "netProfit"
  | "standardMileageRate"
  | "selfEmploymentTax"
  | "socialSecurity"
  | "medicare"
  | "additionalMedicare"
  | "adjustedGrossIncome"
  | "standardDeduction"
  | "taxableIncome"
  | "marginalBracket"
  | "federalIncomeTax"
  | "childTaxCredit"
  | "stateIncomeTax"
  | "localTax"
  | "withholding"
  | "estimatedTax";

export interface GlossaryEntry {
  /** Short, human label as shown on the tappable term pill. */
  term: string;
  /** One or two plain-language sentences — no form numbers, no jargon. */
  definition: string;
}

export const GLOSSARY: Record<GlossaryTermKey, GlossaryEntry> = {
  netProfit: {
    term: "Net profit",
    definition:
      "Your gig earnings (pay plus tips) minus your business expenses and your mileage deduction. This is the profit your taxes are actually figured on — not your gross earnings.",
  },
  standardMileageRate: {
    term: "Standard mileage rate",
    definition:
      "A set per-mile amount the IRS lets you deduct for business driving instead of tracking actual car costs. Multiply your business miles by the rate to get the deduction, which lowers the profit you're taxed on.",
  },
  selfEmploymentTax: {
    term: "Self-employment tax",
    definition:
      "Social Security and Medicare tax for people who work for themselves. A regular employee splits this with their employer; when you're self-employed you pay both halves — 15.3% of your net profit — yourself.",
  },
  socialSecurity: {
    term: "Social Security",
    definition:
      "The 12.4% part of self-employment tax that funds Social Security retirement and disability benefits. It only applies up to an annual income cap.",
  },
  medicare: {
    term: "Medicare",
    definition:
      "The 2.9% part of self-employment tax that funds Medicare. Unlike Social Security, there's no income cap — it applies to all of your net earnings.",
  },
  additionalMedicare: {
    term: "Additional Medicare",
    definition:
      "An extra 0.9% Medicare tax that only applies to earnings above a high threshold (for example, $200,000 for a single filer). Most people never reach it.",
  },
  adjustedGrossIncome: {
    term: "Adjusted gross income",
    definition:
      "Your total income for the year after a few specific adjustments — here, your gig profit plus any W-2 wages, minus the deductible half of your self-employment tax. Your income tax starts from this number.",
  },
  standardDeduction: {
    term: "Standard deduction",
    definition:
      "A flat amount everyone can subtract from their income before tax is figured — no receipts needed. How big it is depends on your filing status.",
  },
  taxableIncome: {
    term: "Taxable income",
    definition:
      "The income your tax is actually calculated on: your adjusted gross income minus your standard deduction.",
  },
  marginalBracket: {
    term: "Tax brackets",
    definition:
      "Income tax comes in tiers. Each slice of your income is taxed at its own rate, and only the income above a threshold is taxed at the higher rate — so earning a bit more never lowers your take-home pay.",
  },
  federalIncomeTax: {
    term: "Federal income tax",
    definition:
      "The income tax you owe the IRS, figured by running your taxable income through the federal tax brackets for your filing status.",
  },
  childTaxCredit: {
    term: "Child Tax Credit",
    definition:
      "A credit that lowers your tax for each qualifying child. Part of it can reduce your income tax to zero, and a further refundable part can come back to you even if you owe no income tax.",
  },
  stateIncomeTax: {
    term: "State income tax",
    definition:
      "Income tax owed to your state. Some states have none, some charge a single flat rate, and some use brackets like the federal system.",
  },
  localTax: {
    term: "Local tax",
    definition:
      "An extra income tax that some counties or cities charge on top of state tax — for example, Maryland's county 'piggyback' tax.",
  },
  withholding: {
    term: "Withholding",
    definition:
      "Tax your employer takes out of each W-2 paycheck and sends to the government for you. We credit your estimated withholding against your total so you don't set the same money aside twice.",
  },
  estimatedTax: {
    term: "Estimated tax",
    definition:
      "Because no employer withholds tax from gig income, the IRS expects you to pay it yourself in four quarterly installments. Your 'set aside' number is what you're banking toward those payments.",
  },
};

export function glossaryEntry(key: GlossaryTermKey): GlossaryEntry {
  return GLOSSARY[key];
}

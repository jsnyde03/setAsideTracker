import type { StateTaxConfig } from "../types";
import { mdLocalTaxJurisdictions2026 } from "./mdLocalTax2026";

/**
 * 2026 state tax configs for the initial v0.3 rollout — chosen to cover the three structural
 * types a state tax system can take: no income tax (TX, FL), a single flat rate (PA), and
 * progressive brackets (CA, NY). Add more states by adding entries to this map; no engine
 * code changes needed.
 *
 * Confidence varies by state and should be reviewed before relying on for real filings (see
 * ROADMAP §6 annual review process):
 * - TX, FL: no state income tax. Stable, not subject to change.
 * - PA: flat 3.07% rate, unchanged since 2004 — high confidence.
 * - CA: 2026 brackets per FTB-based projections (ustax.tools, consistent with confirmed 2025
 *   brackets + standard inflation adjustment). FTB had not published final certified 2026
 *   figures as of build time — verify against FTB.ca.gov before relying on for real filings.
 *   Standard deduction figures are 2025 FTB figures (2026 not yet published); used as a
 *   placeholder pending official release.
 * - NY: 2026 brackets are PROVISIONAL — sources disagreed on exact rates for the lowest five
 *   brackets (NY's FY2026 budget cut each by 0.2%, and different sources reported slightly
 *   different resulting numbers). Treat NY figures here as a placeholder needing verification
 *   against NYS Department of Taxation and Finance before relying on for real filings.
 * - MD: 2025/2026 brackets per Maryland statute text (10 brackets, 2%-6.5%, retroactively
 *   effective Jan 1, 2025 per the Budget Reconciliation and Financing Act of 2025) — high
 *   confidence, sourced from the actual statute. IMPORTANT GAP: this does NOT include Maryland's
 *   mandatory local/county "piggyback" income tax (roughly 2.25%-3.2% on top of the state rate,
 *   varies by county), which is a substantial chunk of a Maryland resident's real tax bill.
 *   State-only figures here will meaningfully understate total MD tax liability until county
 *   tax is added.
 * - AK, NV, SD, TN, WY: no state personal income tax at all, by state constitution/statute —
 *   stable, not subject to change, same confidence as TX/FL.
 * - WA: no tax on wage/ordinary income (what this app calculates) — high confidence for gig
 *   income specifically. Note WA does have a 7% excise tax on *capital gains* above ~$270k/year
 *   (indexed annually), unrelated to wages/SE income and not modeled here since it's out of
 *   scope for what this app tracks.
 * - NH: fully repealed its 5% tax on interest/dividends (its only income tax of any kind)
 *   effective Jan 1, 2025 — wage/SE income was never taxed by NH even before that. No state
 *   income tax of any kind applies for 2025/2026.
 */
export const stateTaxConfigs2026: Record<string, StateTaxConfig> = {
  TX: { type: "none" },
  FL: { type: "none" },
  AK: { type: "none" },
  NV: { type: "none" },
  SD: { type: "none" },
  TN: { type: "none" },
  WA: { type: "none" },
  WY: { type: "none" },
  NH: { type: "none" },

  PA: {
    type: "flat",
    rate: 0.0307,
    // PA's personal income tax has no standard deduction or personal exemption.
  },

  CA: {
    type: "bracket",
    standardDeduction: {
      single: 5706,
      marriedFilingJointly: 11412,
    },
    brackets: {
      single: [
        { min: 0, max: 10756, rate: 0.01 },
        { min: 10756, max: 25499, rate: 0.02 },
        { min: 25499, max: 40245, rate: 0.04 },
        { min: 40245, max: 55866, rate: 0.06 },
        { min: 55866, max: 70612, rate: 0.08 },
        { min: 70612, max: 360659, rate: 0.093 },
        { min: 360659, max: 432787, rate: 0.103 },
        { min: 432787, max: 721314, rate: 0.113 },
        { min: 721314, max: 1000000, rate: 0.123 },
        { min: 1000000, max: null, rate: 0.133 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 21512, rate: 0.01 },
        { min: 21512, max: 50998, rate: 0.02 },
        { min: 50998, max: 80490, rate: 0.04 },
        { min: 80490, max: 111732, rate: 0.06 },
        { min: 111732, max: 141224, rate: 0.08 },
        { min: 141224, max: 721318, rate: 0.093 },
        { min: 721318, max: 865574, rate: 0.103 },
        { min: 865574, max: 1442628, rate: 0.113 },
        { min: 1442628, max: 2000000, rate: 0.123 },
        { min: 2000000, max: null, rate: 0.133 },
      ],
    },
  },

  NY: {
    type: "bracket",
    standardDeduction: {
      single: 8000,
      marriedFilingJointly: 16050,
    },
    brackets: {
      single: [
        { min: 0, max: 8500, rate: 0.039 },
        { min: 8500, max: 11700, rate: 0.044 },
        { min: 11700, max: 13900, rate: 0.0515 },
        { min: 13900, max: 80650, rate: 0.054 },
        { min: 80650, max: 215400, rate: 0.059 },
        { min: 215400, max: 1077550, rate: 0.0685 },
        { min: 1077550, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: null, rate: 0.109 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 17150, rate: 0.039 },
        { min: 17150, max: 23600, rate: 0.044 },
        { min: 23600, max: 27900, rate: 0.0515 },
        { min: 27900, max: 161550, rate: 0.054 },
        { min: 161550, max: 323200, rate: 0.059 },
        { min: 323200, max: 2155350, rate: 0.0685 },
        { min: 2155350, max: 5000000, rate: 0.0965 },
        { min: 5000000, max: 25000000, rate: 0.103 },
        { min: 25000000, max: null, rate: 0.109 },
      ],
    },
  },

  MD: {
    type: "bracket",
    standardDeduction: {
      single: 3350,
      marriedFilingJointly: 6700,
    },
    brackets: {
      single: [
        { min: 0, max: 1000, rate: 0.02 },
        { min: 1000, max: 2000, rate: 0.03 },
        { min: 2000, max: 3000, rate: 0.04 },
        { min: 3000, max: 100000, rate: 0.0475 },
        { min: 100000, max: 125000, rate: 0.05 },
        { min: 125000, max: 150000, rate: 0.0525 },
        { min: 150000, max: 250000, rate: 0.055 },
        { min: 250000, max: 500000, rate: 0.0575 },
        { min: 500000, max: 1000000, rate: 0.0625 },
        { min: 1000000, max: null, rate: 0.065 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 1000, rate: 0.02 },
        { min: 1000, max: 2000, rate: 0.03 },
        { min: 2000, max: 3000, rate: 0.04 },
        { min: 3000, max: 150000, rate: 0.0475 },
        { min: 150000, max: 175000, rate: 0.05 },
        { min: 175000, max: 225000, rate: 0.0525 },
        { min: 225000, max: 300000, rate: 0.055 },
        { min: 300000, max: 600000, rate: 0.0575 },
        { min: 600000, max: 1200000, rate: 0.0625 },
        { min: 1200000, max: null, rate: 0.065 },
      ],
    },
    localTaxJurisdictions: mdLocalTaxJurisdictions2026,
  },
};

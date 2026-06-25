import type { LocalTaxConfig } from "../types";

/**
 * New York City's resident personal income tax — levied on top of NY state tax, using the same
 * NY taxable income base (NYAGI less the state standard deduction) this engine already computes,
 * so no separate NYC-specific deduction is needed here. Unlike PA's local tax (thousands of
 * separate municipal jurisdictions, not realistically sourceable), NYC is the one dominant local
 * jurisdiction for NY — Yonkers also levies a smaller local surcharge, not modeled here.
 *
 * Brackets confirmed via two independent sources agreeing on the same numbers: single thresholds
 * $12,000/$25,000/$50,000, MFJ thresholds $21,600/$45,000/$90,000 (NOT simply double the single
 * thresholds — verified, not assumed). Rates (3.078%/3.762%/3.819%/3.876%) have reportedly been
 * unchanged since tax year 2017. High confidence on this core bracket structure.
 *
 * NOT modeled, disclosed gaps:
 * - A $1,000-per-dependent NYC-specific exemption beyond the shared state standard deduction —
 *   this engine's LocalTaxConfig has no separate deduction mechanism (it operates on whatever
 *   taxableIncome the state-level calculation already produced), so this can't be cleanly added
 *   without a type change. Slightly overstates NYC tax for filers with dependents.
 * - The NYC Unincorporated Business Tax (UBT) — a separate 4% tax on self-employment/business
 *   income over $95,000/year specifically for unincorporated businesses operating in NYC, with a
 *   partial credit against NYC personal income tax. This is real and directly relevant for
 *   higher-earning gig workers, but modeling it accurately would need its own credit-against-NYC-
 *   PIT mechanism this engine doesn't have. A genuinely material gap, not a rounding error —
 *   flagged here rather than silently ignored.
 * - A May 2025 "Axe the Tax" full nonrefundable credit against NYC PIT for filers with dependents
 *   and federal AGI up to ~150% of the federal poverty line — a real but narrow-income-band
 *   credit, not modeled.
 */
export const nyLocalTaxJurisdictions2026: Record<string, LocalTaxConfig> = {
  "New York City": {
    type: "bracket",
    brackets: {
      single: [
        { min: 0, max: 12000, rate: 0.03078 },
        { min: 12000, max: 25000, rate: 0.03762 },
        { min: 25000, max: 50000, rate: 0.03819 },
        { min: 50000, max: null, rate: 0.03876 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 21600, rate: 0.03078 },
        { min: 21600, max: 45000, rate: 0.03762 },
        { min: 45000, max: 90000, rate: 0.03819 },
        { min: 90000, max: null, rate: 0.03876 },
      ],
    },
  },
};

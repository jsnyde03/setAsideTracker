import type { StateTaxConfig, TaxYearConfig } from "../types";
import { mdLocalTaxJurisdictions2026 } from "../stateTaxConfigs/mdLocalTax2026";
import { paLocalTaxJurisdictions2026 } from "../stateTaxConfigs/paLocalTax2026";
import { nyLocalTaxJurisdictions2026 } from "../stateTaxConfigs/nyLocalTax2026";

/**
 * 2025 tax year figures (IRS Rev. Proc. 2024-40 for federal brackets, IRS Notice 2025-5 for the
 * standard mileage rate, SSA wage base announcement for SS cap).
 *
 * IMPORTANT CORRECTION: the federal standard deduction below is NOT the original Rev. Proc.
 * 2024-40 figure ($15,000/$30,000) — it's the OBBBA (One Big Beautiful Bill Act, signed July 4,
 * 2025) figure of $15,750/$31,500, which retroactively superseded Rev. Proc. 2024-40 for tax
 * year 2025 itself (not just 2026 onward). This file previously had the stale pre-OBBBA figure,
 * which understated everyone's standard deduction (and thus overstated taxable income/tax owed)
 * for any 2025-dated entry — a real, current bug, not just a missing-state gap. Federal bracket
 * thresholds themselves were NOT changed by OBBBA (only the standard deduction baseline was
 * reset), so those are unchanged from Rev. Proc. 2024-40.
 *
 * MUST be reviewed and updated for each new tax year — see ROADMAP §6 (annual review process).
 */
export const taxYear2025: TaxYearConfig = {
  year: 2025,
  federalBrackets: {
    single: [
      { min: 0, max: 11925, rate: 0.1 },
      { min: 11925, max: 48475, rate: 0.12 },
      { min: 48475, max: 103350, rate: 0.22 },
      { min: 103350, max: 197300, rate: 0.24 },
      { min: 197300, max: 250525, rate: 0.32 },
      { min: 250525, max: 626350, rate: 0.35 },
      { min: 626350, max: null, rate: 0.37 },
    ],
    marriedFilingJointly: [
      { min: 0, max: 23850, rate: 0.1 },
      { min: 23850, max: 96950, rate: 0.12 },
      { min: 96950, max: 206700, rate: 0.22 },
      { min: 206700, max: 394600, rate: 0.24 },
      { min: 394600, max: 501050, rate: 0.32 },
      { min: 501050, max: 751600, rate: 0.35 },
      { min: 751600, max: null, rate: 0.37 },
    ],
  },
  standardDeduction: {
    single: 15750,
    marriedFilingJointly: 31500,
  },
  socialSecurityWageBase: 176100,
  additionalMedicareThreshold: {
    single: 200000,
    marriedFilingJointly: 250000,
  },
  standardMileageRate: 0.7,
  /**
   * All 50 states + DC backfilled for 2025, sourced from the Tax Foundation's "2025 State
   * Individual Income Tax Rates and Brackets" report (published Feb 2025) cross-checked against
   * each state's own DOR/Revenue Services site for figures that looked uncertain or that
   * conflicted with the 2026 config (see stateTaxConfigs/2026.ts's confidence notes for the
   * general per-state methodology — this file follows the same conventions).
   *
   * IMPORTANT: the federal-standard-deduction-conforming states below (AZ, CO, IA, ID's federal
   * portion, MO, MT, ND, NM, SC, DC) all use the CORRECTED $15,750/$31,500 OBBBA figure, not the
   * stale $15,000/$30,000 figure — see the file-level comment above.
   *
   * Known structural differences from 2026 confirmed during sourcing (not just inflation-indexed
   * threshold drift, which is expected and handled per-state below):
   * - GA: 5.39% (2026 cut to 5.19%, confirmed multi-year phase-down in progress).
   * - KY: 4.00% (2026 cut to 3.50% per HB 1's trigger-based cut, confirmed). Standard deduction
   *   $3,270 — Kentucky's deduction is a single flat figure, NOT doubled for joint filers (the
   *   same convention as 2026, confirmed against the KY DOR's 2025 announcement).
   * - IN: 3.00% (2026 cut to 2.95%, confirmed multi-year phase-down).
   * - UT: 4.55% (2026 cut to 4.50%). Utah's approximated flat credit is $900/$1,800 for 2025
   *   (vs $966/$1,932 for 2026, inflation-adjusted) — same APPROXIMATED caveat as 2026 applies.
   * - ID: 5.695% (2026 cut to 5.3%) — a scheduled rate cut not flagged in 2026.ts's per-state
   *   notes as a phase-down state; worth a follow-up correction to that file's comments.
   * - MS: 4.40% (2026 cut to 4.00%) — confirmed via Mississippi DOR; part of the Build-Up
   *   Mississippi Act's path toward 3% by 2030. NOT modeled: a separate $6,000/$12,000 personal
   *   exemption MS also has beyond the $2,300/$4,600 standard deduction — same omission as the
   *   existing 2026 config, kept consistent rather than fixed only for one year.
   * - OH: structurally different — 2025 still had TWO non-zero rates (2.75% / 3.5%) above its
   *   exempt threshold; Ohio didn't simplify to a single flat 2.75% rate until 2026. Modeled here
   *   as `type: "bracket"` for 2025 specifically (2026 stays `type: "flat"`), with the same
   *   $2,400/$4,800 personal exemption folded into the bracket thresholds the same way it's
   *   folded into 2026's flat-rate threshold.
   * - MT: 2025's top rate was 5.9% over a $21,100/$42,200 threshold — notably different from
   *   2026's 5.65% over $47,500/$95,000, confirming MT's already-flagged multi-year phase-down
   *   (toward 5.4% legislated for 2027) was already underway between 2025 and 2026.
   * - NE: 2025 had 4 brackets topping out at 5.2%; 2026 consolidated to 3 brackets topping out
   *   at 4.55% — part of Nebraska's LB754 multi-year phase-down toward 3.99% by 2027.
   * - OK: 2025 had 6 brackets (0.25%-4.75%); 2026 consolidated to 4 brackets (0%-4.5%) as part of
   *   a 2026 tax reform — confirmed structurally different, not just inflation drift.
   *
   * RESOLVED during a later reverification pass (see IMPLEMENTATION_PLAN.md): both ME and LA's
   * 2026.ts standardDeduction figures were confirmed wrong and corrected. ME doesn't conform to
   * the federal standard deduction at all (a wrong assumption originally made here too, fixed
   * below) — it has its own COLA-indexed figure ($15,300/$30,600 for 2026, $15,000/$30,000 for
   * 2025, confirmed against Maine Revenue Services directly) plus a separate personal exemption.
   * LA's 2026 figure was indeed the federal conformity number by mistake; corrected to
   * $12,875/$25,750 (Louisiana's own deduction, first CPI-U-adjusted from its $12,500/$25,000
   * 2025 starting figure).
   *
   * PA/NY/MD local tax: reused from the 2026 jurisdiction maps (Philadelphia/Pittsburgh/NYC/MD
   * counties) rather than left unwired, since leaving `localTaxJurisdictions` undefined entirely
   * would silently report "$0 local tax, fully supported" for 2025 entries — exactly the bug just
   * fixed for 2026. Local tax rates (county piggyback %, city wage tax) change far less
   * year-to-year than state brackets, but this is still an approximation: MD's Allegany County
   * (3.03%->3.20%) and Kent County (3.20%->3.30%) specifically increased between 2025 and 2026 per
   * mdLocalTax2026.ts's own sourcing notes, so reusing the 2026 map slightly overstates 2025 local
   * tax for residents of those two counties specifically.
   *
   * Credits NOT separately re-verified for 2025 (reused from 2026's figures as a disclosed
   * approximation, since these are all small-dollar and/or the underlying mechanism is stable):
   * AR, DE, NE, OR's small flat per-filer/per-dependent credits, and MN's $5,300/dependent credit.
   * GA's $4,000/dependent and SC's $4,930/dependent credits WERE separately confirmed unchanged
   * for 2025 via direct state-source verification.
   */
  stateTaxConfigs: buildStateTaxConfigs2025(),
  // Per the One Big Beautiful Bill Act (signed July 2025), the Child Tax Credit is permanently
  // $2,200/child starting this tax year (no longer reverting to the pre-TCJA $1,000 figure).
  // Refundable ACTC cap and phase-out mechanics carried forward from pre-OBBBA TCJA figures —
  // verify against the official 2025 indexed amounts before relying on this for real filings.
  childTaxCredit: {
    amountPerChild: 2200,
    refundableCapPerChild: 1700,
    phaseOutThreshold: { single: 200000, marriedFilingJointly: 400000 },
    phaseOutReductionPer1000: 50,
  },
};

function buildStateTaxConfigs2025(): Record<string, StateTaxConfig> {
  return {
    // ----- No income tax -----
    TX: { type: "none" },
    FL: { type: "none" },
    AK: { type: "none" },
    NV: { type: "none" },
    SD: { type: "none" },
    TN: { type: "none" },
    WA: { type: "none" },
    WY: { type: "none" },
    NH: { type: "none" },

    // ----- Flat rate -----
    PA: {
      type: "flat",
      rate: 0.0307,
      localTaxJurisdictions: paLocalTaxJurisdictions2026,
    },
    AZ: {
      type: "flat",
      rate: 0.025,
      standardDeduction: { single: 15750, marriedFilingJointly: 31500 },
    },
    IL: {
      type: "flat",
      rate: 0.0495,
      standardDeduction: { single: 2850, marriedFilingJointly: 5700 },
    },
    MI: {
      type: "flat",
      rate: 0.0425,
      standardDeduction: { single: 5800, marriedFilingJointly: 11600 },
    },
    CO: {
      type: "flat",
      rate: 0.044,
      standardDeduction: { single: 15750, marriedFilingJointly: 31500 },
    },
    GA: {
      type: "flat",
      rate: 0.0539,
      standardDeduction: { single: 12000, marriedFilingJointly: 24000 },
      credit: { perDependent: 4000 },
    },
    IN: {
      type: "flat",
      rate: 0.03,
      standardDeduction: { single: 1000, marriedFilingJointly: 2000 },
    },
    KY: {
      type: "flat",
      rate: 0.04,
      standardDeduction: { single: 3270, marriedFilingJointly: 3270 },
    },
    NC: {
      type: "flat",
      rate: 0.0425,
      standardDeduction: { single: 12750, marriedFilingJointly: 25500 },
    },
    UT: {
      type: "flat",
      rate: 0.0455,
      credit: { perFiler: { single: 900, marriedFilingJointly: 1800 } },
    },
    ID: {
      type: "flat",
      rate: 0.05695,
      standardDeduction: { single: 4673 + 15750, marriedFilingJointly: 9346 + 31500 },
    },
    IA: {
      type: "flat",
      rate: 0.038,
      standardDeduction: { single: 15750, marriedFilingJointly: 31500 },
    },
    MS: {
      type: "flat",
      rate: 0.044,
      standardDeduction: { single: 10000 + 2300, marriedFilingJointly: 10000 + 4600 },
    },
    LA: {
      type: "flat",
      rate: 0.03,
      standardDeduction: { single: 12500, marriedFilingJointly: 25000 },
    },

    // ----- Progressive brackets -----
    // Ohio hadn't yet simplified to a single flat rate for 2025 — two non-zero rates applied
    // above the exempt threshold (the $2,400/$4,800 personal exemption is folded into the
    // bracket thresholds below, the same way it's folded into 2026's flat-rate threshold).
    OH: {
      type: "bracket",
      // The $2,400/$4,800 personal exemption is folded directly into the bracket thresholds
      // above (not into a separate standardDeduction), so this is 0 to avoid double-counting.
      standardDeduction: { single: 0, marriedFilingJointly: 0 },
      brackets: {
        single: [
          { min: 0, max: 26050 + 2400, rate: 0 },
          { min: 26050 + 2400, max: 100000 + 2400, rate: 0.0275 },
          { min: 100000 + 2400, max: null, rate: 0.035 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 26050 + 4800, rate: 0 },
          { min: 26050 + 4800, max: 100000 + 4800, rate: 0.0275 },
          { min: 100000 + 4800, max: null, rate: 0.035 },
        ],
      },
    },

    CA: {
      type: "bracket",
      // CORRECTED — previously had the $5,540/$11,080 standard deduction and bracket thresholds
      // that turned out to be 2024's figures, not 2025's. Confirmed 2025 figures ($5,706/$11,412
      // deduction; thresholds below) directly against FTB-sourced reporting (NerdWallet, Tax
      // Foundation) and the EDD's 2026 withholding schedule, which still uses these same 2025
      // dollar amounts (FTB hadn't published a further-inflation-adjusted set as of writing) —
      // see 2026.ts's CA entry for the full sourcing/verification note.
      standardDeduction: { single: 5706, marriedFilingJointly: 11412 },
      brackets: {
        single: [
          { min: 0, max: 11079, rate: 0.01 },
          { min: 11079, max: 26264, rate: 0.02 },
          { min: 26264, max: 41452, rate: 0.04 },
          { min: 41452, max: 57542, rate: 0.06 },
          { min: 57542, max: 72724, rate: 0.08 },
          { min: 72724, max: 371479, rate: 0.093 },
          { min: 371479, max: 445771, rate: 0.103 },
          { min: 445771, max: 742953, rate: 0.113 },
          { min: 742953, max: 1000000, rate: 0.123 },
          { min: 1000000, max: null, rate: 0.133 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 22158, rate: 0.01 },
          { min: 22158, max: 52528, rate: 0.02 },
          { min: 52528, max: 82904, rate: 0.04 },
          { min: 82904, max: 115084, rate: 0.06 },
          { min: 115084, max: 145448, rate: 0.08 },
          { min: 145448, max: 742958, rate: 0.093 },
          { min: 742958, max: 891542, rate: 0.103 },
          // Kink at $1,000,000 — the flat (non-doubled) MHSA surcharge threshold cuts through
          // the middle of the 11.3% bracket (891,542-1,485,906) for joint filers.
          { min: 891542, max: 1000000, rate: 0.113 },
          { min: 1000000, max: 1485906, rate: 0.123 },
          { min: 1485906, max: null, rate: 0.133 },
        ],
      },
    },

    NY: {
      type: "bracket",
      standardDeduction: { single: 8000, marriedFilingJointly: 16050 },
      localTaxJurisdictions: nyLocalTaxJurisdictions2026,
      brackets: {
        single: [
          { min: 0, max: 8500, rate: 0.04 },
          { min: 8500, max: 11700, rate: 0.045 },
          { min: 11700, max: 13900, rate: 0.0525 },
          { min: 13900, max: 80650, rate: 0.055 },
          { min: 80650, max: 215400, rate: 0.06 },
          { min: 215400, max: 1077550, rate: 0.0685 },
          { min: 1077550, max: 5000000, rate: 0.0965 },
          { min: 5000000, max: 25000000, rate: 0.103 },
          { min: 25000000, max: null, rate: 0.109 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 17150, rate: 0.04 },
          { min: 17150, max: 23600, rate: 0.045 },
          { min: 23600, max: 27900, rate: 0.0525 },
          { min: 27900, max: 161550, rate: 0.055 },
          { min: 161550, max: 323200, rate: 0.06 },
          { min: 323200, max: 2155350, rate: 0.0685 },
          { min: 2155350, max: 5000000, rate: 0.0965 },
          { min: 5000000, max: 25000000, rate: 0.103 },
          { min: 25000000, max: null, rate: 0.109 },
        ],
      },
    },

    // Maryland's 10-bracket structure (2%-6.5%) was made retroactively effective Jan 1, 2025 by
    // the Budget Reconciliation and Financing Act of 2025 — so 2025 uses the SAME structure as
    // 2026, not the older 8-bracket/5.75%-top structure Tax Foundation's Feb-2025-published report
    // still showed (published before the retroactive law passed).
    MD: {
      type: "bracket",
      standardDeduction: { single: 3350, marriedFilingJointly: 6700 },
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

    AL: {
      type: "bracket",
      standardDeduction: { single: 3000 + 1500, marriedFilingJointly: 8500 + 3000 },
      brackets: {
        single: [
          { min: 0, max: 500, rate: 0.02 },
          { min: 500, max: 3000, rate: 0.04 },
          { min: 3000, max: null, rate: 0.05 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 1000, rate: 0.02 },
          { min: 1000, max: 6000, rate: 0.04 },
          { min: 6000, max: null, rate: 0.05 },
        ],
      },
    },

    AR: {
      type: "bracket",
      standardDeduction: { single: 2410, marriedFilingJointly: 4820 },
      credit: { perFiler: { single: 29, marriedFilingJointly: 58 }, perDependent: 29 },
      brackets: {
        single: [
          { min: 0, max: 4500, rate: 0.02 },
          { min: 4500, max: null, rate: 0.039 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 4500, rate: 0.02 },
          { min: 4500, max: null, rate: 0.039 },
        ],
      },
    },

    CT: {
      type: "bracket",
      standardDeduction: { single: 15000, marriedFilingJointly: 24000 },
      brackets: {
        single: [
          { min: 0, max: 10000, rate: 0.02 },
          { min: 10000, max: 50000, rate: 0.045 },
          { min: 50000, max: 100000, rate: 0.055 },
          { min: 100000, max: 200000, rate: 0.06 },
          { min: 200000, max: 250000, rate: 0.065 },
          { min: 250000, max: 500000, rate: 0.069 },
          { min: 500000, max: null, rate: 0.0699 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 20000, rate: 0.02 },
          { min: 20000, max: 100000, rate: 0.045 },
          { min: 100000, max: 200000, rate: 0.055 },
          { min: 200000, max: 400000, rate: 0.06 },
          { min: 400000, max: 500000, rate: 0.065 },
          { min: 500000, max: 1000000, rate: 0.069 },
          { min: 1000000, max: null, rate: 0.0699 },
        ],
      },
    },

    DE: {
      type: "bracket",
      standardDeduction: { single: 3250, marriedFilingJointly: 6500 },
      credit: { perFiler: { single: 110, marriedFilingJointly: 220 }, perDependent: 110 },
      brackets: {
        single: [
          { min: 0, max: 2000, rate: 0 },
          { min: 2000, max: 5000, rate: 0.022 },
          { min: 5000, max: 10000, rate: 0.039 },
          { min: 10000, max: 20000, rate: 0.048 },
          { min: 20000, max: 25000, rate: 0.052 },
          { min: 25000, max: 60000, rate: 0.0555 },
          { min: 60000, max: null, rate: 0.066 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 2000, rate: 0 },
          { min: 2000, max: 5000, rate: 0.022 },
          { min: 5000, max: 10000, rate: 0.039 },
          { min: 10000, max: 20000, rate: 0.048 },
          { min: 20000, max: 25000, rate: 0.052 },
          { min: 25000, max: 60000, rate: 0.0555 },
          { min: 60000, max: null, rate: 0.066 },
        ],
      },
    },

    HI: {
      type: "bracket",
      standardDeduction: { single: 4400 + 1144, marriedFilingJointly: 8800 + 2288 },
      brackets: {
        single: [
          { min: 0, max: 9600, rate: 0.014 },
          { min: 9600, max: 14400, rate: 0.032 },
          { min: 14400, max: 19200, rate: 0.055 },
          { min: 19200, max: 24000, rate: 0.064 },
          { min: 24000, max: 36000, rate: 0.068 },
          { min: 36000, max: 48000, rate: 0.072 },
          { min: 48000, max: 125000, rate: 0.076 },
          { min: 125000, max: 175000, rate: 0.079 },
          { min: 175000, max: 225000, rate: 0.0825 },
          { min: 225000, max: 275000, rate: 0.09 },
          { min: 275000, max: 325000, rate: 0.1 },
          { min: 325000, max: null, rate: 0.11 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 19200, rate: 0.014 },
          { min: 19200, max: 28800, rate: 0.032 },
          { min: 28800, max: 38400, rate: 0.055 },
          { min: 38400, max: 48000, rate: 0.064 },
          { min: 48000, max: 72000, rate: 0.068 },
          { min: 72000, max: 96000, rate: 0.072 },
          { min: 96000, max: 250000, rate: 0.076 },
          { min: 250000, max: 350000, rate: 0.079 },
          { min: 350000, max: 450000, rate: 0.0825 },
          { min: 450000, max: 550000, rate: 0.09 },
          { min: 550000, max: 650000, rate: 0.1 },
          { min: 650000, max: null, rate: 0.11 },
        ],
      },
    },

    KS: {
      type: "bracket",
      standardDeduction: { single: 3605 + 9160, marriedFilingJointly: 8240 + 18320 },
      brackets: {
        single: [
          { min: 0, max: 23000, rate: 0.052 },
          { min: 23000, max: null, rate: 0.0558 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 46000, rate: 0.052 },
          { min: 46000, max: null, rate: 0.0558 },
        ],
      },
    },

    ME: {
      type: "bracket",
      // CORRECTED — Maine does NOT conform to the federal standard deduction; it has its own
      // basic standard deduction (inflation-indexed via Maine's own COLA factor), confirmed
      // directly against Maine Revenue Services' 2025 instructions as $15,000/$30,000. That
      // figure coincidentally equals the stale pre-OBBBA federal figure this year, which is what
      // led to the wrong assumption here originally — it's Maine's own number, not a
      // federal-conforming one (2026.ts's corrected ME entry confirms this: Maine's own 2026
      // figure, $15,300/$30,600, does NOT match the federal 2026 figure). Personal exemption is
      // a separate $5,150/$10,300.
      standardDeduction: { single: 15000 + 5150, marriedFilingJointly: 30000 + 10300 },
      // Phaseout per Maine's 2025 worksheet (36 M.R.S. 5124-C(2)/5125(7)): $100,000 single /
      // $200,050 MFJ threshold, $75,000/$150,000 additional-limit divisor — see 2026.ts's ME
      // entry for the full mechanism explanation and the same simplification caveat.
      standardDeductionPhaseout: {
        threshold: { single: 100000, marriedFilingJointly: 200050 },
        additionalLimit: { single: 75000, marriedFilingJointly: 150000 },
      },
      brackets: {
        single: [
          { min: 0, max: 26800, rate: 0.058 },
          { min: 26800, max: 63450, rate: 0.0675 },
          { min: 63450, max: null, rate: 0.0715 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 53600, rate: 0.058 },
          { min: 53600, max: 126900, rate: 0.0675 },
          { min: 126900, max: null, rate: 0.0715 },
        ],
      },
    },

    MA: {
      type: "bracket",
      standardDeduction: { single: 4400, marriedFilingJointly: 8800 },
      brackets: {
        single: [
          { min: 0, max: 1083150, rate: 0.05 },
          { min: 1083150, max: null, rate: 0.09 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 1083150, rate: 0.05 },
          { min: 1083150, max: null, rate: 0.09 },
        ],
      },
    },

    MN: {
      type: "bracket",
      standardDeduction: { single: 14950, marriedFilingJointly: 29900 },
      credit: { perDependent: 5300 },
      brackets: {
        single: [
          { min: 0, max: 32570, rate: 0.0535 },
          { min: 32570, max: 106990, rate: 0.068 },
          { min: 106990, max: 198630, rate: 0.0785 },
          { min: 198630, max: null, rate: 0.0985 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 47620, rate: 0.0535 },
          { min: 47620, max: 189180, rate: 0.068 },
          { min: 189180, max: 330410, rate: 0.0785 },
          { min: 330410, max: null, rate: 0.0985 },
        ],
      },
    },

    MO: {
      type: "bracket",
      standardDeduction: { single: 15750, marriedFilingJointly: 31500 },
      brackets: {
        single: [
          { min: 0, max: 1313, rate: 0 },
          { min: 1313, max: 2626, rate: 0.02 },
          { min: 2626, max: 3939, rate: 0.025 },
          { min: 3939, max: 5252, rate: 0.03 },
          { min: 5252, max: 6565, rate: 0.035 },
          { min: 6565, max: 7878, rate: 0.04 },
          { min: 7878, max: 9191, rate: 0.045 },
          { min: 9191, max: null, rate: 0.047 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 1313, rate: 0 },
          { min: 1313, max: 2626, rate: 0.02 },
          { min: 2626, max: 3939, rate: 0.025 },
          { min: 3939, max: 5252, rate: 0.03 },
          { min: 5252, max: 6565, rate: 0.035 },
          { min: 6565, max: 7878, rate: 0.04 },
          { min: 7878, max: 9191, rate: 0.045 },
          { min: 9191, max: null, rate: 0.047 },
        ],
      },
    },

    MT: {
      type: "bracket",
      standardDeduction: { single: 15750, marriedFilingJointly: 31500 },
      brackets: {
        single: [
          { min: 0, max: 21100, rate: 0.047 },
          { min: 21100, max: null, rate: 0.059 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 42200, rate: 0.047 },
          { min: 42200, max: null, rate: 0.059 },
        ],
      },
    },

    NE: {
      type: "bracket",
      standardDeduction: { single: 8600, marriedFilingJointly: 17200 },
      credit: { perFiler: { single: 176, marriedFilingJointly: 352 }, perDependent: 176 },
      brackets: {
        single: [
          { min: 0, max: 4030, rate: 0.0246 },
          { min: 4030, max: 24120, rate: 0.0351 },
          { min: 24120, max: 38870, rate: 0.0501 },
          { min: 38870, max: null, rate: 0.052 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 8040, rate: 0.0246 },
          { min: 8040, max: 48250, rate: 0.0351 },
          { min: 48250, max: 77730, rate: 0.0501 },
          { min: 77730, max: null, rate: 0.052 },
        ],
      },
    },

    NJ: {
      type: "bracket",
      standardDeduction: { single: 1000, marriedFilingJointly: 2000 },
      brackets: {
        single: [
          { min: 0, max: 20000, rate: 0.014 },
          { min: 20000, max: 35000, rate: 0.0175 },
          { min: 35000, max: 40000, rate: 0.035 },
          { min: 40000, max: 75000, rate: 0.0553 },
          { min: 75000, max: 500000, rate: 0.0637 },
          { min: 500000, max: 1000000, rate: 0.0897 },
          { min: 1000000, max: null, rate: 0.1075 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 20000, rate: 0.014 },
          { min: 20000, max: 50000, rate: 0.0175 },
          { min: 50000, max: 70000, rate: 0.0245 },
          { min: 70000, max: 80000, rate: 0.035 },
          { min: 80000, max: 150000, rate: 0.0553 },
          { min: 150000, max: 500000, rate: 0.0637 },
          { min: 500000, max: 1000000, rate: 0.0897 },
          { min: 1000000, max: null, rate: 0.1075 },
        ],
      },
    },

    NM: {
      type: "bracket",
      standardDeduction: { single: 15750, marriedFilingJointly: 31500 },
      brackets: {
        single: [
          { min: 0, max: 5500, rate: 0.015 },
          { min: 5500, max: 16500, rate: 0.032 },
          { min: 16500, max: 33500, rate: 0.043 },
          { min: 33500, max: 66500, rate: 0.047 },
          { min: 66500, max: 210000, rate: 0.049 },
          { min: 210000, max: null, rate: 0.059 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 8000, rate: 0.015 },
          { min: 8000, max: 25000, rate: 0.032 },
          { min: 25000, max: 50000, rate: 0.043 },
          { min: 50000, max: 100000, rate: 0.047 },
          { min: 100000, max: 315000, rate: 0.049 },
          { min: 315000, max: null, rate: 0.059 },
        ],
      },
    },

    ND: {
      type: "bracket",
      standardDeduction: { single: 15750, marriedFilingJointly: 31500 },
      brackets: {
        single: [
          { min: 0, max: 48475, rate: 0 },
          { min: 48475, max: 244825, rate: 0.0195 },
          { min: 244825, max: null, rate: 0.025 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 80975, rate: 0 },
          { min: 80975, max: 298075, rate: 0.0195 },
          { min: 298075, max: null, rate: 0.025 },
        ],
      },
    },

    OK: {
      type: "bracket",
      standardDeduction: { single: 6350 + 1000, marriedFilingJointly: 12700 + 2000 },
      brackets: {
        single: [
          { min: 0, max: 1000, rate: 0.0025 },
          { min: 1000, max: 2500, rate: 0.0075 },
          { min: 2500, max: 3750, rate: 0.0175 },
          { min: 3750, max: 4900, rate: 0.0275 },
          { min: 4900, max: 7200, rate: 0.0375 },
          { min: 7200, max: null, rate: 0.0475 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 2000, rate: 0.0025 },
          { min: 2000, max: 5000, rate: 0.0075 },
          { min: 5000, max: 7500, rate: 0.0175 },
          { min: 7500, max: 9800, rate: 0.0275 },
          { min: 9800, max: 14400, rate: 0.0375 },
          { min: 14400, max: null, rate: 0.0475 },
        ],
      },
    },

    OR: {
      type: "bracket",
      standardDeduction: { single: 2800, marriedFilingJointly: 5600 },
      credit: { perFiler: { single: 256, marriedFilingJointly: 512 }, perDependent: 256 },
      brackets: {
        single: [
          { min: 0, max: 4400, rate: 0.0475 },
          { min: 4400, max: 11050, rate: 0.0675 },
          { min: 11050, max: 125000, rate: 0.0875 },
          { min: 125000, max: null, rate: 0.099 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 8800, rate: 0.0475 },
          { min: 8800, max: 22100, rate: 0.0675 },
          { min: 22100, max: 250000, rate: 0.0875 },
          { min: 250000, max: null, rate: 0.099 },
        ],
      },
    },

    RI: {
      type: "bracket",
      standardDeduction: { single: 11200 + 5100, marriedFilingJointly: 22400 + 10200 },
      brackets: {
        single: [
          { min: 0, max: 79900, rate: 0.0375 },
          { min: 79900, max: 181650, rate: 0.0475 },
          { min: 181650, max: null, rate: 0.0599 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 79900, rate: 0.0375 },
          { min: 79900, max: 181650, rate: 0.0475 },
          { min: 181650, max: null, rate: 0.0599 },
        ],
      },
    },

    SC: {
      type: "bracket",
      // South Carolina has no standard deduction of its own — it starts from federal taxable
      // income, so the federal standard deduction applies directly (confirmed via SC DOR).
      standardDeduction: { single: 15750, marriedFilingJointly: 31500 },
      credit: { perDependent: 4930 },
      brackets: {
        single: [
          { min: 0, max: 3560, rate: 0 },
          { min: 3560, max: 17830, rate: 0.03 },
          { min: 17830, max: null, rate: 0.062 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 3560, rate: 0 },
          { min: 3560, max: 17830, rate: 0.03 },
          { min: 17830, max: null, rate: 0.062 },
        ],
      },
    },

    VT: {
      type: "bracket",
      standardDeduction: { single: 7400 + 5100, marriedFilingJointly: 14850 + 10200 },
      brackets: {
        single: [
          { min: 0, max: 47900, rate: 0.0335 },
          { min: 47900, max: 116000, rate: 0.066 },
          { min: 116000, max: 242000, rate: 0.076 },
          { min: 242000, max: null, rate: 0.0875 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 79950, rate: 0.0335 },
          { min: 79950, max: 193300, rate: 0.066 },
          { min: 193300, max: 294600, rate: 0.076 },
          { min: 294600, max: null, rate: 0.0875 },
        ],
      },
    },

    VA: {
      type: "bracket",
      standardDeduction: { single: 8500 + 930, marriedFilingJointly: 17000 + 1860 },
      brackets: {
        single: [
          { min: 0, max: 3000, rate: 0.02 },
          { min: 3000, max: 5000, rate: 0.03 },
          { min: 5000, max: 17000, rate: 0.05 },
          { min: 17000, max: null, rate: 0.0575 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 3000, rate: 0.02 },
          { min: 3000, max: 5000, rate: 0.03 },
          { min: 5000, max: 17000, rate: 0.05 },
          { min: 17000, max: null, rate: 0.0575 },
        ],
      },
    },

    WV: {
      type: "bracket",
      standardDeduction: { single: 2000, marriedFilingJointly: 4000 },
      brackets: {
        single: [
          { min: 0, max: 10000, rate: 0.0222 },
          { min: 10000, max: 25000, rate: 0.0296 },
          { min: 25000, max: 40000, rate: 0.0333 },
          { min: 40000, max: 60000, rate: 0.0444 },
          { min: 60000, max: null, rate: 0.0482 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 10000, rate: 0.0222 },
          { min: 10000, max: 25000, rate: 0.0296 },
          { min: 25000, max: 40000, rate: 0.0333 },
          { min: 40000, max: 60000, rate: 0.0444 },
          { min: 60000, max: null, rate: 0.0482 },
        ],
      },
    },

    WI: {
      type: "bracket",
      standardDeduction: { single: 13560 + 700, marriedFilingJointly: 25110 + 1400 },
      brackets: {
        single: [
          { min: 0, max: 14680, rate: 0.035 },
          { min: 14680, max: 29370, rate: 0.044 },
          { min: 29370, max: 323290, rate: 0.053 },
          { min: 323290, max: null, rate: 0.0765 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 19580, rate: 0.035 },
          { min: 19580, max: 39150, rate: 0.044 },
          { min: 39150, max: 431060, rate: 0.053 },
          { min: 431060, max: null, rate: 0.0765 },
        ],
      },
    },

    DC: {
      type: "bracket",
      standardDeduction: { single: 15750, marriedFilingJointly: 31500 },
      brackets: {
        single: [
          { min: 0, max: 10000, rate: 0.04 },
          { min: 10000, max: 40000, rate: 0.06 },
          { min: 40000, max: 60000, rate: 0.065 },
          { min: 60000, max: 250000, rate: 0.085 },
          { min: 250000, max: 500000, rate: 0.0925 },
          { min: 500000, max: 1000000, rate: 0.0975 },
          { min: 1000000, max: null, rate: 0.1075 },
        ],
        marriedFilingJointly: [
          { min: 0, max: 10000, rate: 0.04 },
          { min: 10000, max: 40000, rate: 0.06 },
          { min: 40000, max: 60000, rate: 0.065 },
          { min: 60000, max: 250000, rate: 0.085 },
          { min: 250000, max: 500000, rate: 0.0925 },
          { min: 500000, max: 1000000, rate: 0.0975 },
          { min: 1000000, max: null, rate: 0.1075 },
        ],
      },
    },
  };
}

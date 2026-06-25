import type { StateTaxConfig } from "../types";
import { mdLocalTaxJurisdictions2026 } from "./mdLocalTax2026";
import { paLocalTaxJurisdictions2026 } from "./paLocalTax2026";
import { nyLocalTaxJurisdictions2026 } from "./nyLocalTax2026";

/**
 * 2026 state tax configs. All 50 states + DC are covered as of this revision. Add more states
 * by adding entries to this map; no engine code changes needed.
 *
 * Confidence varies by state and should be reviewed before relying on for real filings (see
 * ROADMAP §6 annual review process):
 * - TX, FL: no state income tax. Stable, not subject to change.
 * - PA: flat 3.07% rate, unchanged since 2004 — high confidence.
 * - CA: 2026 brackets/standard deduction confirmed directly against the EDD's official
 *   "California Withholding Schedules for 2026" PDF (edd.ca.gov), cross-checked against
 *   FTB-sourced 2025 figures reported by NerdWallet and the Tax Foundation. EDD's 2026
 *   withholding tables use the same dollar thresholds as the confirmed 2025 figures (FTB hadn't
 *   yet published a distinct, further-inflation-adjusted set at time of writing) — high
 *   confidence on thresholds and the $5,706/$11,412 standard deduction, but re-verify against
 *   FTB.ca.gov once a 2026-specific 540 rate schedule is published, in case it differs.
 *   IMPORTANT: previously had a real bug here — the prior thresholds were stale by about a
 *   year (matched 2024 figures, not the confirmed 2025/2026 ones), AND the MFJ bracket
 *   incorrectly doubled the $1M Mental Health Services Tax surcharge threshold to $2M. The
 *   surcharge threshold is explicitly flat/non-doubled for joint filers (confirmed in the
 *   existing comment elsewhere in this file), so MFJ needs an extra bracket "kink" splitting
 *   exactly at $1,000,000 where the surcharge starts applying mid-bracket — fixed below.
 * - NY: 2026 brackets CONFIRMED — directly verified against the NYS Department of Taxation and
 *   Finance's official "NYS-50-T-NYS (1/26)" withholding publication (bracket thresholds match
 *   exactly) and a Grant Thornton legal summary of the actual enacting law (Chapter 59 of the
 *   Laws of 2025, Part A / A3009): the cut is exactly -0.1 percentage point on the bottom five
 *   sub-brackets below $215,400 single/$323,200 MFJ (4%→3.9%, 4.5%→4.4%, 5.25%→5.15%,
 *   5.5%→5.4%, 6%→5.9%), with a further -0.1 step legislated for 2027 (down to 3.8%-5.8%) — the
 *   brackets above $215,400/$323,200 are untouched by this cut. Previously flagged as
 *   provisional over a since-resolved disagreement about whether the cut was -0.1 or -0.2 —
 *   the existing rates/thresholds below turned out to already be correct, no change needed.
 * - MD: 2025/2026 brackets per Maryland statute text (10 brackets, 2%-6.5%, retroactively
 *   effective Jan 1, 2025 per the Budget Reconciliation and Financing Act of 2025) — high
 *   confidence, sourced from the actual statute. Mandatory local/county "piggyback" income tax
 *   (2.25%-3.30%, varies by county) is modeled separately via `mdLocalTaxJurisdictions2026`
 *   (see `mdLocalTax2026.ts`) — confirmed directly against the Comptroller/DLS official rate
 *   table, no longer the third-party-sourced gap this comment used to describe.
 * - AK, NV, SD, TN, WY: no state personal income tax at all, by state constitution/statute —
 *   stable, not subject to change, same confidence as TX/FL.
 * - WA: no tax on wage/ordinary income (what this app calculates) — high confidence for gig
 *   income specifically. Note WA does have a 7% excise tax on *capital gains* above ~$270k/year
 *   (indexed annually), unrelated to wages/SE income and not modeled here since it's out of
 *   scope for what this app tracks.
 * - NH: fully repealed its 5% tax on interest/dividends (its only income tax of any kind)
 *   effective Jan 1, 2025 — wage/SE income was never taxed by NH even before that. No state
 *   income tax of any kind applies for 2025/2026.
 *
 * Flat-rate states (first batch) — confidence is mixed, several of these states are on active
 * multi-year rate-reduction schedules (sometimes contingent on revenue triggers), unlike PA's
 * rate which hasn't moved since 2004. NOT backfilled into the 2025 config below, since these
 * rates differ by year and verifying each state's actual 2025 figure separately was out of
 * scope for this pass — they'll report unsupported for 2025 until someone backfills that year.
 * - AZ: flat 2.5%, unchanged since 2023 — high confidence, no scheduled further change. Standard
 *   deduction conforms to the federal figure ($16,100/$32,200) — Arizona has no deduction of its
 *   own, by statute.
 * - IL: flat 4.95% — high confidence, stable for years with no scheduled change. Standard
 *   deduction modeled from Illinois's per-person exemption ($2,925/$5,850), which is
 *   deduction-style (reduces taxable income), not a credit.
 * - MI: flat 4.25% — high confidence. (A one-time trigger-based cut to 4.05% applied only to
 *   tax year 2023 per a state Supreme Court ruling; reverted to 4.25% for 2024 onward.) Standard
 *   deduction modeled from Michigan's per-person exemption ($5,900/$11,800), deduction-style.
 * - CO: flat 4.40% — confirmed against the Colorado Dept. of Revenue/Tax Foundation for 2026
 *   (the rate returned to 4.40% for 2025 after a one-year TABOR-triggered dip to 4.25% in 2024,
 *   and held at 4.40% for 2026 — no further TABOR trigger was hit). High confidence. Colorado has
 *   no standard deduction of its own — it taxes federal taxable income directly, so the federal
 *   standard deduction figure ($16,100/$32,200) is used as an approximation; Colorado's own
 *   addback/subtraction rules (e.g. a high-income addback above $300k AGI) aren't modeled.
 * - GA: flat 5.19% — confirmed against Tax Foundation's Feb 2026 report. High confidence.
 *   Standard deduction $12,000/$24,000, confirmed.
 * - IN: flat 2.95% (CORRECTED — previously had 3.00% here, Indiana's actual legislated 2026 step
 *   down the multi-year phase-down schedule). Confirmed against Tax Foundation Feb 2026. Standard
 *   deduction modeled from Indiana's per-person exemption ($1,000/$2,000), deduction-style.
 * - KY: flat 3.50% (CORRECTED — previously had 4.00%; Kentucky's tax-trigger-based cut to 3.5%
 *   took effect Jan 1, 2026 per HB 1, confirmed via the 2025 legislative session). Confirmed
 *   against Tax Foundation Feb 2026. Standard deduction $3,360 (same figure for single and MFJ —
 *   that's correct per actual Kentucky law, a flat per-filer amount, not doubled for joint filers).
 * - NC: flat 3.99% (CORRECTED — previously had 4.25%; North Carolina's scheduled cut to 3.99%
 *   DID take effect for 2026, confirmed via NCDOR/Kiplinger reporting as of mid-2026, despite
 *   political contention over whether the *next* scheduled cut to 3.49% for 2027 will be frozen).
 *   Standard deduction $12,750/$25,500, confirmed.
 * - UT: flat 4.50% (CORRECTED — previously had 4.55%). Confirmed against Tax Foundation Feb 2026.
 *   No standardDeduction (Utah's "personal exemption" isn't a deduction) — modeled instead via
 *   the credit field as an APPROXIMATED flat nonrefundable credit ($966/$1,932). Utah's real
 *   mechanism is 6% of a federal-exemption-equivalent figure with its own income-based phase-out,
 *   not replicated here; the per-dependent piece of Utah's formula isn't modeled either, to avoid
 *   false precision layered on an already-approximated base. See the `credit` config comment.
 *
 * Newly-converted-to-flat states, added in this pass — previously had no entry at all (they'd
 * have been miscategorized as "progressive bracket" states if added without checking, since
 * several converted to flat taxes only recently as part of a broader nationwide trend):
 * - ID: flat 5.3% on income over $4,811 (single) / $9,622 (MFJ) — modeled as a flat rate with
 *   that threshold folded into standardDeduction, since "0% below X, flat rate above X" is
 *   mathematically identical to "flat rate with a standard deduction of X" when nothing else
 *   stacks on top. Plus Idaho's own separate standard deduction ($16,100/$32,200, conforms to
 *   the federal amount) — both folded together below.
 * - IA: flat 3.8%, completed its multi-year phase-down to a single rate starting tax year 2025.
 *   Standard deduction $16,100/$32,200 (conforms to federal amount).
 * - MS: flat 4% on income over $10,000 — same "threshold-as-deduction" modeling as Idaho, plus
 *   Mississippi's own standard deduction ($2,300/$4,600), both folded together below.
 * - OH: flat 2.75% on income over $26,050 — Ohio transitioned to a flat rate for 2026 (previously
 *   had progressive brackets), modeled the same threshold-as-deduction way as Idaho/Mississippi.
 * - LA: flat 3%, completed its move away from graduated brackets starting tax year 2025. Standard
 *   deduction $14,600/$29,200.
 * All five confirmed against Tax Foundation's Feb 2026 report / each state's DOR — high confidence
 * for the headline rate; see the per-dependent/credit caveat below for what's NOT modeled.
 *
 * Progressive-bracket states added in this pass — all sourced from the Tax Foundation's "2026
 * State Individual Income Tax Rates and Brackets" report (published Feb 11, 2026), the same
 * style of authoritative source already used for CA/NY/MD above. High confidence on rates/
 * bracket thresholds for all of: AL, AR, CT, DE, HI, KS, ME, MA, MN, MO, MT, NE, NJ, NM, ND, OK,
 * OR, RI, SC, VT, VA, WV, WI, and DC.
 *
 * STATE TAX CREDITS: `StateCreditConfig` (see types.ts) models a nonrefundable flat per-filer
 * and/or per-dependent credit, applied against stateLevelTax only (never local tax), floored at
 * $0 — mirroring how the federal Child Tax Credit only offsets income tax, not SE tax, and
 * reusing the same numberOfChildren count already plumbed through for that. Modeled for:
 * - UT (approximated flat credit, see above — its real formula isn't replicated)
 * - AR, DE, NE, OR: small flat per-filer + per-dependent credits ($29–$256) — genuinely tiny,
 *   modeled mainly because the mechanism existed anyway, not because they materially change a
 *   user's estimate.
 * - GA ($4,000/dependent), MN ($5,300/dependent), SC ($4,930/dependent): genuinely material for
 *   a gig worker with kids — these were the actual motivation for building the credit mechanism.
 * NOT modeled: NM's per-dependent *deduction* (not a credit — it's also an irregular "$4,000 for
 * all but one dependent" rule, not a clean per-dependent multiple, which made it a poor fit to
 * force into either the deduction or credit mechanism without misrepresenting the actual rule).
 * Every other state's per-dependent amount found during sourcing was a credit, not a deduction —
 * NM is the only deduction-shaped exception, left as a disclosed gap.
 *
 * Where a state's personal exemption is itself deduction-style (reduces taxable income, not tax
 * owed directly) — AL, CT, HI, KS, ME, MA, NJ, OK, RI, VT, VA, WI, WV — it IS folded into that
 * state's standardDeduction figure below, since that's mathematically equivalent and a real
 * accuracy improvement over omitting it.
 */
export const stateTaxConfigs2026: Record<string, StateTaxConfig> = {
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
    // PA's personal income tax has no standard deduction or personal exemption.
    localTaxJurisdictions: paLocalTaxJurisdictions2026,
  },
  AZ: {
    type: "flat",
    rate: 0.025,
    // Arizona conforms to the federal standard deduction rather than having its own figure.
    standardDeduction: { single: 16100, marriedFilingJointly: 32200 },
  },
  IL: {
    type: "flat",
    rate: 0.0495,
    // Illinois has no standard deduction, only a per-person exemption — deduction-style (not a
    // credit), so it's modeled the same way as a standard deduction here.
    standardDeduction: { single: 2925, marriedFilingJointly: 5850 },
  },
  MI: {
    type: "flat",
    rate: 0.0425,
    standardDeduction: { single: 5900, marriedFilingJointly: 11800 },
  },
  CO: {
    type: "flat",
    rate: 0.044,
    // Colorado has no standard deduction of its own — it taxes federal taxable income directly
    // (already net of the federal standard deduction/itemized deductions), with state-specific
    // additions/subtractions layered on top that aren't modeled here (e.g. a high-income addback
    // above $300k AGI, a SALT addback). Using the federal standard deduction figure here
    // approximates "federal taxable income" reasonably well for a typical gig worker's income
    // level, without claiming to replicate Colorado's full addback/subtraction rules.
    standardDeduction: { single: 16100, marriedFilingJointly: 32200 },
  },
  GA: {
    type: "flat",
    rate: 0.0519,
    standardDeduction: { single: 12000, marriedFilingJointly: 24000 },
    // Georgia's $4,000/dependent credit — genuinely material for a parent, not a rounding error.
    credit: { perDependent: 4000 },
  },
  IN: {
    type: "flat",
    rate: 0.0295,
    standardDeduction: { single: 1000, marriedFilingJointly: 2000 },
  },
  KY: {
    type: "flat",
    rate: 0.035,
    standardDeduction: { single: 3360, marriedFilingJointly: 3360 },
  },
  NC: {
    type: "flat",
    rate: 0.0399,
    standardDeduction: { single: 12750, marriedFilingJointly: 25500 },
  },
  UT: {
    type: "flat",
    rate: 0.045,
    // Utah's "personal exemption" is structured as a nonrefundable tax CREDIT (its "taxpayer tax
    // credit"), not a deduction — modeled via the credit field below, NOT standardDeduction.
    // APPROXIMATED: Utah's real formula is 6% of a federal-exemption-equivalent figure, with its
    // own income-based phase-out that isn't replicated here. Using the flat $966/$1,932 figures
    // Tax Foundation reports as the effective credit at typical income levels — accurate for most
    // gig-worker incomes where the phase-out doesn't apply, but not a full replication of Utah's
    // formula. The per-dependent piece of Utah's formula isn't modeled either, to avoid false
    // precision on top of an already-approximated base figure.
    credit: { perFiler: { single: 966, marriedFilingJointly: 1932 } },
  },
  ID: {
    type: "flat",
    rate: 0.053,
    standardDeduction: { single: 4811 + 16100, marriedFilingJointly: 9622 + 32200 },
  },
  IA: {
    type: "flat",
    rate: 0.038,
    standardDeduction: { single: 16100, marriedFilingJointly: 32200 },
  },
  MS: {
    type: "flat",
    rate: 0.04,
    standardDeduction: { single: 10000 + 2300, marriedFilingJointly: 10000 + 4600 },
  },
  OH: {
    type: "flat",
    rate: 0.0275,
    standardDeduction: { single: 26050 + 2400, marriedFilingJointly: 26050 + 4800 },
  },
  LA: {
    type: "flat",
    rate: 0.03,
    // CORRECTED — previously had $14,600/$29,200, which was the FEDERAL standard deduction
    // figure, not Louisiana's own. Louisiana's flat-tax reform set its own deduction at
    // $12,500/$25,000 starting tax year 2025, with its first CPI-U inflation adjustment for 2026
    // confirmed against the Tax Foundation's 2026 report: $12,875/$25,750.
    standardDeduction: { single: 12875, marriedFilingJointly: 25750 },
  },

  // ----- Progressive brackets -----
  CA: {
    type: "bracket",
    standardDeduction: {
      single: 5706,
      marriedFilingJointly: 11412,
    },
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
        // Kink at exactly $1,000,000 — the 11.3% statutory bracket runs 891,542-1,485,906, but
        // the flat (non-doubled) $1M MHSA surcharge threshold cuts through the middle of it.
        { min: 891542, max: 1000000, rate: 0.113 },
        { min: 1000000, max: 1485906, rate: 0.123 },
        { min: 1485906, max: null, rate: 0.133 },
      ],
    },
  },

  NY: {
    type: "bracket",
    standardDeduction: {
      single: 8000,
      marriedFilingJointly: 16050,
    },
    localTaxJurisdictions: nyLocalTaxJurisdictions2026,
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
    standardDeduction: { single: 2470, marriedFilingJointly: 4940 },
    credit: { perFiler: { single: 29, marriedFilingJointly: 58 }, perDependent: 29 },
    brackets: {
      single: [
        { min: 0, max: 4600, rate: 0.02 },
        { min: 4600, max: null, rate: 0.039 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 4600, rate: 0.02 },
        { min: 4600, max: null, rate: 0.039 },
      ],
    },
  },

  CT: {
    type: "bracket",
    // CT has no separately-listed "standard deduction" — its personal exemption figure
    // ($15,000/$24,000) functions as the equivalent base reduction to taxable income.
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
    // CORRECTED — previously had $8,350/$16,700 as "Maine's own standard deduction," but that
    // doesn't match what Maine Revenue Services actually publishes. Maine has its OWN basic
    // standard deduction (inflation-indexed via Maine's own 1.279 COLA factor for 2026, not
    // federal conformity — the two only coincidentally lined up in some prior years), confirmed
    // directly against MRS's 2026 rate schedule: $15,300/$30,600, plus the separate $5,300
    // personal exemption.
    standardDeduction: { single: 15300 + 5300, marriedFilingJointly: 30600 + 5300 },
    // Phaseout per Maine's own 2026 Estimated Tax Worksheet (36 M.R.S. 5124-C(2)/5125(7),
    // confirmed directly against MRS's published worksheet): deduction is reduced by
    // standardDeduction * min(1, (MAGI - threshold) / additionalLimit) once MAGI exceeds the
    // threshold. Maine's personal-exemption phaseout (36 M.R.S. 5126-A) uses different, much
    // higher thresholds ($125k/$250k-area divisors) — applying this lower-threshold formula to
    // the combined deduction+exemption figure above is a simplification that slightly overstates
    // tax at high incomes rather than understating it, consistent with this codebase's existing
    // bias (see StandardDeductionPhaseout's doc comment).
    standardDeductionPhaseout: {
      threshold: { single: 102250, marriedFilingJointly: 204550 },
      additionalLimit: { single: 75000, marriedFilingJointly: 150000 },
    },
    brackets: {
      single: [
        { min: 0, max: 27399, rate: 0.058 },
        { min: 27399, max: 64849, rate: 0.0675 },
        { min: 64849, max: 1000000, rate: 0.0715 },
        // Maine's new 2% surcharge (signed for tax years beginning 2026) on Maine taxable income
        // over $1M single / $1.5M MFJ — modeled the same way MA's millionaire's surtax is, as an
        // extra bracket tier, not a separate mechanism.
        { min: 1000000, max: null, rate: 0.0915 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 54849, rate: 0.058 },
        { min: 54849, max: 129749, rate: 0.0675 },
        { min: 129749, max: 1500000, rate: 0.0715 },
        { min: 1500000, max: null, rate: 0.0915 },
      ],
    },
  },

  MA: {
    type: "bracket",
    // Massachusetts: flat 5% plus a 4% surtax (so 9% total) on income above $1,083,150 — modeled
    // as a 2-bracket structure rather than a true flat rate for that reason.
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
    standardDeduction: { single: 15300, marriedFilingJointly: 30600 },
    // Minnesota's $5,300/dependent credit — genuinely material for a parent, not a rounding error.
    credit: { perDependent: 5300 },
    brackets: {
      single: [
        { min: 0, max: 33310, rate: 0.0535 },
        { min: 33310, max: 109430, rate: 0.068 },
        { min: 109430, max: 203150, rate: 0.0785 },
        { min: 203150, max: null, rate: 0.0985 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 48700, rate: 0.0535 },
        { min: 48700, max: 193480, rate: 0.068 },
        { min: 193480, max: 337930, rate: 0.0785 },
        { min: 337930, max: null, rate: 0.0985 },
      ],
    },
  },

  MO: {
    type: "bracket",
    standardDeduction: { single: 16100, marriedFilingJointly: 32200 },
    brackets: {
      single: [
        { min: 0, max: 1348, rate: 0 },
        { min: 1348, max: 2696, rate: 0.02 },
        { min: 2696, max: 4044, rate: 0.025 },
        { min: 4044, max: 5392, rate: 0.03 },
        { min: 5392, max: 6740, rate: 0.035 },
        { min: 6740, max: 8088, rate: 0.04 },
        { min: 8088, max: 9436, rate: 0.045 },
        { min: 9436, max: null, rate: 0.047 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 1348, rate: 0 },
        { min: 1348, max: 2696, rate: 0.02 },
        { min: 2696, max: 4044, rate: 0.025 },
        { min: 4044, max: 5392, rate: 0.03 },
        { min: 5392, max: 6740, rate: 0.035 },
        { min: 6740, max: 8088, rate: 0.04 },
        { min: 8088, max: 9436, rate: 0.045 },
        { min: 9436, max: null, rate: 0.047 },
      ],
    },
  },

  MT: {
    type: "bracket",
    standardDeduction: { single: 16100, marriedFilingJointly: 32200 },
    brackets: {
      single: [
        { min: 0, max: 47500, rate: 0.047 },
        { min: 47500, max: null, rate: 0.0565 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 95000, rate: 0.047 },
        { min: 95000, max: null, rate: 0.0565 },
      ],
    },
  },

  NE: {
    type: "bracket",
    standardDeduction: { single: 8850, marriedFilingJointly: 17700 },
    credit: { perFiler: { single: 176, marriedFilingJointly: 352 }, perDependent: 176 },
    brackets: {
      single: [
        { min: 0, max: 4130, rate: 0.0246 },
        { min: 4130, max: 24760, rate: 0.0351 },
        { min: 24760, max: null, rate: 0.0455 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 8250, rate: 0.0246 },
        { min: 8250, max: 49530, rate: 0.0351 },
        { min: 49530, max: null, rate: 0.0455 },
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
    // Per-dependent $4,000 deduction not modeled — see the per-state simplification note above.
    standardDeduction: { single: 16100, marriedFilingJointly: 32200 },
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
    standardDeduction: { single: 16100, marriedFilingJointly: 32200 },
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
        { min: 0, max: 3750, rate: 0 },
        { min: 3750, max: 4900, rate: 0.025 },
        { min: 4900, max: 7200, rate: 0.035 },
        { min: 7200, max: null, rate: 0.045 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 7500, rate: 0 },
        { min: 7500, max: 9800, rate: 0.025 },
        { min: 9800, max: 14400, rate: 0.035 },
        { min: 14400, max: null, rate: 0.045 },
      ],
    },
  },

  OR: {
    type: "bracket",
    standardDeduction: { single: 2910, marriedFilingJointly: 5820 },
    credit: { perFiler: { single: 256, marriedFilingJointly: 512 }, perDependent: 256 },
    brackets: {
      single: [
        { min: 0, max: 4550, rate: 0.0475 },
        { min: 4550, max: 11400, rate: 0.0675 },
        { min: 11400, max: 125000, rate: 0.0875 },
        { min: 125000, max: null, rate: 0.099 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 9100, rate: 0.0475 },
        { min: 9100, max: 22800, rate: 0.0675 },
        { min: 22800, max: 250000, rate: 0.0875 },
        { min: 250000, max: null, rate: 0.099 },
      ],
    },
  },

  RI: {
    type: "bracket",
    standardDeduction: { single: 11200 + 5250, marriedFilingJointly: 22400 + 10500 },
    brackets: {
      single: [
        { min: 0, max: 82050, rate: 0.0375 },
        { min: 82050, max: 186450, rate: 0.0475 },
        { min: 186450, max: null, rate: 0.0599 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 82050, rate: 0.0375 },
        { min: 82050, max: 186450, rate: 0.0475 },
        { min: 186450, max: null, rate: 0.0599 },
      ],
    },
  },

  SC: {
    type: "bracket",
    standardDeduction: { single: 8350, marriedFilingJointly: 16700 },
    // South Carolina's $4,930/dependent credit — genuinely material for a parent.
    credit: { perDependent: 4930 },
    brackets: {
      single: [
        { min: 0, max: 3640, rate: 0 },
        { min: 3640, max: 18230, rate: 0.03 },
        { min: 18230, max: null, rate: 0.06 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 3640, rate: 0 },
        { min: 3640, max: 18230, rate: 0.03 },
        { min: 18230, max: null, rate: 0.06 },
      ],
    },
  },

  VT: {
    type: "bracket",
    standardDeduction: { single: 7650 + 5300, marriedFilingJointly: 15300 + 10600 },
    brackets: {
      single: [
        { min: 0, max: 49400, rate: 0.0335 },
        { min: 49400, max: 119700, rate: 0.066 },
        { min: 119700, max: 249700, rate: 0.076 },
        { min: 249700, max: null, rate: 0.0875 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 82500, rate: 0.0335 },
        { min: 82500, max: 199450, rate: 0.066 },
        { min: 199450, max: 304000, rate: 0.076 },
        { min: 304000, max: null, rate: 0.0875 },
      ],
    },
  },

  VA: {
    type: "bracket",
    standardDeduction: { single: 8750 + 930, marriedFilingJointly: 17500 + 1860 },
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
    standardDeduction: { single: 13960 + 700, marriedFilingJointly: 25840 + 1400 },
    brackets: {
      single: [
        { min: 0, max: 15110, rate: 0.035 },
        { min: 15110, max: 51950, rate: 0.044 },
        { min: 51950, max: 332720, rate: 0.053 },
        { min: 332720, max: null, rate: 0.0765 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 20150, rate: 0.035 },
        { min: 20150, max: 69260, rate: 0.044 },
        { min: 69260, max: 443630, rate: 0.053 },
        { min: 443630, max: null, rate: 0.0765 },
      ],
    },
  },

  DC: {
    type: "bracket",
    standardDeduction: { single: 16100, marriedFilingJointly: 32200 },
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

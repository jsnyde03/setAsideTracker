import type { LocalTaxConfig } from "../types";

/**
 * Pennsylvania's local Earned Income Tax (EIT) — unlike Maryland's single statewide county
 * system, PA has thousands of separate municipality + school district EIT jurisdictions (Act 32),
 * each able to set its own combined rate. Comprehensively sourcing every one of them is not
 * realistic for this app; this file deliberately only covers the two largest cities, where the
 * population impact is highest. Picking any jurisdiction NOT listed here correctly falls through
 * to the existing "unrecognized jurisdiction" path (localTaxSupported: false, a warning shown,
 * not a silent $0) — the same honest-uncertainty pattern already used for an unrecognized MD
 * county. The real fix this file is for: PA previously had NO localTaxJurisdictions configured
 * at all, which meant EVERY PA resident silently saw "$0 local tax, fully supported" with no
 * warning at all, regardless of which municipality they're in. Adding even this partial list
 * fixes that for most users by triggering the warning instead of silence.
 *
 * - Philadelphia: city's own separate "Wage Tax" system (not the general Act 32 EIT system used
 *   elsewhere in PA). Rate is APPROXIMATED as a blended annual average (3.72%) because it changes
 *   mid-year as part of a multi-year city-council-approved cut: 3.74% for Jan-Jun 2026, dropping
 *   to ~3.70% from Jul 1, 2026 onward — this engine has no mechanism for a rate that changes
 *   partway through a single tax year, so a blended average is the least-wrong simple option.
 *   Verify against the Philadelphia Department of Revenue before relying on this for real filings.
 * - Pittsburgh: combined resident EIT (1% city + 2% school district, both confirmed against
 *   multiple sources) = 3.0% flat. NOT modeled: a separate flat $52/year "Local Services Tax" —
 *   genuinely too small to matter for a "how much to set aside" estimate, disclosed rather than
 *   silently included.
 */
export const paLocalTaxJurisdictions2026: Record<string, LocalTaxConfig> = {
  Philadelphia: { type: "flat", rate: 0.0372 },
  Pittsburgh: { type: "flat", rate: 0.03 },
};

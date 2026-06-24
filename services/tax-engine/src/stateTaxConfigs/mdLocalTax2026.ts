import type { LocalTaxConfig } from "../types";

/**
 * Maryland's mandatory county "piggyback" income tax, applied to the same Maryland taxable
 * income as the state-level tax. Maryland collects this on the state return (Form 502) on
 * behalf of all 23 counties and Baltimore City; there's no separate county filing.
 *
 * Source: third-party aggregation (countrytaxcalc.com), cross-checked against a Tax Foundation
 * summary noting the 2.25%-3.30% range, the Allegany (3.03%->3.20%) and Kent (3.20%->3.30%)
 * rate increases for 2026, and the 3.20% statutory cap with Dorchester/Kent authorized above it
 * by special local legislation. NOT yet cross-checked against the official Comptroller/DLS PDF
 * tables — verify before relying on for real filings (see ROADMAP §6 annual review process).
 *
 * The rate that applies is based on county of RESIDENCE on Dec 31 of the tax year, not where
 * the work happens — this module doesn't know the difference between "primarily works in MD"
 * and "lives in MD," so the county the user picks should be where they live.
 *
 * Anne Arundel and Frederick have graduated/tiered rate structures rather than a single flat
 * rate; modeled here using the same bracket math as state/federal brackets.
 */
export const mdLocalTaxJurisdictions2026: Record<string, LocalTaxConfig> = {
  "Allegany County": { type: "flat", rate: 0.032 },
  "Baltimore City": { type: "flat", rate: 0.032 },
  "Baltimore County": { type: "flat", rate: 0.032 },
  "Calvert County": { type: "flat", rate: 0.032 },
  "Caroline County": { type: "flat", rate: 0.032 },
  "Carroll County": { type: "flat", rate: 0.0303 },
  "Cecil County": { type: "flat", rate: 0.0274 },
  "Charles County": { type: "flat", rate: 0.0303 },
  "Dorchester County": { type: "flat", rate: 0.033 },
  "Garrett County": { type: "flat", rate: 0.0265 },
  "Harford County": { type: "flat", rate: 0.0306 },
  "Howard County": { type: "flat", rate: 0.032 },
  "Kent County": { type: "flat", rate: 0.033 },
  "Montgomery County": { type: "flat", rate: 0.032 },
  "Prince George's County": { type: "flat", rate: 0.032 },
  "Queen Anne's County": { type: "flat", rate: 0.032 },
  "St. Mary's County": { type: "flat", rate: 0.032 },
  "Somerset County": { type: "flat", rate: 0.032 },
  "Talbot County": { type: "flat", rate: 0.024 },
  "Washington County": { type: "flat", rate: 0.0295 },
  "Wicomico County": { type: "flat", rate: 0.032 },
  "Worcester County": { type: "flat", rate: 0.0225 },
  // Nonresidents who work in MD but live elsewhere pay this flat rate instead of a county rate.
  Nonresident: { type: "flat", rate: 0.0225 },

  "Anne Arundel County": {
    type: "bracket",
    brackets: {
      single: [
        { min: 0, max: 50000, rate: 0.027 },
        { min: 50000, max: 400000, rate: 0.0294 },
        { min: 400000, max: null, rate: 0.032 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 75000, rate: 0.027 },
        { min: 75000, max: 480000, rate: 0.0294 },
        { min: 480000, max: null, rate: 0.032 },
      ],
    },
  },

  "Frederick County": {
    type: "bracket",
    brackets: {
      single: [
        { min: 0, max: 25000, rate: 0.0225 },
        { min: 25000, max: 50000, rate: 0.0275 },
        { min: 50000, max: 150000, rate: 0.0296 },
        { min: 150000, max: null, rate: 0.032 },
      ],
      marriedFilingJointly: [
        { min: 0, max: 25000, rate: 0.0225 },
        { min: 25000, max: 100000, rate: 0.0275 },
        { min: 100000, max: 250000, rate: 0.0296 },
        { min: 250000, max: null, rate: 0.032 },
      ],
    },
  },
};

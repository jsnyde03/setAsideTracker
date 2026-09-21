import { describe, expect, it } from "vitest";
import { currentTaxYear, taxYearConfigs } from "@gig-tax-tracker/tax-engine";

import { US_STATES, searchStates, stateName } from "../states";

/**
 * ⚠️ The point of this file. `US_STATES` is hand-written, and a hand-written list is exactly what
 * goes stale — so it is checked against the engine's own configs rather than trusted. A name with
 * no config offers a state the app cannot tax; a config with no name hides one that works. Both
 * directions are asserted, for every tax year, so neither can drift silently.
 */
describe("US_STATES matches the tax engine exactly", () => {
  const years = Object.keys(taxYearConfigs).map(Number);

  it("covers every tax year the engine ships", () => {
    expect(years.length).toBeGreaterThan(0);
  });

  for (const year of years) {
    it(`has no missing or extra states for ${year}`, () => {
      const configured = Object.keys(taxYearConfigs[year].stateTaxConfigs).sort();
      const listed = US_STATES.map((s) => s.code).sort();

      const missing = configured.filter((c) => !listed.includes(c));
      const extra = listed.filter((c) => !configured.includes(c));

      expect(missing).toEqual([]); // a taxable state the picker would never offer
      expect(extra).toEqual([]); // a pickable state with no tax config behind it
    });
  }

  it("offers all 50 states plus DC", () => {
    expect(US_STATES).toHaveLength(51);
    expect(US_STATES.map((s) => s.code)).toContain("DC");
  });

  it("every entry has a distinct code and a real name", () => {
    const codes = US_STATES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const s of US_STATES) {
      expect(s.code).toMatch(/^[A-Z]{2}$/);
      expect(s.name.trim().length).toBeGreaterThan(3);
    }
  });

  it("the current year's config is one of the years checked above", () => {
    // Guards against the engine adding a year that the loop never sees.
    expect(years).toContain(currentTaxYear.year);
  });
});

describe("searchStates", () => {
  it("finds a state by its full name — the input that used to fail", () => {
    // Typing "California" produced the key CALIFORNIA, which matched nothing, so the app reported
    // $0 state tax and "CALIFORNIA isn't supported yet". This is that exact path.
    const hits = searchStates("California");
    expect(hits).toHaveLength(1);
    expect(hits[0].code).toBe("CA");
  });

  it("finds a state by code", () => {
    expect(searchStates("ca").map((s) => s.code)).toContain("CA");
  });

  it("matches partial names anywhere in the word", () => {
    expect(searchStates("carolina").map((s) => s.code).sort()).toEqual(["NC", "SC"]);
  });

  it("is case and whitespace insensitive", () => {
    expect(searchStates("  nEw yOrk ")[0].code).toBe("NY");
  });

  it("shows every state before anything is typed", () => {
    // The whole list is visible up front, so "all states are supported" is apparent rather than
    // something the user has to discover by guessing letters.
    expect(searchStates("")).toHaveLength(51);
  });

  it("returns nothing for a non-state rather than guessing", () => {
    // Territories genuinely have no config; offering a near-match would be worse than an empty list.
    expect(searchStates("Puerto Rico")).toEqual([]);
  });
});

describe("stateName", () => {
  it("resolves a code to its full name", () => {
    expect(stateName("CA")).toBe("California");
    expect(stateName("dc")).toBe("District of Columbia");
  });

  it("passes through anything it doesn't recognise", () => {
    expect(stateName("PR")).toBe("PR");
  });
});

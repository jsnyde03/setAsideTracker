import { describe, expect, it } from "vitest";
import { federalHolidaysObserved, isBusinessDay, nextBusinessDay } from "../notifications/businessDays";
import { getQuarterlyDueDatesForTaxYear } from "../notifications/quarterlyDueDates";

/**
 * The assertions below are **published IRS deadlines**, not outputs of this code read back. That
 * matters: a table of expectations derived from the implementation would agree with any shifting
 * rule it happened to encode, including a weekend-only one.
 */
describe("nextBusinessDay — against real IRS deadlines", () => {
  it("moves April past Emancipation Day even when the 15th is an ordinary weekday", () => {
    // Apr 16 2022 was a Saturday, so DC observed Emancipation Day on Friday Apr 15 — the deadline
    // day itself. The IRS deadline was Monday April 18, 2022.
    expect(nextBusinessDay(new Date(2022, 3, 15))).toEqual(new Date(2022, 3, 18));
  });

  it("moves April past a weekend AND the Monday-observed Emancipation Day", () => {
    // Apr 15 2023 Sat → Apr 16 Sun (Emancipation) → observed Mon Apr 17 → deadline Tue Apr 18.
    expect(nextBusinessDay(new Date(2023, 3, 15))).toEqual(new Date(2023, 3, 18));
  });

  it("moves January past MLK Day when the 15th IS MLK Day", () => {
    // Jan 15 2024 was the third Monday. Q4-2023 estimated tax was due Tuesday January 16, 2024.
    expect(nextBusinessDay(new Date(2024, 0, 15))).toEqual(new Date(2024, 0, 16));
  });

  it("moves January past the weekend and then past MLK Day — two hops", () => {
    // Jan 15 2022 Sat → Mon Jan 17 is MLK → Tue Jan 18. This is the case a single shift gets wrong.
    expect(nextBusinessDay(new Date(2022, 0, 15))).toEqual(new Date(2022, 0, 18));
    // Jan 15 2023 Sun → Mon Jan 16 is MLK → Tue Jan 17.
    expect(nextBusinessDay(new Date(2023, 0, 15))).toEqual(new Date(2023, 0, 17));
  });

  it("moves a plain weekend date to the Monday", () => {
    expect(nextBusinessDay(new Date(2024, 5, 15))).toEqual(new Date(2024, 5, 17)); // Sat Jun 15
    expect(nextBusinessDay(new Date(2024, 8, 15))).toEqual(new Date(2024, 8, 16)); // Sun Sep 15
  });

  it("leaves an ordinary business day alone, and does not mutate its argument", () => {
    const input = new Date(2026, 3, 15); // Wednesday, no holiday
    expect(nextBusinessDay(input)).toEqual(new Date(2026, 3, 15));
    expect(input).toEqual(new Date(2026, 3, 15));
  });
});

describe("every January 15 falling Sat/Sun/Mon needs more than a weekend shift", () => {
  it("never lands the deadline on MLK Day, across 40 years", () => {
    for (let year = 2020; year <= 2060; year++) {
      const due = nextBusinessDay(new Date(year, 0, 15));
      expect(isBusinessDay(due)).toBe(true);
      expect(due.getTime()).toBeGreaterThanOrEqual(new Date(year, 0, 15).getTime());
    }
  });
});

describe("federalHolidaysObserved", () => {
  it("observes a Saturday holiday on the Friday and a Sunday holiday on the Monday", () => {
    // Jul 4 2026 is a Saturday → observed Friday Jul 3.
    expect(federalHolidaysObserved(2026).has("2026-07-03")).toBe(true);
    expect(federalHolidaysObserved(2026).has("2026-07-04")).toBe(false);
    // Christmas 2027 is a Saturday → observed Friday Dec 24.
    expect(federalHolidaysObserved(2027).has("2027-12-24")).toBe(true);
  });

  it("places the floating holidays on their nth-weekday rule", () => {
    expect(federalHolidaysObserved(2026).has("2026-01-19")).toBe(true); // MLK, 3rd Mon
    expect(federalHolidaysObserved(2026).has("2026-05-25")).toBe(true); // Memorial, last Mon
    expect(federalHolidaysObserved(2026).has("2026-09-07")).toBe(true); // Labor, 1st Mon
    expect(federalHolidaysObserved(2026).has("2026-11-26")).toBe(true); // Thanksgiving, 4th Thu
  });
});

describe("getQuarterlyDueDatesForTaxYear — the shift reaches the due dates", () => {
  it("returns the real deadlines for tax year 2022", () => {
    const dates = getQuarterlyDueDatesForTaxYear(2022);
    expect(dates[0].dueDate).toEqual(new Date(2022, 3, 18)); // Emancipation Day
    expect(dates[1].dueDate).toEqual(new Date(2022, 5, 15)); // Wed, unshifted
    expect(dates[2].dueDate).toEqual(new Date(2022, 8, 15)); // Thu, unshifted
    expect(dates[3].dueDate).toEqual(new Date(2023, 0, 17)); // Jan 15 Sun → MLK Mon → Tue
  });

  it("returns a business day for every quarter across 40 tax years", () => {
    for (let taxYear = 2020; taxYear <= 2060; taxYear++) {
      for (const { label, dueDate } of getQuarterlyDueDatesForTaxYear(taxYear)) {
        expect(isBusinessDay(dueDate), `${label} fell on ${dueDate.toDateString()}`).toBe(true);
      }
    }
  });
});

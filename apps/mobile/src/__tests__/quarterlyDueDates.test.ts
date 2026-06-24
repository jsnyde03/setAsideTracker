import { describe, expect, it } from "vitest";
import { getQuarterlyDueDatesForTaxYear, getUpcomingQuarterlyDueDates } from "../notifications/quarterlyDueDates";

describe("getQuarterlyDueDatesForTaxYear", () => {
  it("returns the 4 standard due dates, with Q4 landing in the following January", () => {
    const dates = getQuarterlyDueDatesForTaxYear(2026);
    expect(dates).toHaveLength(4);

    expect(dates[0].dueDate).toEqual(new Date(2026, 3, 15)); // Apr 15, 2026
    expect(dates[1].dueDate).toEqual(new Date(2026, 5, 15)); // Jun 15, 2026
    expect(dates[2].dueDate).toEqual(new Date(2026, 8, 15)); // Sep 15, 2026
    expect(dates[3].dueDate).toEqual(new Date(2027, 0, 15)); // Jan 15, 2027

    for (const { dueDate } of dates) {
      expect(dueDate.getFullYear()).toBeGreaterThanOrEqual(2026);
    }
  });
});

describe("getUpcomingQuarterlyDueDates", () => {
  it("returns only dates strictly after the given date, in chronological order", () => {
    const from = new Date(2026, 4, 1); // May 1, 2026 — between Apr 15 and Jun 15
    const upcoming = getUpcomingQuarterlyDueDates(from);

    expect(upcoming[0].dueDate).toEqual(new Date(2026, 5, 15)); // next is Jun 15, 2026
    expect(upcoming[1].dueDate).toEqual(new Date(2026, 8, 15)); // then Sep 15, 2026
    expect(upcoming[2].dueDate).toEqual(new Date(2027, 0, 15)); // then Jan 15, 2027

    for (let i = 1; i < upcoming.length; i++) {
      expect(upcoming[i].dueDate.getTime()).toBeGreaterThan(upcoming[i - 1].dueDate.getTime());
    }
    for (const { dueDate } of upcoming) {
      expect(dueDate.getTime()).toBeGreaterThan(from.getTime());
    }
  });

  it("rolls over correctly right after a Jan 15 due date has just passed", () => {
    const from = new Date(2026, 0, 16); // day after Jan 15, 2026 due date
    const upcoming = getUpcomingQuarterlyDueDates(from);

    expect(upcoming[0].dueDate).toEqual(new Date(2026, 3, 15)); // Apr 15, 2026
  });
});

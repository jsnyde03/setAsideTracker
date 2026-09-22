import { describe, expect, it } from "vitest";
import {
  MIN_ENTRIES_PER_WEEKDAY,
  MIN_QUALIFYING_WEEKDAYS,
  summarizeWeekdayEarnings,
} from "../weekdayEarnings";
import type { Entry } from "../types";

const NO_EXPENSES = { parking: 0, tolls: 0, supplies: 0, phone: 0 };

function entry(date: string, grossPay: number, hoursWorked: number, overrides: Partial<Entry> = {}): Entry {
  return {
    id: `e-${date}-${grossPay}`,
    platform: "doordash",
    date,
    grossPay,
    tips: 0,
    mileage: 0,
    expenses: NO_EXPENSES,
    hoursWorked,
    createdAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

// 2026-03-02 is a Monday; 03-07 a Saturday. Verified rather than assumed — an off-by-one weekday
// would be invisible in every assertion below if the fixture and the code made the same mistake.
describe("the fixture's weekdays are what this file claims", () => {
  it("anchors on a known Monday and Saturday", () => {
    expect(summarizeWeekdayEarnings([entry("2026-03-02", 100, 5)], 2026).weekdays[1].entryCount).toBe(1);
    expect(summarizeWeekdayEarnings([entry("2026-03-07", 100, 5)], 2026).weekdays[6].entryCount).toBe(1);
  });
});

describe("summarizeWeekdayEarnings", () => {
  it("returns all seven weekdays, Sunday first, including empty ones", () => {
    const summary = summarizeWeekdayEarnings([entry("2026-03-02", 100, 5)], 2026);

    expect(summary.weekdays).toHaveLength(7);
    expect(summary.weekdays.map((day) => day.label)[0]).toBe("Sunday");
    expect(summary.weekdays[2].entryCount).toBe(0); // Tuesday — nothing logged, still present
  });

  it("files a shift under its LOCAL weekday, not a UTC-shifted one", () => {
    // `new Date("2026-03-02")` is UTC midnight = Sunday evening in every US timezone. If the code
    // used it, this Monday shift would land on Sunday — for every entry in the app.
    const summary = summarizeWeekdayEarnings([entry("2026-03-02", 100, 5)], 2026);

    expect(summary.weekdays[1].entryCount).toBe(1); // Monday
    expect(summary.weekdays[0].entryCount).toBe(0); // Sunday
  });

  it("nets expenses out of each weekday's earnings", () => {
    const summary = summarizeWeekdayEarnings(
      [entry("2026-03-02", 100, 5, { tips: 20, expenses: { ...NO_EXPENSES, tolls: 30 } })],
      2026
    );

    expect(summary.weekdays[1].netEarnings).toBe(90); // 100 + 20 − 30
    expect(summary.weekdays[1].hourlyRate).toBe(18); // 90 / 5
  });

  it("ranks on hourly rate, not on total earned", () => {
    // Monday earns more in total across more shifts; Saturday earns more per hour. The whole point
    // of the feature is the second one — total earnings just rank the days already worked most.
    const entries = [
      entry("2026-03-02", 300, 20),
      entry("2026-03-09", 300, 20),
      entry("2026-03-16", 300, 20), // Mondays: $900 over 60h = $15/hr
      entry("2026-03-07", 200, 5),
      entry("2026-03-14", 200, 5),
      entry("2026-03-21", 200, 5), // Saturdays: $600 over 15h = $40/hr
    ];

    const summary = summarizeWeekdayEarnings(entries, 2026);

    expect(summary.ranked[0].label).toBe("Saturday");
    expect(summary.weekdays[1].netEarnings).toBeGreaterThan(summary.weekdays[6].netEarnings);
  });

  it("withholds a weekday below the per-weekday sample floor", () => {
    const thin = Array.from({ length: MIN_ENTRIES_PER_WEEKDAY - 1 }, (_, i) =>
      entry(`2026-03-${String(2 + i * 7).padStart(2, "0")}`, 100, 5)
    );

    const summary = summarizeWeekdayEarnings(thin, 2026);

    expect(summary.weekdays[1].entryCount).toBe(MIN_ENTRIES_PER_WEEKDAY - 1);
    expect(summary.weekdays[1].hasEnoughData).toBe(false);
    expect(summary.ranked).toHaveLength(0);
  });

  it("needs several qualifying weekdays before the screen has anything to say", () => {
    // One strong weekday is not a pattern — it is the only day the user logged.
    const oneDay = ["2026-03-02", "2026-03-09", "2026-03-16"].map((date) => entry(date, 100, 5));
    expect(summarizeWeekdayEarnings(oneDay, 2026).ranked).toHaveLength(1);
    expect(summarizeWeekdayEarnings(oneDay, 2026).hasEnoughData).toBe(false);

    const twoDays = [...oneDay, ...["2026-03-07", "2026-03-14", "2026-03-21"].map((d) => entry(d, 100, 5))];
    expect(summarizeWeekdayEarnings(twoDays, 2026).ranked).toHaveLength(MIN_QUALIFYING_WEEKDAYS);
    expect(summarizeWeekdayEarnings(twoDays, 2026).hasEnoughData).toBe(true);
  });

  it("reports a weekday with no recorded hours without a rate, and never ranks it", () => {
    // `hoursWorked` is optional on Entry, so this is a real state — a $0/hr day would sort last and
    // read as the worst day to work, which is a different claim from "we don't know".
    const noHours = ["2026-03-02", "2026-03-09", "2026-03-16"].map((date) =>
      entry(date, 100, 0, { hoursWorked: undefined })
    );

    const summary = summarizeWeekdayEarnings(noHours, 2026);

    expect(summary.weekdays[1].entryCount).toBe(3);
    expect(summary.weekdays[1].hasEnoughData).toBe(true);
    expect(summary.weekdays[1].hourlyRate).toBeUndefined();
    expect(summary.ranked).toHaveLength(0);
  });

  it("ignores entries from other years", () => {
    const summary = summarizeWeekdayEarnings(
      [entry("2026-03-02", 100, 5), entry("2025-03-03", 999, 1)],
      2026
    );

    expect(summary.weekdays[1].entryCount).toBe(1);
    expect(summary.weekdays.reduce((sum, day) => sum + day.entryCount, 0)).toBe(1);
  });
});

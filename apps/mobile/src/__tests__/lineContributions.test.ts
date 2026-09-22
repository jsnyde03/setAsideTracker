import { describe, expect, it } from "vitest";
import { buildScheduleCSummary, contributionsForLine } from "../scheduleC";
import type { Entry } from "../types";

const RATE = 0.7;

function entry(id: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id,
    platform: "doordash",
    date: "2026-03-10",
    grossPay: 200,
    tips: 0,
    mileage: 0,
    expenses: { parking: 0, tolls: 0, supplies: 0, phone: 0 },
    createdAt: "2026-03-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("contributionsForLine", () => {
  it("sums to the line it drills into — every line, same entries", () => {
    // ⚠️ THE load-bearing test. A drill-down whose rows don't add up to the figure above them is
    // worse than none, and the two are computed by different functions, so nothing but this
    // assertion keeps them agreeing.
    const entries = [
      entry("a", { mileage: 80, expenses: { parking: 5, tolls: 6, supplies: 8, phone: 3 } }),
      entry("b", { mileage: 120, expenses: { parking: 0, tolls: 4, supplies: 0, phone: 2 } }),
      entry("c", {
        mileage: 40,
        expenses: { parking: 2, tolls: 0, supplies: 11, phone: 0 },
        customExpenses: [{ label: "Hot bags", amount: 17 }, { label: "Car wash", amount: 14 }],
      }),
    ];
    const totalMiles = entries.reduce((sum, e) => sum + e.mileage, 0);
    const summary = buildScheduleCSummary(entries, totalMiles * RATE);

    for (const line of summary.expenseLines) {
      const rows = contributionsForLine(entries, line.line, RATE);
      const rowTotal = rows.reduce((sum, row) => sum + row.amount, 0);
      expect(rowTotal, `line ${line.line} rows must sum to the line`).toBeCloseTo(line.amount, 6);
    }
  });

  it("puts mileage, parking and tolls together on line 9 and names them", () => {
    const rows = contributionsForLine(
      [entry("a", { mileage: 100, expenses: { parking: 5, tolls: 6, supplies: 0, phone: 0 } })],
      "9",
      RATE
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBeCloseTo(100 * RATE + 5 + 6, 6);
    // The amount alone cannot say which of the three it was — the detail is the only place it can.
    expect(rows[0].detail).toContain("100 mi");
    expect(rows[0].detail).toContain("parking");
    expect(rows[0].detail).toContain("tolls");
  });

  it("omits entries that contributed nothing to the line asked about", () => {
    const entries = [
      entry("has-supplies", { expenses: { parking: 0, tolls: 0, supplies: 12, phone: 0 } }),
      entry("has-phone", { expenses: { parking: 0, tolls: 0, supplies: 0, phone: 3 } }),
    ];

    expect(contributionsForLine(entries, "22", RATE).map((r) => r.entryId)).toEqual(["has-supplies"]);
    expect(contributionsForLine(entries, "25", RATE).map((r) => r.entryId)).toEqual(["has-phone"]);
  });

  it("ranks by amount, largest first, with date as the tie-break", () => {
    const rows = contributionsForLine(
      [
        entry("small", { expenses: { parking: 0, tolls: 0, supplies: 5, phone: 0 } }),
        entry("big", { expenses: { parking: 0, tolls: 0, supplies: 50, phone: 0 } }),
        entry("tie-later", { date: "2026-04-01", expenses: { parking: 0, tolls: 0, supplies: 5, phone: 0 } }),
      ],
      "22",
      RATE
    );

    expect(rows.map((r) => r.entryId)).toEqual(["big", "small", "tie-later"]);
  });

  it("counts line 27 exactly as the summary does — blank labels out, negatives clamped", () => {
    // Mirrors `buildScheduleCSummary`'s own filtering. If these two ever disagree the drill-down
    // stops adding up, which is the failure this whole file exists to prevent.
    const entries = [
      entry("a", {
        customExpenses: [
          { label: "Hot bags", amount: 20 },
          { label: "   ", amount: 999 }, // blank label — the summary ignores it
          { label: "Bad", amount: -50 }, // negative — the summary clamps it to 0
        ],
      }),
    ];

    const rows = contributionsForLine(entries, "27", RATE);
    const summary = buildScheduleCSummary(entries, 0);
    const line27 = summary.expenseLines.find((line) => line.line === "27");

    expect(rows[0].amount).toBe(20);
    expect(line27?.amount).toBe(20);
    expect(rows[0].detail).toContain("Hot bags");
    expect(rows[0].detail).not.toContain("999");
  });

  it("uses the rate it was given, not one of its own", () => {
    // The rate can differ across a tax-year boundary. Re-deriving it here is how a drill-down
    // starts disagreeing with the total it was opened from.
    const one = contributionsForLine([entry("a", { mileage: 100 })], "9", 0.7);
    const other = contributionsForLine([entry("a", { mileage: 100 })], "9", 0.655);

    expect(one[0].amount).toBeCloseTo(70, 6);
    expect(other[0].amount).toBeCloseTo(65.5, 6);
  });

  it("returns nothing for a line the app does not map", () => {
    expect(contributionsForLine([entry("a", { mileage: 100 })], "13", RATE)).toEqual([]);
  });
});

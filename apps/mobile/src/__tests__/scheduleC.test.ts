import { describe, expect, it } from "vitest";
import { buildMileageLog, buildScheduleCSummary } from "../scheduleC";
import type { Entry } from "../types";

let idCounter = 0;
function entry(
  over: Omit<Partial<Entry>, "expenses"> & { expenses?: Partial<Entry["expenses"]> } = {}
): Entry {
  const { expenses, ...rest } = over;
  return {
    id: `e${idCounter++}`,
    platform: "doordash",
    date: "2026-03-01",
    grossPay: 0,
    tips: 0,
    mileage: 0,
    expenses: { parking: 0, tolls: 0, supplies: 0, phone: 0, ...expenses },
    createdAt: "2026-03-01T00:00:00.000Z",
    ...rest,
  };
}

describe("buildScheduleCSummary", () => {
  it("maps the four buckets + mileage onto the right Schedule C lines", () => {
    const entries = [
      entry({ grossPay: 100, tips: 10, expenses: { parking: 2, tolls: 3, supplies: 4, phone: 5 } }),
      entry({ grossPay: 200, tips: 0, expenses: { parking: 1, tolls: 1, supplies: 0, phone: 5 } }),
    ];
    const mileageDeduction = 109;

    const summary = buildScheduleCSummary(entries, mileageDeduction);

    expect(summary.grossReceipts).toBe(310); // (100+10) + 200

    const line = (n: string) => summary.expenseLines.find((l) => l.line === n)!;
    expect(line("9").amount).toBe(116); // mileage 109 + parking 3 + tolls 4
    expect(line("22").amount).toBe(4); // supplies
    expect(line("25").amount).toBe(10); // phone

    expect(summary.totalExpenses).toBe(130); // 116 + 4 + 10
    expect(summary.netProfit).toBe(180); // 310 - 130
  });

  it("emits all three expense lines even when amounts are zero", () => {
    const summary = buildScheduleCSummary([], 0);
    expect(summary.grossReceipts).toBe(0);
    expect(summary.expenseLines.map((l) => l.line)).toEqual(["9", "22", "25"]);
    expect(summary.totalExpenses).toBe(0);
    expect(summary.netProfit).toBe(0);
  });

  it("can show a net loss when expenses exceed receipts", () => {
    const entries = [entry({ grossPay: 50, expenses: { supplies: 80 } })];
    const summary = buildScheduleCSummary(entries, 20);
    expect(summary.netProfit).toBe(50 - (20 + 80)); // -50
  });

  it("rolls custom categories into Line 27, aggregating by label and sorting by amount", () => {
    const entries = [
      entry({ grossPay: 100, customExpenses: [{ label: "Car wash", amount: 10 }, { label: "Hot bags", amount: 40 }] }),
      entry({ grossPay: 100, customExpenses: [{ label: "Car wash", amount: 5 }] }),
    ];
    const summary = buildScheduleCSummary(entries, 0);

    // Line 27 appears with the combined total, after the three fixed lines.
    expect(summary.expenseLines.map((l) => l.line)).toEqual(["9", "22", "25", "27"]);
    const line27 = summary.expenseLines.find((l) => l.line === "27")!;
    expect(line27.amount).toBe(55); // 10 + 40 + 5

    // Breakdown is aggregated by label (Car wash 10+5=15) and sorted by amount descending.
    expect(summary.otherExpenses).toEqual([
      { label: "Hot bags", amount: 40 },
      { label: "Car wash", amount: 15 },
    ]);

    expect(summary.totalExpenses).toBe(55);
    expect(summary.netProfit).toBe(200 - 55);
  });

  it("omits Line 27 entirely when there are no custom categories", () => {
    const summary = buildScheduleCSummary([entry({ grossPay: 100 })], 0);
    expect(summary.expenseLines.some((l) => l.line === "27")).toBe(false);
    expect(summary.otherExpenses).toEqual([]);
  });

  it("ignores blank labels and zero/negative amounts in custom categories", () => {
    const entries = [
      entry({
        grossPay: 100,
        customExpenses: [
          { label: "  ", amount: 50 }, // blank label dropped
          { label: "Refund", amount: -20 }, // negative floored to 0 → dropped
          { label: "Supplies extra", amount: 0 }, // zero dropped
          { label: "  Tolls extra  ", amount: 12 }, // trimmed and kept
        ],
      }),
    ];
    const summary = buildScheduleCSummary(entries, 0);
    expect(summary.otherExpenses).toEqual([{ label: "Tolls extra", amount: 12 }]);
    expect(summary.expenseLines.find((l) => l.line === "27")!.amount).toBe(12);
  });
});

describe("buildMileageLog", () => {
  it("builds one row per trip with miles, oldest-first, carrying trimmed log details", () => {
    const rows = buildMileageLog([
      entry({
        date: "2026-05-01",
        platform: "uber",
        mileage: 40,
        mileageLog: { purpose: "  Rides  ", startLocation: " Home ", endLocation: " Airport " },
      }),
      entry({ date: "2026-02-10", platform: "doordash", mileage: 25 }),
    ]);

    expect(rows).toEqual([
      { date: "2026-02-10", platformLabel: "DoorDash", purpose: undefined, startLocation: undefined, endLocation: undefined, miles: 25 },
      { date: "2026-05-01", platformLabel: "Uber", purpose: "Rides", startLocation: "Home", endLocation: "Airport", miles: 40 },
    ]);
  });

  it("excludes entries without business miles so the total reconciles with Line 9", () => {
    const rows = buildMileageLog([
      entry({ mileage: 0, mileageLog: { purpose: "No driving" } }),
      entry({ mileage: 15 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].miles).toBe(15);
  });

  it("treats blank/whitespace-only log fields as absent", () => {
    const rows = buildMileageLog([
      entry({ mileage: 10, mileageLog: { purpose: "   ", startLocation: "", endLocation: "  " } }),
    ]);
    expect(rows[0]).toMatchObject({ purpose: undefined, startLocation: undefined, endLocation: undefined });
  });
});

import { describe, expect, it } from "vitest";
import { buildScheduleCSummary } from "../scheduleC";
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
});

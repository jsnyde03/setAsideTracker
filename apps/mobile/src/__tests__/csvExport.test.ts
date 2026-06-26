import { describe, expect, it } from "vitest";
import { entriesToCsv } from "../csvExport";
import type { Entry } from "../types";

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    platform: "doordash",
    date: "2026-03-10",
    grossPay: 100,
    tips: 10,
    mileage: 20,
    expenses: { parking: 1, tolls: 2, supplies: 3, phone: 4 },
    createdAt: "2026-03-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("entriesToCsv", () => {
  it("includes a header row and one row per entry, sorted oldest-first", () => {
    const csv = entriesToCsv([
      makeEntry({ id: "e2", date: "2026-03-12", platform: "uber" }),
      makeEntry({ id: "e1", date: "2026-03-10", platform: "doordash" }),
    ]);
    const lines = csv.split("\n");

    expect(lines[0]).toBe(
      "Date,Platform,Gross Pay,Tips,Mileage,Hours Worked,Parking,Tolls,Supplies,Phone"
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("2026-03-10");
    expect(lines[1]).toContain("DoorDash");
    expect(lines[2]).toContain("2026-03-12");
    expect(lines[2]).toContain("Uber");
  });

  it("leaves hours worked blank when not set, and includes it when set", () => {
    const csv = entriesToCsv([makeEntry({ hoursWorked: undefined }), makeEntry({ id: "e2", hoursWorked: 5.5 })]);
    const [, row1, row2] = csv.split("\n");

    expect(row1.split(",")[5]).toBe(""); // Hours Worked column, blank
    expect(row2.split(",")[5]).toBe("5.5");
  });

  it("returns just the header row for an empty entry list", () => {
    const csv = entriesToCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});

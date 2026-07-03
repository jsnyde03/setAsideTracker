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
      "Date,Platform,Gross Pay,Tips,Mileage,Hours Worked,Parking,Tolls,Supplies,Phone," +
        "Other Expenses,Trip Purpose,Start Location,End Location"
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

  it("leaves the custom-expense and mileage-log columns blank when none are set", () => {
    const csv = entriesToCsv([makeEntry()]);
    const cols = csv.split("\n")[1].split(",");
    // Other Expenses, then Trip Purpose, Start Location, End Location.
    expect(cols.slice(10)).toEqual(["", "", "", ""]);
  });

  it("serializes custom expense categories into the Other Expenses column", () => {
    const csv = entriesToCsv([
      makeEntry({
        customExpenses: [
          { label: "Car wash", amount: 12 },
          { label: "Hot bags", amount: 40 },
        ],
      }),
    ]);
    const cols = csv.split("\n")[1].split(",");
    // Semicolon-joined "label: amount" pairs; no comma in this value, so it's left unquoted.
    expect(cols[10]).toBe("Car wash: 12.00; Hot bags: 40.00");
  });

  it("CSV-escapes a comma inside a custom category label", () => {
    const csv = entriesToCsv([
      makeEntry({ customExpenses: [{ label: "Insurance, health", amount: 100 }] }),
    ]);
    const row = csv.split("\n")[1];
    expect(row).toContain('"Insurance, health: 100.00"'); // comma forces RFC-4180 quoting
  });

  it("emits the mileage-log fields and CSV-escapes commas in free text", () => {
    const csv = entriesToCsv([
      makeEntry({
        mileageLog: { purpose: "Deliveries, downtown", startLocation: "Home", endLocation: "Mesa" },
      }),
    ]);
    const row = csv.split("\n")[1];
    expect(row).toContain('"Deliveries, downtown"'); // comma forces RFC-4180 quoting
    expect(row).toContain("Home");
    expect(row).toContain("Mesa");
  });

  it("returns just the header row for an empty entry list", () => {
    const csv = entriesToCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});

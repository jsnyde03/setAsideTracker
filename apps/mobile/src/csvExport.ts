import type { Entry } from "./types";

const HEADER = [
  "Date",
  "Platform",
  "Gross Pay",
  "Tips",
  "Mileage",
  "Hours Worked",
  "Parking",
  "Tolls",
  "Supplies",
  "Phone",
  // IRS mileage-log fields (Premium-authored; blank for entries without a log).
  "Trip Purpose",
  "Start Location",
  "End Location",
];

const PLATFORM_LABELS: Record<Entry["platform"], string> = {
  amazonFlex: "Amazon Flex",
  spark: "Spark",
  doordash: "DoorDash",
  uber: "Uber",
  instacart: "Instacart",
  other: "Other",
};

/** Escapes a CSV field per RFC 4180 — wraps in quotes and doubles any embedded quotes whenever
 * the value contains a comma, quote, or newline. Most columns are plain numbers/dates/enum labels,
 * but the IRS mileage-log columns (purpose, start/end location) are free text, so escaping is now
 * load-bearing: a purpose like "Deliveries, downtown" would otherwise split a row. */
function csvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts entries to CSV text, sorted oldest-first (the natural order for a tax-time export, as
 * opposed to the dashboard's newest-first list). Pure and platform-agnostic — the actual
 * save/share/download mechanics differ per platform and live in exportEntriesAsCsv.ts(.web.ts).
 */
export function entriesToCsv(entries: Entry[]): string {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const rows = sorted.map((entry) =>
    [
      entry.date,
      PLATFORM_LABELS[entry.platform],
      entry.grossPay,
      entry.tips,
      entry.mileage,
      entry.hoursWorked ?? "",
      entry.expenses.parking,
      entry.expenses.tolls,
      entry.expenses.supplies,
      entry.expenses.phone,
      entry.mileageLog?.purpose ?? "",
      entry.mileageLog?.startLocation ?? "",
      entry.mileageLog?.endLocation ?? "",
    ]
      .map(csvField)
      .join(",")
  );
  return [HEADER.join(","), ...rows].join("\n");
}

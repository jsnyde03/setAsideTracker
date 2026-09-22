import { totalCustomExpenses } from "./calculations";
import { PLATFORM_LABELS } from "./platforms";
import type { Entry } from "./types";

/** A single IRS Schedule C line the app's tracked data maps onto. */
export interface ScheduleCLine {
  /** IRS Schedule C (Form 1040) line number. */
  line: string;
  /** IRS label for the line. */
  label: string;
  amount: number;
}

/** One named row of the Line 27 "Other expenses" total — a user-defined custom category aggregated
 * across the year's entries. Surfaced as a substantiation breakdown in the PDF/Schedule C export. */
export interface OtherExpenseLine {
  /** The user's category label. */
  label: string;
  /** Total for this category across the year. */
  amount: number;
}

export interface ScheduleCSummary {
  /** Line 1 — gross receipts (gross pay + tips). */
  grossReceipts: number;
  /** Mapped expense lines (9, 22, 25, and 27 when custom categories exist), in line order. The
   * fixed lines (9/22/25) are always present, zero or not, for completeness; Line 27 appears only
   * when there are custom categories. */
  expenseLines: ScheduleCLine[];
  /** Per-category breakdown of the Line 27 "Other expenses" total, aggregated by label and sorted
   * by amount descending. Empty when there are no custom categories. The amounts here sum to the
   * Line 27 entry in {@link expenseLines}. */
  otherExpenses: OtherExpenseLine[];
  /** Line 28 — total expenses (sum of expenseLines). */
  totalExpenses: number;
  /** Line 31 — net profit or (loss): grossReceipts − totalExpenses. */
  netProfit: number;
}

/**
 * Maps a year's tracked entries onto IRS Schedule C lines. The app tracks four expense buckets plus
 * mileage; these map to:
 *  - **Line 9 (Car and truck expenses)**: the standard-mileage deduction PLUS parking and tolls —
 *    parking/tolls are deductible on top of the standard mileage rate, and are reported on Line 9
 *    alongside the mileage amount.
 *  - **Line 22 (Supplies)**: the "supplies" bucket.
 *  - **Line 25 (Utilities)**: the business-use portion of phone costs.
 *  - **Line 27 (Other expenses)**: every user-defined custom category, aggregated by label. Only
 *    emitted when at least one entry has custom categories; the per-label breakdown is returned in
 *    `otherExpenses` for the export's substantiation appendix.
 *
 * Depreciation (Line 13) and insurance (Line 17) have no dedicated tracked field; users record them
 * as custom categories, which roll into Line 27.
 *
 * `mileageDeductionAmount` is the standard-mileage deduction (miles × rate) the tax engine already
 * computed, passed in so this stays a pure function with no engine dependency and Line 9 matches the
 * deduction the estimate actually used. Pass entries already scoped to the target year.
 */
export function buildScheduleCSummary(
  entries: Entry[],
  mileageDeductionAmount: number
): ScheduleCSummary {
  let grossReceipts = 0;
  let parking = 0;
  let tolls = 0;
  let supplies = 0;
  let phone = 0;
  // Aggregate custom categories by trimmed label, preserving first-seen order for ties.
  const customByLabel = new Map<string, number>();

  for (const entry of entries) {
    grossReceipts += entry.grossPay + entry.tips;
    parking += entry.expenses.parking;
    tolls += entry.expenses.tolls;
    supplies += entry.expenses.supplies;
    phone += entry.expenses.phone;
    for (const item of entry.customExpenses ?? []) {
      const label = item.label.trim();
      if (label === "") continue;
      customByLabel.set(label, (customByLabel.get(label) ?? 0) + Math.max(0, item.amount));
    }
  }

  // Drop zero-total labels, then sort by amount descending (alphabetical tie-break) for the appendix.
  const otherExpenses: OtherExpenseLine[] = Array.from(customByLabel, ([label, amount]) => ({
    label,
    amount,
  }))
    .filter((line) => line.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

  const otherExpensesTotal = otherExpenses.reduce((sum, line) => sum + line.amount, 0);

  const expenseLines: ScheduleCLine[] = [
    { line: "9", label: "Car and truck expenses", amount: mileageDeductionAmount + parking + tolls },
    { line: "22", label: "Supplies", amount: supplies },
    { line: "25", label: "Utilities (phone)", amount: phone },
  ];
  if (otherExpenses.length > 0) {
    expenseLines.push({ line: "27", label: "Other expenses", amount: otherExpensesTotal });
  }

  const totalExpenses = expenseLines.reduce((sum, line) => sum + line.amount, 0);

  return {
    grossReceipts,
    expenseLines,
    otherExpenses,
    totalExpenses,
    netProfit: grossReceipts - totalExpenses,
  };
}

/** One entry's contribution to a single Schedule C line — a row of the line's drill-down. */
export interface LineContribution {
  entryId: string;
  /** ISO date of the entry, for matching against the user's own records. */
  date: string;
  /** Display label for the entry's platform (e.g. "DoorDash"). */
  platformLabel: string;
  /** What this entry put on the line. */
  amount: number;
  /** How that amount was arrived at, when it is not simply the amount — e.g. Line 9's miles. */
  detail?: string;
}

/**
 * Which entries make up one Schedule C line, and by how much.
 *
 * ⚠️ **The rows sum to the line, exactly**, and that is a property worth keeping rather than a happy
 * accident. `deductionAmount` is `miles × rate` **unrounded**, and the miles it uses are the sum of
 * the same per-entry mileage figures read here — so `Σ(mᵢ × r) = (Σmᵢ) × r` up to float error. A
 * drill-down whose rows visibly fail to add up to the total they were opened from is worse than no
 * drill-down at all, which is why 1.2.4 had to add an explicit adjustment row; **this line does not
 * need one, and a test asserts that rather than assuming it.**
 *
 * ⚠️ **`ratePerMile` must be the rate the ESTIMATE used**, passed in from
 * `mileageDeduction.ratePerMile` — never a constant re-read from config here. The two can differ
 * across a tax-year boundary, and re-deriving it is how a drill-down starts disagreeing with the
 * figure above it.
 *
 * Sorted by amount descending: the question a drill-down answers is "what is driving this number",
 * and every row carries its own date for the times the question is "when was that".
 */
export function contributionsForLine(
  entries: Entry[],
  line: string,
  ratePerMile: number
): LineContribution[] {
  const rows: LineContribution[] = [];

  for (const entry of entries) {
    const platformLabel = PLATFORM_LABELS[entry.platform];
    let amount = 0;
    let detail: string | undefined;

    if (line === "9") {
      // Line 9 is three things at once — the standard-mileage deduction plus parking plus tolls —
      // so the detail string is the only place a row can say which of them it was.
      const mileageAmount = entry.mileage * ratePerMile;
      const { parking, tolls } = entry.expenses;
      amount = mileageAmount + parking + tolls;
      const parts: string[] = [];
      if (entry.mileage > 0) parts.push(`${entry.mileage.toLocaleString("en-US")} mi`);
      if (parking > 0) parts.push(`parking $${parking.toLocaleString("en-US")}`);
      if (tolls > 0) parts.push(`tolls $${tolls.toLocaleString("en-US")}`);
      detail = parts.length > 0 ? parts.join(" · ") : undefined;
    } else if (line === "22") {
      amount = entry.expenses.supplies;
    } else if (line === "25") {
      amount = entry.expenses.phone;
    } else if (line === "27") {
      // Mirrors `buildScheduleCSummary`'s aggregation exactly, blank labels and the negative clamp
      // included — a drill-down that counted a row the total ignored would not add up.
      const items = (entry.customExpenses ?? []).filter((item) => item.label.trim() !== "");
      amount = items.reduce((sum, item) => sum + Math.max(0, item.amount), 0);
      detail = items.length > 0 ? items.map((item) => item.label.trim()).join(" · ") : undefined;
    }

    if (amount > 0) rows.push({ entryId: entry.id, date: entry.date, platformLabel, amount, detail });
  }

  return rows.sort((a, b) => b.amount - a.amount || a.date.localeCompare(b.date));
}

/**
 * One trip in the mileage-log substantiation appendix backing Schedule C Line 9. The IRS requires a
 * contemporaneous record of the date, business purpose, and route for each trip claimed under the
 * standard mileage rate; this row is what the PDF renders. The free-text fields are optional (see
 * {@link import("./types").MileageLog}) — when the user hasn't recorded a purpose the platform label
 * stands in for context, and an unrecorded route renders as a placeholder.
 */
export interface MileageLogRow {
  /** ISO date of the trip (the entry's date). */
  date: string;
  /** Display label for the entry's platform (e.g. "DoorDash") — trip context when purpose is blank. */
  platformLabel: string;
  /** Business purpose of the trip, if the user recorded one (trimmed; undefined when blank). */
  purpose?: string;
  /** Where the trip started, if recorded (trimmed; undefined when blank). */
  startLocation?: string;
  /** Where the trip ended, if recorded (trimmed; undefined when blank). */
  endLocation?: string;
  /** Business miles claimed for this trip. Always > 0 (zero-mile entries are excluded). */
  miles: number;
}

/**
 * Builds the Schedule C Line 9 mileage-log appendix from a year's entries: one row per trip that
 * claims business miles, sorted oldest-first (the natural order for a log). Entries with no mileage
 * are excluded so the row total reconciles with the Line 9 standard-mileage figure. Pass entries
 * already scoped to the target year. Pure — the PDF render lives in taxSummaryHtml.ts.
 */
export function buildMileageLog(entries: Entry[]): MileageLogRow[] {
  return entries
    .filter((entry) => entry.mileage > 0)
    .map((entry) => {
      const purpose = entry.mileageLog?.purpose?.trim();
      const startLocation = entry.mileageLog?.startLocation?.trim();
      const endLocation = entry.mileageLog?.endLocation?.trim();
      return {
        date: entry.date,
        platformLabel: PLATFORM_LABELS[entry.platform],
        purpose: purpose || undefined,
        startLocation: startLocation || undefined,
        endLocation: endLocation || undefined,
        miles: entry.mileage,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

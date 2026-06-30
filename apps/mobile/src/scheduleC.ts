import { totalCustomExpenses } from "./calculations";
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

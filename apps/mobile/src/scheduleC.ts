import type { Entry } from "./types";

/** A single IRS Schedule C line the app's tracked data maps onto. */
export interface ScheduleCLine {
  /** IRS Schedule C (Form 1040) line number. */
  line: string;
  /** IRS label for the line. */
  label: string;
  amount: number;
}

export interface ScheduleCSummary {
  /** Line 1 — gross receipts (gross pay + tips). */
  grossReceipts: number;
  /** Mapped expense lines (9, 22, 25), in line order; zero-amount lines are kept for completeness. */
  expenseLines: ScheduleCLine[];
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
 * Depreciation (Line 13) and insurance (Line 17) have no tracked data yet (they arrive with custom
 * categories), so they aren't emitted here.
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

  for (const entry of entries) {
    grossReceipts += entry.grossPay + entry.tips;
    parking += entry.expenses.parking;
    tolls += entry.expenses.tolls;
    supplies += entry.expenses.supplies;
    phone += entry.expenses.phone;
  }

  const expenseLines: ScheduleCLine[] = [
    { line: "9", label: "Car and truck expenses", amount: mileageDeductionAmount + parking + tolls },
    { line: "22", label: "Supplies", amount: supplies },
    { line: "25", label: "Utilities (phone)", amount: phone },
  ];

  const totalExpenses = expenseLines.reduce((sum, line) => sum + line.amount, 0);

  return {
    grossReceipts,
    expenseLines,
    totalExpenses,
    netProfit: grossReceipts - totalExpenses,
  };
}

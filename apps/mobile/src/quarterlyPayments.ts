import { getQuarterlyDueDatesForTaxYear } from "./notifications/quarterlyDueDates";
import type { QuarterlyPayments } from "./types";

export type QuarterNumber = 1 | 2 | 3 | 4;

/** The four keys of {@link QuarterlyPayments}, in order, so callers never index it with a string. */
export const QUARTER_KEYS = ["q1", "q2", "q3", "q4"] as const;
export type QuarterKey = (typeof QUARTER_KEYS)[number];

export interface QuarterStatus {
  quarter: QuarterNumber;
  key: QuarterKey;
  label: string;
  dueDate: Date;
  /** This quarter's share of the safe-harbor target. */
  required: number;
  /** What the user has recorded paying. `undefined` means nothing recorded — not "paid zero". */
  paid: number | undefined;
  /** Required minus paid, floored at 0. Treats "nothing recorded" as nothing paid. */
  shortfall: number;
  /** The deadline has passed, so a shortfall here is already late rather than still payable. */
  isPast: boolean;
}

export interface PaymentsSummary {
  quarters: QuarterStatus[];
  totalRequired: number;
  totalPaid: number;
  /** Shortfall across quarters whose deadline has already passed — the figure that matters. */
  overdue: number;
  /** True once every past quarter is covered. Vacuously true before the first deadline. */
  onTrack: boolean;
}

/**
 * Pairs the safe-harbor target against what the user says they have paid, quarter by quarter.
 *
 * ⚠️ **`perQuarter` is the target divided by four, and this deliberately does not try to be
 * cleverer than that.** The IRS's annualised-income method lets uneven earners weight their
 * quarters, and implementing it needs per-period income the app would have to be sure it had.
 * Four equal shares is the safe-harbor default and what {@link computeSafeHarbor} already reports.
 *
 * ⛔ **`overdue` counts only quarters whose deadline has PASSED.** Summing every shortfall would
 * tell a user in May that they are $3,600 behind on payments that are not due until September and
 * January — a number that is both wrong and alarming. The due dates come from
 * `getQuarterlyDueDatesForTaxYear`, so they are the business-day-shifted real deadlines.
 */
export function summarizeQuarterlyPayments(
  perQuarter: number,
  payments: QuarterlyPayments | undefined,
  taxYear: number,
  now: Date = new Date()
): PaymentsSummary {
  const dueDates = getQuarterlyDueDatesForTaxYear(taxYear);

  const quarters: QuarterStatus[] = QUARTER_KEYS.map((key, index) => {
    const paid = payments?.[key];
    const { label, dueDate } = dueDates[index];

    return {
      quarter: (index + 1) as QuarterNumber,
      key,
      label,
      dueDate,
      required: perQuarter,
      paid,
      shortfall: Math.max(0, perQuarter - (paid ?? 0)),
      isPast: dueDate.getTime() < now.getTime(),
    };
  });

  const totalPaid = quarters.reduce((sum, quarter) => sum + (quarter.paid ?? 0), 0);
  const overdue = quarters
    .filter((quarter) => quarter.isPast)
    .reduce((sum, quarter) => sum + quarter.shortfall, 0);

  return {
    quarters,
    totalRequired: perQuarter * 4,
    totalPaid,
    overdue,
    onTrack: overdue === 0,
  };
}

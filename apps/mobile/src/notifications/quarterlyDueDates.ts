import { nextBusinessDay } from "./businessDays";

export interface QuarterlyDueDate {
  label: string;
  dueDate: Date;
}

/**
 * IRS estimated-tax due dates for income earned in `taxYear`, **shifted to the next business day**
 * when the nominal 15th falls on a weekend or legal holiday — which is the actual deadline, not an
 * approximation of it.
 *
 * ⚠️ **These dates carry a payment instruction**, so being a few days early is not harmless the way
 * it is for a generic nudge: the dashboard puts a dollar figure beside the next one. That is why the
 * shift was pulled forward ahead of the per-quarter amount rather than left in the backlog.
 *
 * The shift is not a weekend rule. Two holidays land on these dates in ordinary years — MLK Day
 * catches **every** January 15 that falls on a Saturday, Sunday or Monday, and Emancipation Day
 * moves April even when the 15th is a plain weekday, as it did in 2022 and 2023. `businessDays.ts`
 * has the detail.
 */
export function getQuarterlyDueDatesForTaxYear(taxYear: number): QuarterlyDueDate[] {
  return [
    { label: `Q1 ${taxYear} estimated tax`, dueDate: nextBusinessDay(new Date(taxYear, 3, 15)) },
    { label: `Q2 ${taxYear} estimated tax`, dueDate: nextBusinessDay(new Date(taxYear, 5, 15)) },
    { label: `Q3 ${taxYear} estimated tax`, dueDate: nextBusinessDay(new Date(taxYear, 8, 15)) },
    { label: `Q4 ${taxYear} estimated tax`, dueDate: nextBusinessDay(new Date(taxYear + 1, 0, 15)) },
  ];
}

/**
 * Returns upcoming due dates strictly after `fromDate`, looking across enough tax years that
 * there's always at least one date in the future regardless of when this is called.
 */
export function getUpcomingQuarterlyDueDates(fromDate: Date = new Date()): QuarterlyDueDate[] {
  const currentYear = fromDate.getFullYear();
  const candidates = [
    ...getQuarterlyDueDatesForTaxYear(currentYear - 1),
    ...getQuarterlyDueDatesForTaxYear(currentYear),
    ...getQuarterlyDueDatesForTaxYear(currentYear + 1),
  ];

  return candidates
    .filter((candidate) => candidate.dueDate.getTime() > fromDate.getTime())
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

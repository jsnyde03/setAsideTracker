export interface QuarterlyDueDate {
  label: string;
  dueDate: Date;
}

/**
 * Standard IRS estimated-tax due dates for income earned in `taxYear`. This is a simplification:
 * the IRS shifts a due date to the next business day when it falls on a weekend/federal holiday,
 * which this does not account for. Good enough for a reminder nudge a few days early; don't treat
 * the exact date as authoritative for an actual payment deadline — see ROADMAP §6.
 */
export function getQuarterlyDueDatesForTaxYear(taxYear: number): QuarterlyDueDate[] {
  return [
    { label: `Q1 ${taxYear} estimated tax`, dueDate: new Date(taxYear, 3, 15) }, // Apr 15
    { label: `Q2 ${taxYear} estimated tax`, dueDate: new Date(taxYear, 5, 15) }, // Jun 15
    { label: `Q3 ${taxYear} estimated tax`, dueDate: new Date(taxYear, 8, 15) }, // Sep 15
    { label: `Q4 ${taxYear} estimated tax`, dueDate: new Date(taxYear + 1, 0, 15) }, // Jan 15 next year
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

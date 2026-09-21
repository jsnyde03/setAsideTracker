import { toIsoDateLocal } from "../dateUtils";

/**
 * Federal-holiday and business-day arithmetic, for IRS deadline shifting.
 *
 * ## Why this is a general table rather than "the two holidays that matter"
 *
 * Only two holidays can actually collide with the four 1040-ES dates: MLK Day in January and
 * Emancipation Day in April. Encoding just those would work *today*, and it would rest on an
 * argument — "no other federal holiday falls within three days of the 15th" — that is true, is
 * nowhere checkable, and would be silently falsified the day this helper is reused for a date that
 * isn't the 15th. The full table is about thirty lines and needs no argument at all.
 *
 * Everything here works in **local** calendar terms, for the reason `dateUtils` explains: every US
 * timezone is behind UTC, so a UTC conversion can roll a date to the next day.
 */

/** The `n`th `weekday` of a month (n is 1-based). `weekday` is 0=Sunday … 6=Saturday. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

/** The last `weekday` of a month — Memorial Day's rule. */
function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0);
  return new Date(year, month, last.getDate() - ((last.getDay() - weekday + 7) % 7));
}

/**
 * A fixed-date holiday as actually observed: a Saturday holiday is observed the Friday before, a
 * Sunday holiday the Monday after. That observed day is the legal holiday, so it is the one that
 * shifts a deadline.
 */
function observed(date: Date): Date {
  const day = date.getDay();
  if (day === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  if (day === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return date;
}

/**
 * Every federal holiday observed in `year`, as local YYYY-MM-DD strings.
 *
 * ⚠️ **Emancipation Day is in here and is not a federal holiday.** It is a *District of Columbia*
 * holiday on April 16, and the IRS applies DC holidays to federal filing and payment deadlines
 * nationwide — which is why the April deadline was the 18th in both 2022 and 2023. Leaving it out
 * is the single most likely way to get this wrong, because it moves the deadline in years where
 * April 15 is an ordinary weekday.
 */
export function federalHolidaysObserved(year: number): Set<string> {
  const dates = [
    observed(new Date(year, 0, 1)), // New Year's Day
    nthWeekdayOfMonth(year, 0, 1, 3), // MLK Day — 3rd Monday in January
    nthWeekdayOfMonth(year, 1, 1, 3), // Presidents' Day — 3rd Monday in February
    lastWeekdayOfMonth(year, 4, 1), // Memorial Day — last Monday in May
    observed(new Date(year, 3, 16)), // Emancipation Day (DC) — see the note above
    observed(new Date(year, 5, 19)), // Juneteenth
    observed(new Date(year, 6, 4)), // Independence Day
    nthWeekdayOfMonth(year, 8, 1, 1), // Labor Day — 1st Monday in September
    nthWeekdayOfMonth(year, 9, 1, 2), // Columbus Day — 2nd Monday in October
    observed(new Date(year, 10, 11)), // Veterans Day
    nthWeekdayOfMonth(year, 10, 4, 4), // Thanksgiving — 4th Thursday in November
    observed(new Date(year, 11, 25)), // Christmas Day
  ];

  return new Set(dates.map(toIsoDateLocal));
}

/** A weekday that is not an observed federal (or DC, per the note above) holiday. */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !federalHolidaysObserved(date.getFullYear()).has(toIsoDateLocal(date));
}

/**
 * The first business day on or after `date`. This is the IRS rule for a deadline: when it falls on
 * a Saturday, Sunday or legal holiday, the deadline moves to the next business day.
 *
 * ⚠️ It has to loop rather than shift once. January 15 landing on a Saturday, Sunday **or** Monday
 * all move onto MLK Day and need a second hop — Jan 15 being a Monday *is* Jan 15 being the third
 * Monday, since the 1st is a Monday too. A one-step shift gets the January deadline wrong in three
 * years out of seven.
 */
export function nextBusinessDay(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/**
 * Local-date helpers. Deliberately avoid `Date#toISOString()` for conversions — that's always
 * UTC, and every U.S. timezone is behind UTC, so it silently rolls a late-evening local date over
 * to tomorrow's UTC date (exactly when a lot of gig shifts happen). Everything here works in
 * local calendar terms instead.
 */

/** Today's date as a local YYYY-MM-DD string. */
export function todayIsoDate(): string {
  return toIsoDateLocal(new Date());
}

/** Converts a Date to a local YYYY-MM-DD string (not UTC). */
export function toIsoDateLocal(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date at midnight (not UTC midnight, which `new
 * Date("YYYY-MM-DD")` would give you and which can display as the previous day in US timezones).
 * Falls back to today if the string doesn't parse as a valid calendar date.
 */
export function parseIsoDateLocal(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return new Date();
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

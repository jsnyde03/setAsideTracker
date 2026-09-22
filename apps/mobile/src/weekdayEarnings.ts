import { entriesForYear, totalEntryExpenses } from "./calculations";
import { parseIsoDateLocal } from "./dateUtils";
import type { Entry } from "./types";

/**
 * Which days of the week earn best, from the user's own logged shifts ([D20]).
 *
 * ## What this deliberately is not
 *
 * ⛔ **Not time-of-day.** `Entry` records a date and no time, and never has — so "best mornings"
 * has nothing behind it. It was in the spec for this feature and could not be built.
 *
 * ⛔ **Not a platform comparison.** `comparePlatforms` + `PlatformComparisonScreen` already show
 * per-platform earnings and effective hourly rate, **for free**. Re-showing that behind the paywall
 * would remove something free, which is the one thing the premium slice's gating rule forbids.
 *
 * ## Why the gate counts entries PER WEEKDAY rather than in total
 *
 * The plan asked for a soft gate "below ~30 entries". Nothing derived the 30, and what it was
 * proxying is per-cell sample size: thirty shifts all logged on Saturdays say nothing about
 * Tuesdays, and six shifts spread evenly say something about each. Gating per weekday states the
 * mechanism directly — and it lets an honest screen show its strong days while naming the thin ones
 * as thin, instead of hiding everything behind one number.
 */

/** A weekday needs this many logged shifts before its rate is reported as a finding. */
export const MIN_ENTRIES_PER_WEEKDAY = 3;

/** And this many weekdays must clear that bar before the screen has anything to say. */
export const MIN_QUALIFYING_WEEKDAYS = 2;

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface WeekdayStat {
  /** 0 = Sunday … 6 = Saturday, matching `Date#getDay`. */
  weekday: number;
  label: string;
  entryCount: number;
  netEarnings: number;
  totalHours: number;
  /** Net earnings per hour, or `undefined` when no hours were logged for this weekday. */
  hourlyRate: number | undefined;
  /** Has enough logged shifts to be reported rather than flagged as thin. */
  hasEnoughData: boolean;
}

export interface WeekdaySummary {
  /** All seven weekdays, Sunday first — including the ones with nothing logged. */
  weekdays: WeekdayStat[];
  /** Weekdays clearing {@link MIN_ENTRIES_PER_WEEKDAY}, best hourly rate first. */
  ranked: WeekdayStat[];
  /** Enough spread to say anything at all. The screen's soft gate. */
  hasEnoughData: boolean;
}

/**
 * Buckets a year's entries by day of the week.
 *
 * ⚠️ **Ranks on hourly RATE, not on total earned.** Total earnings rank the days the user happened
 * to work most, which they already know and cannot act on; the rate answers "which day is worth
 * getting up for". A weekday with no `hoursWorked` recorded therefore cannot be ranked at all —
 * `hoursWorked` is optional on `Entry` — and is reported without a rate rather than with a zero.
 */
export function summarizeWeekdayEarnings(
  entries: Entry[],
  year: number = new Date().getFullYear()
): WeekdaySummary {
  const weekdays: WeekdayStat[] = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    entryCount: 0,
    netEarnings: 0,
    totalHours: 0,
    hourlyRate: undefined,
    hasEnoughData: false,
  }));

  for (const entry of entriesForYear(entries, year)) {
    // `parseIsoDateLocal`, never `new Date(entry.date)` — the latter parses YYYY-MM-DD as UTC
    // midnight, which in every US timezone is the *previous* day locally. That would file a
    // Monday shift under Sunday for every entry in the app.
    const stat = weekdays[parseIsoDateLocal(entry.date).getDay()];
    stat.entryCount += 1;
    stat.netEarnings += entry.grossPay + entry.tips - totalEntryExpenses(entry);
    stat.totalHours += entry.hoursWorked ?? 0;
  }

  for (const stat of weekdays) {
    stat.hasEnoughData = stat.entryCount >= MIN_ENTRIES_PER_WEEKDAY;
    stat.hourlyRate = stat.totalHours > 0 ? stat.netEarnings / stat.totalHours : undefined;
  }

  const ranked = weekdays
    .filter((stat) => stat.hasEnoughData && stat.hourlyRate !== undefined)
    .sort((a, b) => (b.hourlyRate ?? 0) - (a.hourlyRate ?? 0));

  return { weekdays, ranked, hasEnoughData: ranked.length >= MIN_QUALIFYING_WEEKDAYS };
}

import { describe, expect, it } from "vitest";
import {
  computeSetAsideRate,
  computeTaxEstimate,
  entrySetAside,
  entrySetAsideDisplay,
  fallbackSetAsideRate,
  summarizeWeeklySetAsides,
  weekStartOf,
  weeklySetAsides,
} from "../calculations";
import type { Entry, TaxProfile } from "../types";

const YEAR = 2026;

const PROFILE: TaxProfile = {
  filingStatus: "single",
  state: "TX",
  dependents: 0,
  hasW2Job: false,
};

function entry(id: string, date: string, grossPay: number, over: Partial<Entry> = {}): Entry {
  return {
    id,
    platform: "doordash",
    date,
    grossPay,
    tips: 0,
    mileage: 0,
    expenses: { parking: 0, tolls: 0, supplies: 0, phone: 0 },
    createdAt: `${date}T00:00:00.000Z`,
    ...over,
  };
}

/** Log entries one at a time the way the app does, freezing each rate against what came before. */
function logAll(raw: Entry[]): Entry[] {
  const saved: Entry[] = [];
  for (const next of raw) {
    saved.push({ ...next, setAsideRate: computeSetAsideRate(saved, next, PROFILE, YEAR) });
  }
  return saved;
}

describe("weekStartOf", () => {
  it("returns the Monday of the week, and treats Sunday as the END of one ([D13])", () => {
    // 2026-06-15 is a Monday; 2026-06-21 the Sunday that closes the same week.
    expect(weekStartOf("2026-06-15")).toBe("2026-06-15");
    expect(weekStartOf("2026-06-17")).toBe("2026-06-15");
    expect(weekStartOf("2026-06-21")).toBe("2026-06-15");
    // The next day opens a new week.
    expect(weekStartOf("2026-06-22")).toBe("2026-06-22");
  });

  /**
   * ⚠️ The bug this function is shaped to avoid. `new Date("2026-06-21")` is midnight UTC, which in
   * any timezone behind Greenwich is the 20th locally — so a Sunday entry would be filed into the
   * previous week for every user in the Americas, which is most of this app's users.
   */
  it("does not shift a date across a day boundary", () => {
    // ⚠️ These dates are the ones a local-time implementation gets wrong, and that was CONFIRMED BY
    // PLANTING one rather than assumed: `new Date("2026-06-22")` is midnight UTC, which is Sunday
    // evening anywhere in the Americas, so the Monday that opens the week comes out a week early.
    // The plant reds this test in the machine's own timezone, which is why no timezone is forced
    // here -- setting `process.env.TZ` mid-process is not reliably picked up by V8, so a test that
    // leaned on it would be claiming a coverage it does not have.
    expect(weekStartOf("2026-06-21")).toBe("2026-06-15");
    expect(weekStartOf("2026-06-22")).toBe("2026-06-22");
    expect(weekStartOf("2026-01-01")).toBe("2025-12-29");
  });

  it("crosses a year boundary into the week's real Monday", () => {
    // 2026-01-01 is a Thursday, so its week opens on Monday 2025-12-29.
    expect(weekStartOf("2026-01-01")).toBe("2025-12-29");
  });
});

describe("weeklySetAsides", () => {
  it("groups Monday–Sunday and puts the most recent week first", () => {
    const saved = logAll([
      entry("a", "2026-06-15", 200), // Mon, week of the 15th
      entry("b", "2026-06-21", 300), // Sun, SAME week
      entry("c", "2026-06-22", 400), // Mon, next week
    ]);

    const weeks = weeklySetAsides(saved, PROFILE, YEAR);

    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-06-22", "2026-06-15"]);
    expect(weeks[1].entryCount).toBe(2);
    expect(weeks[1].weekEnd).toBe("2026-06-21");
    expect(weeks[0].entryCount).toBe(1);
  });

  it("emits no row for a week with no work", () => {
    const saved = logAll([entry("a", "2026-06-15", 200), entry("b", "2026-07-06", 200)]);

    const weeks = weeklySetAsides(saved, PROFILE, YEAR);

    // Three calendar weeks separate them; an empty row is not information.
    expect(weeks).toHaveLength(2);
  });

  it("weekly totals sum to the year's real figure", () => {
    const saved = logAll([
      entry("a", "2026-03-02", 4000),
      entry("b", "2026-03-05", 6000),
      entry("c", "2026-08-10", 9000),
    ]);

    const summed = weeklySetAsides(saved, PROFILE, YEAR).reduce((total, w) => total + w.setAside, 0);

    expect(summed).toBeCloseTo(computeTaxEstimate(saved, PROFILE, YEAR).netAmountToSetAside, 6);
    expect(weeklySetAsides(saved, PROFILE, YEAR).every((w) => !w.estimated)).toBe(true);
  });

  it("ignores entries from other years", () => {
    const saved = logAll([entry("a", "2026-06-15", 500)]);
    const lastYear = entry("old", "2025-06-16", 5000, { setAsideRate: 0.3 });

    const weeks = weeklySetAsides([...saved, lastYear], PROFILE, YEAR);

    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekStart).toBe("2026-06-15");
  });

  describe("[D14] entries logged before the frozen rate existed", () => {
    it("still gets a figure, and its week says the figure is estimated", () => {
      const legacy = entry("old", "2026-06-15", 1000); // no setAsideRate, as every pre-v1.2 entry
      const frozen = logAll([entry("new", "2026-06-22", 1000)]);

      const weeks = weeklySetAsides([legacy, ...frozen], PROFILE, YEAR);
      const legacyWeek = weeks.find((w) => w.weekStart === "2026-06-15");
      const frozenWeek = weeks.find((w) => w.weekStart === "2026-06-22");

      expect(legacyWeek?.setAside).toBeGreaterThan(0);
      expect(legacyWeek?.estimated, "a derived figure must not be presented as frozen").toBe(true);
      // ⭐ The control: a week whose entries all carry their own rate is NOT marked estimated.
      // Without this, marking every week would pass the assertion above and mean nothing.
      expect(frozenWeek?.estimated).toBe(false);
    });

    it("uses the year's own effective rate for them", () => {
      const legacy = entry("old", "2026-06-15", 1000);

      const weeks = weeklySetAsides([legacy], PROFILE, YEAR);
      const rate = fallbackSetAsideRate([legacy], PROFILE, YEAR);

      expect(rate).toBeDefined();
      expect(weeks[0].setAside).toBeCloseTo(1000 * (rate as number), 6);
    });

    it("leaves an unratable entry out of the total rather than inventing a zero", () => {
      // No positive profit anywhere in the year, so there is no rate to fall back to.
      const costly = entry("x", "2026-06-15", 0, {
        expenses: { parking: 50, tolls: 0, supplies: 0, phone: 0 },
      });

      const weeks = weeklySetAsides([costly], PROFILE, YEAR);

      expect(fallbackSetAsideRate([costly], PROFILE, YEAR)).toBeUndefined();
      expect(weeks[0].setAside).toBe(0);
      expect(weeks[0].estimated, "an entry with nothing to rate is not an estimate").toBe(false);
    });
  });
});

describe("summarizeWeeklySetAsides — the drift, and saying so (1.2.4.5)", () => {
  it("reports no adjustment when nothing has invalidated a freeze", () => {
    const saved = logAll([entry("a", "2026-03-02", 4000), entry("b", "2026-08-10", 9000)]);

    const summary = summarizeWeeklySetAsides(saved, PROFILE, YEAR);

    // The increments telescope, so the weeks ARE the year total and there is nothing to explain.
    expect(summary.adjustment).toBeCloseTo(0, 6);
    expect(summary.weeksTotal).toBeCloseTo(summary.yearTotal, 6);
  });

  /**
   * ⭐ The case the adjustment exists for. The rate is frozen at log time, so changing the tax
   * profile afterwards moves what is owed while every past week stays where it was — correctly, per
   * [D7]. The difference has to be visible, or the weeks silently stop adding up to the headline.
   */
  it("reports the difference when the tax profile changes after the fact", () => {
    const saved = logAll([entry("a", "2026-03-02", 20000), entry("b", "2026-08-10", 15000)]);

    const movedToCalifornia: TaxProfile = { ...PROFILE, state: "CA" };
    const summary = summarizeWeeklySetAsides(saved, movedToCalifornia, YEAR);

    expect(summary.yearTotal).toBeGreaterThan(summary.weeksTotal); // CA has an income tax; TX does not
    expect(summary.adjustment).toBeCloseTo(summary.yearTotal - summary.weeksTotal, 6);
    expect(summary.adjustment).toBeGreaterThan(0);
    // And the weekly rows themselves have NOT moved — that is the property being preserved.
    expect(summary.weeks.reduce((t, w) => t + w.setAside, 0)).toBeCloseTo(summary.weeksTotal, 6);
  });

  it("reports the difference when an entry is deleted after its neighbours were rated", () => {
    const saved = logAll([
      entry("a", "2026-03-02", 20000),
      entry("b", "2026-05-04", 15000),
      entry("c", "2026-08-10", 10000),
    ]);

    // Remove the middle one. The later entries keep rates frozen against income no longer there.
    const afterDelete = saved.filter((e) => e.id !== "b");
    const summary = summarizeWeeklySetAsides(afterDelete, PROFILE, YEAR);

    expect(Math.abs(summary.adjustment)).toBeGreaterThan(0.01);
    expect(summary.weeksTotal + summary.adjustment).toBeCloseTo(summary.yearTotal, 6);
  });

  it("always reconciles: weeks + adjustment is the year total, whatever happened", () => {
    const legacy = entry("old", "2026-02-02", 5000); // no frozen rate at all
    const saved = logAll([entry("a", "2026-03-02", 8000)]);
    const heavyMileage = entry("m", "2026-04-06", 50, { mileage: 400, setAsideRate: 0 });

    const all = [legacy, ...saved, heavyMileage];
    const summary = summarizeWeeklySetAsides(all, PROFILE, YEAR);

    // ⚠️ `yearTotal` is compared against an INDEPENDENTLY computed figure, not against itself.
    // Asserting only `weeksTotal + adjustment === yearTotal` is satisfied by an implementation that
    // derives all three from one source -- measured: a plant returning `yearTotal: weeksTotal,
    // adjustment: 0` passed that assertion while breaking two other tests.
    expect(summary.yearTotal).toBeCloseTo(computeTaxEstimate(all, PROFILE, YEAR).netAmountToSetAside, 6);
    expect(summary.weeksTotal + summary.adjustment).toBeCloseTo(summary.yearTotal, 6);
  });
});

/**
 * What a recent-entry row shows (1.2.20).
 *
 * ⛔ **The load-bearing claim is AGREEMENT, not presence.** The rows and the weekly sheet describe
 * the same money, and a test that only asserts "a number came back" passes over a number that is
 * wrong — which is the failure that would actually cost trust, because a user who adds the rows up
 * and compares them to the week is doing the obvious thing.
 */
describe("entrySetAsideDisplay", () => {
  it("reports the frozen figure, and does not call it an estimate", () => {
    const [saved] = logAll([entry("a", "2026-03-02", 8000)]);
    const shown = entrySetAsideDisplay(saved);
    expect(shown).toBeDefined();
    expect(shown!.estimated).toBe(false);
    expect(shown!.amount).toBeCloseTo(entrySetAside(saved)!, 6);
  });

  it("marks an entry that predates the frozen field as an estimate ([D14])", () => {
    const legacy = entry("old", "2026-02-02", 5000); // never had a rate frozen
    const rate = fallbackSetAsideRate([legacy], PROFILE, YEAR)!;
    const shown = entrySetAsideDisplay(legacy, rate);
    expect(shown).toBeDefined();
    // ⚠️ The flag is the whole point: the same condition weeklySetAsides uses to mark a week
    // estimated, so a row and the week containing it can never disagree about exactness.
    expect(shown!.estimated).toBe(true);
  });

  it("shows nothing when the figure is unavailable, rather than zero", () => {
    const legacy = entry("old", "2026-02-02", 5000);
    expect(entrySetAsideDisplay(legacy)).toBeUndefined();
  });

  it("shows nothing for an entry that adds no tax", () => {
    // A shift whose mileage deduction exceeds its pay: computeSetAsideRate clamps this to 0 on
    // purpose, and "$0.00 aside" is a line that says nothing.
    const lossMaking = entry("m", "2026-04-06", 50, { mileage: 400, setAsideRate: 0 });
    expect(entrySetAsideDisplay(lossMaking)).toBeUndefined();
  });

  /**
   * ⛔ The one that protects the user's arithmetic. Every row in a week must add up to the figure
   * that week's sheet shows — including the entries the rows deliberately omit, since omitting a
   * zero cannot change a sum.
   */
  it("sums to exactly what the weekly sheet says for the same week", () => {
    const saved = logAll([
      entry("a", "2026-06-15", 4000),
      entry("b", "2026-06-17", 2500),
      entry("c", "2026-06-21", 1800),
    ]);
    const withZero = [...saved, entry("z", "2026-06-18", 50, { mileage: 400, setAsideRate: 0 })];

    const [week] = weeklySetAsides(withZero, PROFILE, YEAR);
    const rowTotal = withZero
      .map((e) => entrySetAsideDisplay(e)?.amount ?? 0)
      .reduce((sum, n) => sum + n, 0);

    expect(week.entryCount).toBe(4);
    expect(rowTotal).toBeCloseTo(week.setAside, 6);
  });

  it("agrees with the weekly sheet for estimated entries too", () => {
    const legacy = entry("old", "2026-06-16", 5000);
    const rate = fallbackSetAsideRate([legacy], PROFILE, YEAR)!;
    const [week] = weeklySetAsides([legacy], PROFILE, YEAR);

    expect(week.estimated).toBe(true);
    expect(entrySetAsideDisplay(legacy, rate)!.amount).toBeCloseTo(week.setAside, 6);
  });
});

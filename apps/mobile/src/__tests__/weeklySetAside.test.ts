import { describe, expect, it } from "vitest";
import {
  computeSetAsideRate,
  computeTaxEstimate,
  fallbackSetAsideRate,
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

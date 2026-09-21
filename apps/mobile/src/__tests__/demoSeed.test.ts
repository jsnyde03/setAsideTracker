import { describe, expect, it } from "vitest";
import { computeTaxEstimate, entriesForYear, weeklySetAsides } from "../calculations";
import { DEMO_ENTRY_COUNT, buildDemoSeed } from "../demo/demoSeed";

/**
 * The seed's whole reason for existing is that it must not age. So the tests below build it at
 * several points in the calendar — including the awkward ones — rather than at "now", which would
 * pass today and quietly stop meaning anything in January.
 */

/** A local-time date, matching how the seed derives its own dates. */
function on(year: number, month1Based: number, day: number): Date {
  return new Date(year, month1Based - 1, day, 12, 0, 0);
}

const SAMPLE_DATES = [
  on(2026, 8, 8), // mid-year, the roomy case
  on(2027, 3, 1), // a different year entirely
  on(2028, 2, 29), // a leap day
  on(2026, 12, 31), // last day of a tax year
  on(2027, 2, 20), // ~50 days in: just short of the persona's 52-day span
  on(2027, 1, 15), // deep in the compression case
  on(2027, 1, 1), // the degenerate edge — no room at all
];

describe("buildDemoSeed", () => {
  it("seeds the documented persona", () => {
    const seed = buildDemoSeed(on(2026, 8, 8));
    expect(seed.localUserProfile.displayName).toBe("Maya Rodriguez");
    expect(seed.taxProfile.state).toBe("CA");
    expect(seed.taxProfile.hasW2Job).toBe(true);
    expect(seed.entries).toHaveLength(DEMO_ENTRY_COUNT);
  });

  it.each(SAMPLE_DATES)("keeps every entry inside the current tax year on %s", (now) => {
    const seed = buildDemoSeed(now);
    const year = now.getFullYear();
    // This is the defect the module exists to prevent: entries whose year no longer matches, which
    // `entriesForYear` filters straight out of the dashboard.
    expect(entriesForYear(seed.entries, year)).toHaveLength(DEMO_ENTRY_COUNT);
  });

  it.each(SAMPLE_DATES)("never dates an entry in the future on %s", (now) => {
    const seed = buildDemoSeed(now);
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    for (const entry of seed.entries) {
      expect(entry.date <= today).toBe(true);
    }
  });

  it.each(SAMPLE_DATES)("keeps entries in chronological order on %s", (now) => {
    const dates = buildDemoSeed(now).entries.map((entry) => entry.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("spreads the full 52-day span when the year has room for it", () => {
    const seed = buildDemoSeed(on(2026, 8, 8));
    const dates = seed.entries.map((entry) => entry.date);
    expect(dates[0]).toBe("2026-06-15"); // 54 days before 8 August
    expect(dates[dates.length - 1]).toBe("2026-08-06"); // 2 days before
  });

  it("compresses rather than spilling into the previous tax year", () => {
    const seed = buildDemoSeed(on(2027, 1, 15));
    const dates = seed.entries.map((entry) => entry.date);
    expect(dates.every((date) => date.startsWith("2027-"))).toBe(true);
    expect(dates[0] >= "2027-01-01").toBe(true);
  });

  // Earnings only. This deliberately no longer claims anything about "on track" — that depends on
  // the set-aside target, which moves with the date even when these totals don't.
  it("keeps earnings totals identical however the dates compress", () => {
    const roomy = buildDemoSeed(on(2026, 8, 8));
    const cramped = buildDemoSeed(on(2027, 1, 3));
    const gross = (seed: ReturnType<typeof buildDemoSeed>) =>
      seed.entries.reduce((sum, entry) => sum + entry.grossPay + entry.tips, 0);
    expect(gross(cramped)).toBe(gross(roomy));
    expect(gross(roomy)).toBe(6213);
  });

  it("keys the per-year figures to the seed's own year, not a hardcoded one", () => {
    const seed = buildDemoSeed(on(2029, 6, 1));
    expect(Object.keys(seed.taxProfile.amountSetAsideByYear ?? {})).toEqual(["2029"]);
    expect(seed.taxProfile.filedTaxByYear).toEqual({ 2028: { totalTax: 1200 } });
  });

  /**
   * The regression for a defect no assertion caught and a screenshot did: the seed shipped a
   * hardcoded $1,400 against a target measured once at ≈ $1,384, and the demo opened on
   * "You're $85.63 behind — set aside an extra $14.27/week to catch up."
   *
   * Built with the real clock on purpose. `computeTaxEstimate` reads today's date internally for the
   * W2 withholding projection and takes no injectable `now`, so a fabricated date here would compare
   * a seed built for one day against a target computed for another — and pass while production
   * drifted. This asserts the invariant on the only day that matters: the day it runs.
   */
  it("always sets aside more than the engine's target, so the demo opens green rather than behind", () => {
    const seed = buildDemoSeed();
    const { netAmountToSetAside } = computeTaxEstimate(
      seed.entries,
      seed.taxProfile,
      new Date().getFullYear()
    );
    expect(netAmountToSetAside).toBeGreaterThan(0); // else the assertion below proves nothing
    expect(seed.taxProfile.amountSetAsideByYear?.[new Date().getFullYear()]).toBeGreaterThan(
      netAmountToSetAside
    );
  });

  it("carries the premium-authored fields, so the PDF and breakdown aren't empty", () => {
    const seed = buildDemoSeed(on(2026, 8, 8));
    expect(seed.entries.filter((entry) => entry.mileageLog).length).toBe(2);
    expect(seed.entries.flatMap((entry) => entry.customExpenses ?? []).map((expense) => expense.label)).toEqual([
      "Hot bags",
      "Hot bags",
      "Car wash",
      "Hot bags",
      "Hot bags",
    ]);
  });

  it("never carries a theme or an enabled reminder — both would reach outside the sandbox", () => {
    const seed = buildDemoSeed(on(2026, 8, 8));
    expect(seed.appSettings.colorScheme).toBeUndefined();
    expect(seed.appSettings.remindersEnabled).toBe(false);
  });

  it("gives every entry a distinct, obviously-synthetic id", () => {
    const ids = buildDemoSeed(on(2026, 8, 8)).entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(DEMO_ENTRY_COUNT);
    expect(ids.every((id) => id.startsWith("demo-entry-"))).toBe(true);
  });

  /**
   * ⭐ Found at 1.2.4's whole-item after-scan. The seed built entries with no frozen set-aside rate,
   * so every demo week rendered as *estimated* ([D14]) under a footnote saying the entries "were
   * logged before this app started recording a set-aside rate" — false about a persona this build
   * generates, and shown on the surface App Store screenshots are shot from.
   */
  it("freezes a set-aside rate on every entry, as the app does when a user logs one", () => {
    const seed = buildDemoSeed(new Date("2026-06-15T12:00:00.000Z"));

    for (const entry of seed.entries) {
      expect(typeof entry.setAsideRate, `entry ${entry.id} carries no frozen rate`).toBe("number");
    }
  });

  it("shows no estimated weeks, so the demo does not describe itself as pre-dating the feature", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const seed = buildDemoSeed(now);

    const weeks = weeklySetAsides(seed.entries, seed.taxProfile, now.getFullYear());

    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks.some((week) => week.estimated)).toBe(false);
  });

});

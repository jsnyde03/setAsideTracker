import { describe, expect, it } from "vitest";
import {
  computeSetAsideRate,
  computeTaxEstimate,
  entryNetProfit,
  entrySetAside,
} from "../calculations";
import type { Entry, TaxProfile } from "../types";

const YEAR = 2026;

const PROFILE: TaxProfile = {
  filingStatus: "single",
  state: "TX", // no state income tax, so the arithmetic below is about the federal/SE path only
  dependents: 0,
  hasW2Job: false,
};

function entry(id: string, grossPay: number, over: Partial<Entry> = {}): Entry {
  return {
    id,
    platform: "doordash",
    date: `${YEAR}-06-0${(Number(id.replace(/\D/g, "")) % 9) + 1}`,
    grossPay,
    tips: 0,
    mileage: 0,
    expenses: { parking: 0, tolls: 0, supplies: 0, phone: 0 },
    createdAt: `${YEAR}-06-01T00:00:00.000Z`,
    ...over,
  };
}

/** Log entries one at a time the way the app does, freezing each rate against what came before. */
function logAll(raw: Entry[], profile: TaxProfile = PROFILE): Entry[] {
  const saved: Entry[] = [];
  for (const next of raw) {
    saved.push({ ...next, setAsideRate: computeSetAsideRate(saved, next, profile, YEAR) });
  }
  return saved;
}

describe("computeSetAsideRate", () => {
  it("is the tax the entry actually adds, not a share of the year's average", () => {
    const existing = [entry("e1", 20000)];
    const added = entry("e2", 5000);

    const before = computeTaxEstimate(existing, PROFILE, YEAR).netAmountToSetAside;
    const after = computeTaxEstimate([...existing, added], PROFILE, YEAR).netAmountToSetAside;
    const rate = computeSetAsideRate(existing, added, PROFILE, YEAR);

    expect(rate).toBeDefined();
    expect((rate as number) * entryNetProfit(added)).toBeCloseTo(after - before, 6);
  });

  /**
   * ⭐ The property the whole design rests on ([D7]). A rate derived from the year's *average* would
   * mean every past week's figure moves each time the user earns more. These are frozen, so the
   * first entry's figure has to be untouched by everything logged after it.
   */
  it("does not move a logged entry's figure when more is earned later", () => {
    const first = logAll([entry("e1", 4000)])[0];
    const firstFigure = entrySetAside(first);

    const wholeYear = logAll([entry("e1", 4000), entry("e2", 30000), entry("e3", 25000)]);

    expect(entrySetAside(wholeYear[0])).toBe(firstFigure);
    // And the later entries are rated HIGHER, which is what makes the point non-trivial: the rate
    // genuinely moved, and the early entry kept its own anyway.
    expect(wholeYear[2].setAsideRate as number).toBeGreaterThan(wholeYear[0].setAsideRate as number);
  });

  it("sums to the year's real total, which is what makes the weekly rows add up", () => {
    const saved = logAll([entry("e1", 9000), entry("e2", 11000), entry("e3", 7000)]);

    const summed = saved.reduce((total, e) => total + (entrySetAside(e) ?? 0), 0);
    const real = computeTaxEstimate(saved, PROFILE, YEAR).netAmountToSetAside;

    // Telescoping: each increment is f(with) − f(without), so the series collapses to f(all).
    expect(summed).toBeCloseTo(real, 6);
  });

  it("returns undefined when the entry has no profit to take a fraction of", () => {
    const costly = entry("e1", 40, { expenses: { parking: 60, tolls: 0, supplies: 0, phone: 0 } });

    expect(computeSetAsideRate([], costly, PROFILE, YEAR)).toBeUndefined();
    expect(entrySetAside(costly)).toBeUndefined();
  });

  /**
   * A shift whose mileage deduction exceeds its pay genuinely reduces the year's tax. That is real
   * and stays visible in the year total — but "set aside minus $12" is not an instruction, and for a
   * tax app the safe direction is setting aside slightly too much.
   */
  it("never returns a negative rate, even for an entry that reduces the year's tax", () => {
    const existing = logAll([entry("e1", 30000)]);
    const heavyMileage = entry("e2", 50, { mileage: 400 });

    const before = computeTaxEstimate(existing, PROFILE, YEAR).netAmountToSetAside;
    const after = computeTaxEstimate([...existing, heavyMileage], PROFILE, YEAR).netAmountToSetAside;
    expect(after, "fixture is not exercising the case — this entry did not reduce the tax").toBeLessThan(
      before
    );

    expect(computeSetAsideRate(existing, heavyMileage, PROFILE, YEAR)).toBe(0);
  });

  it("is zero while a W2 job already over-withholds — nothing needs setting aside yet", () => {
    const w2Profile: TaxProfile = {
      ...PROFILE,
      hasW2Job: true,
      w2GrossPayPerPeriod: 3500,
      w2PayFrequency: "biweekly",
      // Deliberately far more withheld than the year owes. A plain ~$91k salary does NOT
      // over-withhold enough to absorb the gig tax on its own -- the first version of this fixture
      // assumed it did, and the guard assertion below is what caught that rather than a green test
      // quietly asserting nothing. (That version also named fields TaxProfile does not have;
      // Vitest does not typecheck, so only `tsc` found it.)
      w2YtdFederalWithheld: 40000,
    };

    const rate = computeSetAsideRate([], entry("e1", 300), w2Profile, YEAR);

    expect(computeTaxEstimate([entry("e1", 300)], w2Profile, YEAR).netAmountToSetAside).toBe(0);
    expect(rate).toBe(0);
  });
});

describe("entrySetAside", () => {
  it("applies the frozen rate to the entry's CURRENT profit, so an edit moves the dollars", () => {
    const logged = logAll([entry("e1", 1000)])[0];
    const edited = { ...logged, grossPay: 2000 };

    expect(entrySetAside(edited)).toBeCloseTo((entrySetAside(logged) as number) * 2, 6);
    expect(edited.setAsideRate).toBe(logged.setAsideRate);
  });

  it("uses a fallback rate only when the entry has none — [D14]'s legacy case", () => {
    const legacy = entry("old", 1000); // no setAsideRate, as every pre-v1.2 entry
    const frozen = logAll([entry("e1", 1000)])[0];

    expect(entrySetAside(legacy)).toBeUndefined();
    expect(entrySetAside(legacy, 0.25)).toBeCloseTo(250, 6);
    // A fallback must never override a rate that was actually frozen.
    expect(entrySetAside(frozen, 0.99)).toBeCloseTo(entrySetAside(frozen) as number, 6);
  });
});

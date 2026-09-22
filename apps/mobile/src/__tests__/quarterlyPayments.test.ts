import { describe, expect, it } from "vitest";
import { summarizeQuarterlyPayments } from "../quarterlyPayments";

// Tax year 2026: Apr 15, Jun 15, Sep 15 (all 2026) and Jan 15 2027 — none of them shifted, which
// makes the dates easy to reason about here. The shifting itself is 1.2.6.2's tests, not this one's.
const YEAR = 2026;
const MAY = new Date(2026, 4, 1); // after Q1's deadline, before Q2's
const OCTOBER = new Date(2026, 9, 1); // after Q1, Q2 and Q3; before Q4's
const MARCH = new Date(2026, 2, 1); // before every deadline

describe("summarizeQuarterlyPayments", () => {
  it("splits the target four ways and pairs each with the real due date", () => {
    const summary = summarizeQuarterlyPayments(1000, undefined, YEAR, MARCH);

    expect(summary.quarters).toHaveLength(4);
    expect(summary.totalRequired).toBe(4000);
    expect(summary.quarters.map((q) => q.required)).toEqual([1000, 1000, 1000, 1000]);
    expect(summary.quarters[0].dueDate).toEqual(new Date(2026, 3, 15));
    expect(summary.quarters[3].dueDate).toEqual(new Date(2027, 0, 15));
  });

  it("counts a shortfall only once its deadline has passed", () => {
    // Nothing paid at all. In March that is not yet a problem; by October three deadlines have gone.
    expect(summarizeQuarterlyPayments(1000, undefined, YEAR, MARCH).overdue).toBe(0);
    expect(summarizeQuarterlyPayments(1000, undefined, YEAR, MAY).overdue).toBe(1000);
    expect(summarizeQuarterlyPayments(1000, undefined, YEAR, OCTOBER).overdue).toBe(3000);
  });

  it("is on track before the first deadline even with nothing recorded", () => {
    // Vacuously true, and it has to be: telling a user in March that they are behind on a payment
    // due in April is the alarming-and-wrong direction.
    expect(summarizeQuarterlyPayments(1000, undefined, YEAR, MARCH).onTrack).toBe(true);
  });

  it("clears the overdue figure once the past quarters are covered", () => {
    const summary = summarizeQuarterlyPayments(1000, { q1: 1000, q2: 1000 }, YEAR, OCTOBER);

    // Q3 is still short — Q1 and Q2 being paid does not cover it.
    expect(summary.overdue).toBe(1000);
    expect(summary.onTrack).toBe(false);

    const covered = summarizeQuarterlyPayments(1000, { q1: 1000, q2: 1000, q3: 1000 }, YEAR, OCTOBER);
    expect(covered.overdue).toBe(0);
    expect(covered.onTrack).toBe(true);
  });

  it("does not let an overpaid quarter mask a later shortfall", () => {
    // $4,000 paid in Q1 covers the whole year's target in total, but Q2 and Q3 are still unpaid and
    // the IRS computes the penalty per period. A summary that netted these off would report "on
    // track" for a user who is not.
    const summary = summarizeQuarterlyPayments(1000, { q1: 4000 }, YEAR, OCTOBER);

    expect(summary.totalPaid).toBe(4000);
    expect(summary.totalRequired).toBe(4000);
    expect(summary.overdue).toBe(2000); // Q2 and Q3
    expect(summary.onTrack).toBe(false);
  });

  it("distinguishes nothing-recorded from a recorded zero", () => {
    const unrecorded = summarizeQuarterlyPayments(1000, {}, YEAR, MAY);
    const recordedZero = summarizeQuarterlyPayments(1000, { q1: 0 }, YEAR, MAY);

    expect(unrecorded.quarters[0].paid).toBeUndefined();
    expect(recordedZero.quarters[0].paid).toBe(0);
    // Both are genuinely behind — the difference is what the UI can honestly say about them.
    expect(unrecorded.overdue).toBe(1000);
    expect(recordedZero.overdue).toBe(1000);
  });

  it("reports a partial payment as the remaining gap, not the whole quarter", () => {
    const summary = summarizeQuarterlyPayments(1000, { q1: 600 }, YEAR, MAY);
    expect(summary.quarters[0].shortfall).toBe(400);
    expect(summary.overdue).toBe(400);
  });

  it("treats a sub-cent gap as covered, not as a debt", () => {
    // ⛔ Regression, found by the CALENDAR rather than by a test. The demo seeded each past quarter
    // with `Math.round(perQuarter)` against an unrounded requirement, so whether the persona read
    // as square was a coin flip on the cents — green on 2026-09-21, red on 2026-09-22, because the
    // seeded entries move with the date and the figure re-rounded the other way. The seed now pays
    // up (`ceil`), and sub-cent differences are float noise from `miles × rate` either way.
    const summary = summarizeQuarterlyPayments(1000.004, { q1: 1000 }, YEAR, MAY);

    expect(summary.quarters[0].shortfall).toBe(0);
    expect(summary.overdue).toBe(0);
    expect(summary.onTrack).toBe(true);
  });

  it("still reports a real sub-dollar shortfall", () => {
    // The other direction: 43 cents is noise-free and genuinely owed, so it must survive. Without
    // this pair the clamp above could swallow any amount and nothing would notice.
    const summary = summarizeQuarterlyPayments(1000.43, { q1: 1000 }, YEAR, MAY);

    expect(summary.quarters[0].shortfall).toBeCloseTo(0.43, 6);
    expect(summary.onTrack).toBe(false);
  });

  it("never reports a negative shortfall", () => {
    const summary = summarizeQuarterlyPayments(1000, { q1: 2500 }, YEAR, MAY);
    expect(summary.quarters[0].shortfall).toBe(0);
    expect(summary.overdue).toBe(0);
  });
});

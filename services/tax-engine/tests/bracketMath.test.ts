import { describe, expect, it } from "vitest";
import { applyBrackets, applyBracketsDetailed } from "../src/bracketMath";
import type { TaxBracket } from "../src/types";

const brackets: TaxBracket[] = [
  { min: 0, max: 10000, rate: 0.1 },
  { min: 10000, max: 40000, rate: 0.2 },
  { min: 40000, max: null, rate: 0.3 },
];

describe("applyBracketsDetailed", () => {
  it("emits one applied bracket per bracket actually reached, with the income slice and its tax", () => {
    const { tax, applied } = applyBracketsDetailed(25000, brackets);

    // 10000 * 0.1 + 15000 * 0.2 = 1000 + 3000
    expect(tax).toBeCloseTo(4000, 6);
    expect(applied).toHaveLength(2);
    expect(applied[0]).toEqual({ min: 0, max: 10000, rate: 0.1, amountInBracket: 10000, taxFromBracket: 1000 });
    expect(applied[1]).toEqual({ min: 10000, max: 40000, rate: 0.2, amountInBracket: 15000, taxFromBracket: 3000 });
  });

  it("does not emit brackets above the income level", () => {
    const { applied } = applyBracketsDetailed(5000, brackets);
    expect(applied).toHaveLength(1);
    expect(applied[0].amountInBracket).toBe(5000);
  });

  it("reaches the open-ended top bracket and bounds the slice by the income", () => {
    const { applied } = applyBracketsDetailed(60000, brackets);
    expect(applied).toHaveLength(3);
    expect(applied[2]).toEqual({ min: 40000, max: null, rate: 0.3, amountInBracket: 20000, taxFromBracket: 6000 });
  });

  it("emits no brackets for zero taxable income", () => {
    expect(applyBracketsDetailed(0, brackets).applied).toEqual([]);
  });

  it("per-bracket tax always sums back to the total, and matches applyBrackets", () => {
    for (const income of [0, 5000, 10000, 25000, 40000, 95000]) {
      const { tax, applied } = applyBracketsDetailed(income, brackets);
      const summed = applied.reduce((acc, b) => acc + b.taxFromBracket, 0);
      expect(summed).toBeCloseTo(tax, 6);
      expect(tax).toBeCloseTo(applyBrackets(income, brackets), 6);
    }
  });
});

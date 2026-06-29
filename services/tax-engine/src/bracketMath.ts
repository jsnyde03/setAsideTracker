import type { AppliedBracket, TaxBracket } from "./types";

/**
 * Applies a progressive bracket schedule to taxable income, returning both the total tax and a
 * per-bracket breakdown of only the brackets actually reached — the raw material for a
 * "show your math" audit trail. The breakdown is the same loop applyBrackets runs, just retaining
 * the intermediate amounts instead of discarding them.
 */
export function applyBracketsDetailed(
  taxableIncome: number,
  brackets: TaxBracket[]
): { tax: number; applied: AppliedBracket[] } {
  let tax = 0;
  const applied: AppliedBracket[] = [];
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const upperBound = bracket.max === null ? taxableIncome : Math.min(taxableIncome, bracket.max);
    const amountInBracket = Math.max(0, upperBound - bracket.min);
    const taxFromBracket = amountInBracket * bracket.rate;
    tax += taxFromBracket;
    applied.push({ min: bracket.min, max: bracket.max, rate: bracket.rate, amountInBracket, taxFromBracket });
  }
  return { tax, applied };
}

export function applyBrackets(taxableIncome: number, brackets: TaxBracket[]): number {
  return applyBracketsDetailed(taxableIncome, brackets).tax;
}

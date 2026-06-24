import type { TaxBracket } from "./types";

export function applyBrackets(taxableIncome: number, brackets: TaxBracket[]): number {
  let tax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;
    const upperBound = bracket.max === null ? taxableIncome : Math.min(taxableIncome, bracket.max);
    const amountInBracket = Math.max(0, upperBound - bracket.min);
    tax += amountInBracket * bracket.rate;
  }
  return tax;
}

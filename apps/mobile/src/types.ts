import type { FilingStatus } from "@gig-tax-tracker/tax-engine";

export interface LocalUserProfile {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export interface TaxProfile {
  filingStatus: FilingStatus;
  dependents: number;
  hasW2Job: boolean;
  /** Annual W2 income, if hasW2Job is true. Used as otherTaxableIncome in the tax estimate. */
  estimatedW2Income: number;
  state: string;
  /** County of residence, only required for states with a local "piggyback" income tax (e.g. MD). */
  county?: string;
}

export type GigPlatform =
  | "amazonFlex"
  | "spark"
  | "doordash"
  | "uber"
  | "instacart"
  | "other";

export interface EntryExpenses {
  parking: number;
  tolls: number;
  supplies: number;
  /** Business-use portion of phone costs attributed to this entry, not the full bill. */
  phone: number;
}

export interface Entry {
  id: string;
  platform: GigPlatform;
  date: string; // ISO date string
  grossPay: number;
  tips: number;
  mileage: number;
  expenses: EntryExpenses;
  createdAt: string;
}

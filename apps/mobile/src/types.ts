import type { FilingStatus } from "@gig-tax-tracker/tax-engine";

export interface LocalUserProfile {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export interface TaxProfile {
  filingStatus: FilingStatus;
  dependents: number;
  hasW2Job: boolean;
  /** Annual W2 income, if hasW2Job is true. Used as otherTaxableIncome in the tax estimate. This
   * is the canonical value used everywhere downstream — it's computed from w2PaycheckAmount /
   * w2PayFrequency in the UI (most people know their paycheck amount, not their annual gross),
   * but every consumer of TaxProfile should keep reading this field, not the paycheck ones. */
  estimatedW2Income: number;
  /** The raw paycheck amount the user entered, if they entered it that way. Stored purely so the
   * edit form can show it back to them next time, instead of making them reverse-calculate it
   * from estimatedW2Income. */
  w2PaycheckAmount?: number;
  w2PayFrequency?: PayFrequency;
  /** If the W2 job ends (or already ended) partway through the tax year, income/withholding
   * stop accruing after this date. Omit if the job runs through year-end. */
  w2EndDate?: string;
  state: string;
  /** County of residence, only required for states with a local "piggyback" income tax (e.g. MD). */
  county?: string;
  /** Self-reported running total of how much the user has actually set aside this tax year,
   * keyed by year. Manually entered — the app has no real visibility into a savings account. */
  amountSetAsideByYear?: Record<number, number>;
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
  /** Hours actually worked on this shift. Optional — older entries won't have it, and some users
   * may not want to track it for every entry. Powers the "effective hourly rate" insight, which
   * only shows up once at least one entry in the period has this set. */
  hoursWorked?: number;
  createdAt: string;
}

export interface AppSettings {
  /** Defaults to false — app lock is opt-in, not on by default, even on devices that support it. */
  appLockEnabled: boolean;
}

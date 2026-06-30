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
  // ── W2 per-paycheck fields (only meaningful when hasW2Job is true) ─────────────────────────
  /** Gross pay per paycheck before any deductions (the top-line "Gross Pay" on a pay stub). */
  w2GrossPayPerPeriod?: number;
  /** Pretax 401k/403b contribution per paycheck. Reduces federal/state taxable income but NOT
   * FICA wages — so this must be tracked separately from pretax benefits. Optional; defaults to 0. */
  w2RetirementPerPeriod?: number;
  /** Pretax insurance/HSA/FSA deductions per paycheck. Reduces both taxable income AND FICA wages
   * (unlike 401k). Optional; defaults to 0. */
  w2PreTaxBenefitsPerPeriod?: number;
  w2PayFrequency?: PayFrequency;
  /** If the W2 job ends (or already ended) partway through the tax year, income/withholding
   * stop accruing after this date. Omit if the job runs through year-end. */
  w2EndDate?: string;
  // ── YTD actuals from a recent pay stub (optional — improves withholding credit accuracy) ───
  /** Federal income tax withheld year-to-date, from the YTD column of the most recent pay stub. */
  w2YtdFederalWithheld?: number;
  /** State income tax withheld year-to-date, from the YTD column of the most recent pay stub. */
  w2YtdStateWithheld?: number;
  // ─────────────────────────────────────────────────────────────────────────────────────────────
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

/**
 * IRS-compliant mileage-log substantiation for the business miles in an entry. To claim the
 * standard mileage deduction the IRS requires a contemporaneous log recording, for each trip, the
 * business purpose and where it went — the raw `Entry.mileage` number alone isn't enough on audit.
 * Authoring these is a Premium feature; the mileage *number* stays free. All fields are optional
 * (older entries and free users won't have them) and stored as trimmed free text. This is also the
 * data-model groundwork for v1.3 GPS-assisted mileage, which will populate the same shape. */
export interface MileageLog {
  /** Business purpose of the trip (e.g. "DoorDash deliveries — downtown zone"). */
  purpose?: string;
  /** Where the trip started — free-text address or place name. */
  startLocation?: string;
  /** Where the trip ended. */
  endLocation?: string;
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
  /** IRS mileage-log details substantiating this entry's business miles. Optional and
   * Premium-authored; absent on older entries and for free users. See {@link MileageLog}. */
  mileageLog?: MileageLog;
  createdAt: string;
}

export interface AppSettings {
  /** Defaults to false — app lock is opt-in, not on by default, even on devices that support it. */
  appLockEnabled: boolean;
  /** "system" (the default when unset) follows the OS's own light/dark setting; "light"/"dark"
   * are an explicit user override. */
  colorScheme?: "light" | "dark" | "system";
  /** Defaults to true when unset — quarterly due-date reminders were always-on before this
   * setting existed, so absence of the field means "keep the existing behavior," not "off." */
  remindersEnabled?: boolean;
}

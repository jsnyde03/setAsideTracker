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
  /**
   * Spouse's expected annual taxable income, for Married Filing Jointly only.
   *
   * ⚠️ **Without this the app was quietly wrong for most married users.** A joint return taxes both
   * incomes together, so gig profit stacks on top of the spouse's — but `grep -ri spouse` returned
   * nothing repo-wide until 1.2.2.4, and profit was taxed from the bottom of the MFJ brackets as if
   * the spouse earned nothing. The set-aside came out systematically too low, silently.
   *
   * ⛔ **This figure MUST be credited with its own withholding, never added as bare income.**
   * `netAmountToSetAside` is `totalEstimatedTax − withholding`, so adding a spouse's income without
   * their withholding would tell the user to set aside their spouse's entire tax bill — a worse bug
   * than the one this fixes. See `estimateFromAggregate`.
   *
   * Annual rather than per-paycheck (unlike the user's own W2 fields) because it is a second-hand
   * figure: people know roughly what their spouse earns, not their pay-stub breakdown. Optional —
   * absent for single filers, and for joint filers who haven't supplied it.
   */
  spouseAnnualIncome?: number;
  state: string;
  /** County of residence, only required for states with a local "piggyback" income tax (e.g. MD). */
  county?: string;
  /** Self-reported running total of how much the user has actually set aside this tax year,
   * keyed by year. Manually entered — the app has no real visibility into a savings account. */
  amountSetAsideByYear?: Record<number, number>;
  /** Federal figures from a completed tax year's filed return, keyed by the year they describe
   * (e.g. the 2025 entry powers the prior-year safe-harbor test for 2026). Entered by the user —
   * the app can't know a return it didn't compute. Used only by the safe-harbor (Form 2210)
   * calculator. See {@link FiledYearTax}. */
  filedTaxByYear?: Record<number, FiledYearTax>;
}

/**
 * Federal figures the user copies from a completed tax year's filed Form 1040, used for the
 * prior-year leg of the safe-harbor (Form 2210) test. The total tax is required; AGI is optional
 * and only changes the result when it crosses the high-income threshold that bumps the prior-year
 * safe harbor from 100% to 110%. */
export interface FiledYearTax {
  /** Total federal tax for the year (Form 1040 "total tax" line), as actually filed. ≥ 0. */
  totalTax: number;
  /** Adjusted gross income for the year (Form 1040 AGI line). Optional — supply it only if it was
   * high enough to matter (over $150k, or $75k if married filing separately), which selects the
   * 110% prior-year multiplier. */
  agi?: number;
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
 * A user-defined business expense beyond the four fixed buckets — e.g. "Car wash", "Hot bags",
 * "Health insurance". Authoring these is a Premium feature; like {@link MileageLog} they're additive
 * and optional (older entries and free users won't have them), and they round-trip through backup
 * for free. The label is trimmed free text and the amount is a non-negative dollar figure. These sum
 * into the same non-mileage expense total as the fixed buckets (reducing net SE profit) and map onto
 * IRS Schedule C Line 27 "Other expenses", aggregated by label in the tax-summary export. */
export interface CustomExpense {
  /** User-entered category name, trimmed (e.g. "Car wash"). */
  label: string;
  /** Dollar amount for this category on this entry; always ≥ 0. */
  amount: number;
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
  /** User-defined expense categories beyond the four fixed buckets. Optional and Premium-authored;
   * absent on older entries and for free users. See {@link CustomExpense}. */
  customExpenses?: CustomExpense[];
  /**
   * The fraction of this entry's own profit to set aside for tax, **frozen at the moment it was
   * logged** ([D7]) — e.g. `0.2734`. Multiply by {@link entryNetProfit} to get the dollar figure.
   *
   * ⚠️ **Why a rate is stored rather than a dollar amount.** Tax is progressive, so a per-shift
   * figure derived from the year's *average* rate moves retroactively every time the user earns
   * more: open the app in November and last July's number has changed, which is the opposite of
   * something you can track against. Freezing it means a week's total never moves once the week has
   * passed. A *rate* rather than an *amount* additionally means editing an entry's pay updates its
   * set-aside — at the rate that was in effect when it was logged, which is the property being
   * preserved. The drift this creates against the true year total is real, expected, and reported
   * by the existing catch-up line rather than hidden.
   *
   * Absent on every entry logged before v1.2 and on any entry with no positive profit; see
   * {@link computeSetAsideRate} for how it is derived and what absence means.
   */
  setAsideRate?: number;
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

import { computeSafeHarborFromEntries, computeSetAsideRate, computeTaxEstimate } from "../calculations";
import { summarizeQuarterlyPayments } from "../quarterlyPayments";
import type { DemoSeed } from "../storage/repository";
import type { CustomExpense, Entry, GigPlatform, MileageLog, QuarterlyPayments, TaxProfile } from "../types";

/**
 * The demo persona: **Maya Rodriguez**, a Los Angeles gig worker (rideshare + delivery) who also
 * keeps a small, under-withheld part-time W2 café job.
 *
 * The numbers are ported verbatim from `SCREENSHOT_PLAN.md`, where they were tuned so every store
 * screenshot has something real to show: California gives a federal **and** state breakdown, the
 * under-withheld W2 leaves a genuine uncovered gap (which is what makes the W-4 optimizer and
 * safe-harbor screens non-trivial), the prior-year figure makes the prior-year safe-harbor leg bind,
 * and the amount-set-aside lands just above target so the dashboard reads green "on track" rather
 * than a warning — that last one **computed here, not copied**, for the reason given further down.
 *
 * ## Why the dates are offsets and not dates
 *
 * The persona previously existed only as `store-assets/reference-screenshots/maya-persona-backup.json`
 * with **absolute** dates in May–June 2026. As a one-off screenshot fixture that was fine. As the
 * seed behind a shipped demo it is a time bomb: `entriesForYear` filters entries by
 * `date.startsWith("2026-")`, so on 1 January the entire persona would drop out of the dashboard and
 * the demo would show an empty year. Every date here is therefore expressed as "days before today"
 * and materialised at seed time.
 *
 * ## The January case
 *
 * The persona spans 52 days. Early in a calendar year there isn't 52 days of room before the tax
 * year starts, so the span is **compressed proportionally** into whatever room exists rather than
 * being allowed to spill into December of the previous tax year. The entries stay in order, stay in
 * the past, and stay inside the current tax year. Earnings totals are unaffected — all 20 entries are
 * always present with their original amounts.
 *
 * ⚠️ **Equal earnings do NOT imply an equal set-aside target.** The target subtracts a W2 withholding
 * projection derived from today's date, so it moves through the year even though the entries don't.
 * That is why the amount-set-aside is computed from the engine below rather than fixed.
 *
 * ⚠️ The trade-off is visual: a demo entered in the first days of January shows the entries bunched
 * together. That matters for store screenshots (`SCREENSHOT_PLAN.md`), not for the demo's job of
 * showing a populated app. Shoot screenshots outside the first week of January.
 */

/** Days between the oldest and newest seeded entry, in the persona's original spacing. */
const SPAN_DAYS = 52;

/** How far before today the newest entry sits — recent enough to look live, not today. */
const NEWEST_DAYS_AGO = 2;

interface EntrySpec {
  /** Days before today, in the persona's original spacing. Compressed if the year is too young. */
  daysAgo: number;
  platform: GigPlatform;
  grossPay: number;
  tips: number;
  mileage: number;
  parking?: number;
  tolls?: number;
  supplies?: number;
  phone: number;
  hoursWorked: number;
  customExpenses?: CustomExpense[];
  mileageLog?: MileageLog;
}

/**
 * 20 full-day totals across four platforms, oldest first. Expected totals, as a sanity check on any
 * future edit: **≈ $6,213** earnings · **≈ $33/hr** effective · **1,662** business miles · **~137**
 * hours · **≈ $1,429** deductible expenses. _(`SCREENSHOT_PLAN.md` also lists a ≈ $1,384 set-aside
 * target; that one is date-dependent and deliberately not restated here — see the buffer below.)_
 */
const ENTRY_SPECS: EntrySpec[] = [
  { daysAgo: 54, platform: "doordash", grossPay: 244, tips: 52, mileage: 80, phone: 3, hoursWorked: 6.5 },
  { daysAgo: 52, platform: "uber", grossPay: 296, tips: 43, mileage: 98, tolls: 6, phone: 3, hoursWorked: 8 },
  { daysAgo: 49, platform: "instacart", grossPay: 208, tips: 66, mileage: 56, supplies: 8, phone: 2, hoursWorked: 5.5 },
  { daysAgo: 45, platform: "amazonFlex", grossPay: 288, tips: 0, mileage: 84, parking: 5, phone: 3, hoursWorked: 6.5 },
  {
    daysAgo: 42,
    platform: "doordash",
    grossPay: 262,
    tips: 57,
    mileage: 85,
    phone: 3,
    hoursWorked: 7,
    customExpenses: [{ label: "Hot bags", amount: 17 }],
  },
  { daysAgo: 40, platform: "uber", grossPay: 288, tips: 42, mileage: 96, tolls: 6, phone: 3, hoursWorked: 8 },
  {
    daysAgo: 38,
    platform: "doordash",
    grossPay: 224,
    tips: 58,
    mileage: 74,
    phone: 3,
    hoursWorked: 6.5,
    // One of two entries carrying Premium-authored fields, so the PDF export and the expense
    // breakdown have real substantiation to show rather than empty sections.
    mileageLog: {
      purpose: "DoorDash dinner rush — Downtown LA",
      startLocation: "Home — Echo Park",
      endLocation: "Downtown LA",
    },
    customExpenses: [{ label: "Hot bags", amount: 18 }],
  },
  {
    daysAgo: 36,
    platform: "amazonFlex",
    grossPay: 312,
    tips: 0,
    mileage: 90,
    parking: 6,
    phone: 3,
    hoursWorked: 7,
    customExpenses: [{ label: "Car wash", amount: 14 }],
  },
  { daysAgo: 33, platform: "instacart", grossPay: 196, tips: 68, mileage: 54, supplies: 10, phone: 2, hoursWorked: 5.5 },
  { daysAgo: 31, platform: "doordash", grossPay: 252, tips: 51, mileage: 82, phone: 3, hoursWorked: 7 },
  { daysAgo: 29, platform: "uber", grossPay: 338, tips: 39, mileage: 110, tolls: 6, phone: 3, hoursWorked: 8.5 },
  {
    daysAgo: 26,
    platform: "doordash",
    grossPay: 214,
    tips: 55,
    mileage: 70,
    phone: 2,
    hoursWorked: 6,
    customExpenses: [{ label: "Hot bags", amount: 16 }],
  },
  { daysAgo: 24, platform: "amazonFlex", grossPay: 296, tips: 0, mileage: 86, parking: 5, phone: 3, hoursWorked: 6.5 },
  { daysAgo: 22, platform: "instacart", grossPay: 222, tips: 74, mileage: 60, supplies: 8, phone: 2, hoursWorked: 5.5 },
  { daysAgo: 19, platform: "uber", grossPay: 324, tips: 44, mileage: 104, tolls: 6, phone: 3, hoursWorked: 8 },
  {
    daysAgo: 16,
    platform: "doordash",
    grossPay: 268,
    tips: 59,
    mileage: 86,
    phone: 3,
    hoursWorked: 7,
    mileageLog: {
      purpose: "DoorDash weekend deliveries — Silver Lake / Los Feliz",
      startLocation: "Home — Echo Park",
      endLocation: "Silver Lake",
    },
  },
  { daysAgo: 12, platform: "amazonFlex", grossPay: 305, tips: 0, mileage: 92, parking: 6, phone: 3, hoursWorked: 7 },
  { daysAgo: 9, platform: "instacart", grossPay: 198, tips: 57, mileage: 51, supplies: 6, phone: 2, hoursWorked: 5 },
  {
    daysAgo: 5,
    platform: "doordash",
    grossPay: 279,
    tips: 48,
    mileage: 90,
    phone: 3,
    hoursWorked: 7.5,
    customExpenses: [{ label: "Hot bags", amount: 20 }],
  },
  { daysAgo: 2, platform: "uber", grossPay: 345, tips: 41, mileage: 114, tolls: 6, phone: 3, hoursWorked: 9 },
];

/** Number of entries a demo session starts with. Exported so tests and UI copy can't drift from it. */
export const DEMO_ENTRY_COUNT = ENTRY_SPECS.length;

/**
 * How far above the computed target to land the amount-set-aside, so the dashboard reads green
 * "on track" rather than a red catch-up warning. Reassurance is a better first impression than a
 * deficit, and a demo that opens on a warning misrepresents the app's normal state.
 *
 * ⚠️ **This is derived, never hardcoded, and that is not a refinement — a constant is wrong here.**
 * `SCREENSHOT_PLAN.md` specified a literal $1,400 against a target of ≈ $1,384, which held on the day
 * it was measured. The target is **date-dependent**: `netAmountToSetAside` subtracts a W2 withholding
 * projection that `w2WithholdingYearFraction` computes from *today*, so as the year advances the same
 * persona needs more set aside. Carried over literally, the demo opened on
 * **"You're $85.63 behind — set aside an extra $14.27/week to catch up."**
 */
const DEMO_SET_ASIDE_BUFFER = 25;

/** Prior-year total federal tax. Low enough against this year's that the prior-year safe-harbor leg
 *  binds — the "your income jumped, pay far less" story the safe-harbor screen exists to tell. */
const DEMO_PRIOR_YEAR_TOTAL_TAX = 1200;

/** Local calendar date `daysAgo` before `now`, as `YYYY-MM-DD`.
 *
 * Built from local date parts rather than by subtracting milliseconds from a timestamp: the app
 * compares these strings against locally-derived years (`entriesForYear`), so an entry that shifts a
 * day across a UTC boundary would be a real off-by-one near midnight. `Date` normalises an
 * out-of-range day number, so day − 54 is safe without any month arithmetic. */
function localDateDaysAgo(now: Date, daysAgo: number): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Whole days from 1 January of `now`'s year to `now`. 0 on 1 January. */
function dayOfYear(now: Date): number {
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - startOfYear.getTime()) / 86_400_000);
}

/**
 * Builds the seed a demo session starts from, with every date resolved against `now`.
 *
 * `now` is injectable so the January-compression behaviour is testable without touching the clock.
 */
export function buildDemoSeed(now: Date = new Date()): DemoSeed {
  const year = now.getFullYear();

  // Keep the whole persona inside the current tax year. `newest` also collapses toward today in the
  // first days of January, so the newest entry can never land in the previous year either.
  const newest = Math.min(NEWEST_DAYS_AGO, dayOfYear(now));
  const room = dayOfYear(now) - newest;
  const scale = Math.min(1, room / SPAN_DAYS);

  const entries: Entry[] = ENTRY_SPECS.map((spec, index) => {
    const daysAgo = newest + Math.round((spec.daysAgo - NEWEST_DAYS_AGO) * scale);
    const date = localDateDaysAgo(now, daysAgo);
    return {
      // Stable, obviously-synthetic ids. If one ever shows up in a bug report or an export, its
      // origin should be unambiguous.
      id: `demo-entry-${String(index + 1).padStart(2, "0")}`,
      platform: spec.platform,
      date,
      grossPay: spec.grossPay,
      tips: spec.tips,
      mileage: spec.mileage,
      expenses: {
        parking: spec.parking ?? 0,
        tolls: spec.tolls ?? 0,
        supplies: spec.supplies ?? 0,
        phone: spec.phone,
      },
      hoursWorked: spec.hoursWorked,
      createdAt: `${date}T20:00:00.000Z`,
      ...(spec.mileageLog ? { mileageLog: spec.mileageLog } : {}),
      ...(spec.customExpenses ? { customExpenses: spec.customExpenses } : {}),
    };
  });

  const taxProfile: TaxProfile = {
    filingStatus: "single",
    dependents: 0,
    hasW2Job: true,
    w2GrossPayPerPeriod: 900,
    w2PayFrequency: "biweekly",
    w2YtdFederalWithheld: 250,
    w2YtdStateWithheld: 60,
    state: "CA",
    filedTaxByYear: { [year - 1]: { totalTax: DEMO_PRIOR_YEAR_TOTAL_TAX } },
  };

  // ⛔ **Freeze each entry's set-aside rate, exactly as the app does when a user logs one (1.2.4.2).**
  // Without this every demo week renders as *estimated* ([D14]) under a footnote saying the entries
  // "were logged before this app started recording a set-aside rate" — which is false about a
  // persona this build generated, and it is the surface App Store screenshots are shot from
  // (SCREENSHOT_PLAN). Rated in order against what came before, because that is what the rate means.
  const ratedEntries = entries.reduce<Entry[]>((sofar, next) => {
    sofar.push({ ...next, setAsideRate: computeSetAsideRate(sofar, next, taxProfile, year) });
    return sofar;
  }, []);

  // Ask the real engine what this persona owes, then set aside a little more than that. Running the
  // app's own calculation rather than restating a number measured once is what keeps "on track" true
  // on every future date — and `amountSetAsideByYear` is self-reported savings that the estimate
  // never reads, so computing it from a profile that doesn't carry it yet is not circular.
  const target = computeTaxEstimate(ratedEntries, taxProfile, year).netAmountToSetAside;
  const amountSetAside = Math.ceil((target + DEMO_SET_ASIDE_BUFFER) / 10) * 10;

  // The payment tracker ([D19]) needs something to show, and for the same reason as above it asks
  // the engine rather than restating a figure measured once. **Every deadline that has already
  // passed is paid in full**, computed at seed time rather than hardcoded to specific quarters — so
  // the persona reads "nothing overdue" whatever date the demo is opened on, which is the same
  // property `amountSetAside` is protecting. A demo that greets a visitor with a penalty warning
  // would be showing them the feature working against the one person it is meant to reassure.
  const perQuarter = Math.round(computeSafeHarborFromEntries(ratedEntries, taxProfile, year).perQuarter);
  const paidQuarters = summarizeQuarterlyPayments(perQuarter, undefined, year)
    .quarters.filter((quarter) => quarter.isPast)
    .reduce<QuarterlyPayments>((acc, quarter) => ({ ...acc, [quarter.key]: perQuarter }), {});

  return {
    localUserProfile: {
      id: "demo-user",
      displayName: "Maya Rodriguez",
      email: "maya.rodriguez@example.com",
      createdAt: `${year}-01-05T10:00:00.000Z`,
    },
    taxProfile: {
      ...taxProfile,
      amountSetAsideByYear: { [year]: amountSetAside },
      estimatedPaymentsByYear: { [year]: paidQuarters },
    },
    entries: ratedEntries,
    appSettings: {
      appLockEnabled: false,
      // Deliberately omitted: `colorScheme`. The theme is the visitor's own preference and lives
      // outside this data (ThemeProvider, since 1.2.0.2) — a demo that flipped someone's app to dark
      // would be reaching outside its sandbox in the most visible way possible.
      //
      // Reminders are off because demo mode must not imply real scheduled notifications. The
      // scheduling call sites are separately prevented from firing in demo (1.2.1.3); this is the
      // matching state, so the Settings toggle doesn't read "on" while nothing is scheduled.
      remindersEnabled: false,
    },
  };
}

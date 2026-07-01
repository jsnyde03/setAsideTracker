import { describe, expect, it } from "vitest";
import { buildTaxSummaryHtml } from "../taxSummaryHtml";
import { buildMileageLog, buildScheduleCSummary } from "../scheduleC";
import { computeSafeHarbor, computeTaxEstimate } from "../calculations";
import type { Entry, TaxProfile } from "../types";

const YEAR = 2026;

const profile: TaxProfile = {
  filingStatus: "single",
  dependents: 0,
  hasW2Job: false,
  state: "TX", // no state income tax — keeps the fixture simple
};

const entries: Entry[] = [
  {
    id: "a",
    platform: "doordash",
    date: "2026-02-10",
    grossPay: 5000,
    tips: 500,
    mileage: 1200,
    expenses: { parking: 20, tolls: 15, supplies: 60, phone: 40 },
    createdAt: "2026-02-10T00:00:00.000Z",
  },
  {
    id: "b",
    platform: "uber",
    date: "2026-05-01",
    grossPay: 3000,
    tips: 0,
    mileage: 800,
    expenses: { parking: 0, tolls: 5, supplies: 0, phone: 40 },
    createdAt: "2026-05-01T00:00:00.000Z",
  },
];

function buildHtml(over: Partial<Parameters<typeof buildTaxSummaryHtml>[0]> = {}) {
  const estimate = computeTaxEstimate(entries, profile, YEAR);
  const scheduleC = buildScheduleCSummary(entries, estimate.estimate.mileageDeduction.deductionAmount);
  return buildTaxSummaryHtml({
    preparedFor: "Jordan Rivera",
    year: YEAR,
    filingStatusLabel: "Single",
    locationLabel: "TX",
    generatedOn: "June 30, 2026",
    scheduleC,
    estimate,
    mileageLog: buildMileageLog(entries),
    safeHarbor: computeSafeHarbor(estimate, profile),
    ...over,
  });
}

describe("buildTaxSummaryHtml", () => {
  it("includes the headline, Schedule C, and the set-aside amount", () => {
    const html = buildHtml();
    expect(html).toContain("Tax-Ready Summary — 2026");
    expect(html).toContain("Schedule C");
    expect(html).toContain("Self-employment tax");
    expect(html).toContain("Estimated amount to set aside");

    const estimate = computeTaxEstimate(entries, profile, YEAR);
    const setAside = estimate.netAmountToSetAside.toLocaleString("en-US", { style: "currency", currency: "USD" });
    expect(html).toContain(setAside);
  });

  it("escapes user-provided text (the display name)", () => {
    const html = buildHtml({ preparedFor: "<b>Jo</b> & Co" });
    expect(html).toContain("&lt;b&gt;Jo&lt;/b&gt; &amp; Co");
    expect(html).not.toContain("<b>Jo</b>");
  });

  it("renders Line 27 with an escaped per-category breakdown when custom expenses exist", () => {
    const withCustom: Entry[] = [
      { ...entries[0], customExpenses: [{ label: "Car wash", amount: 30 }, { label: "Hot bags <x>", amount: 50 }] },
      entries[1],
    ];
    const estimate = computeTaxEstimate(withCustom, profile, YEAR);
    const scheduleC = buildScheduleCSummary(withCustom, estimate.estimate.mileageDeduction.deductionAmount);
    const html = buildTaxSummaryHtml({
      preparedFor: "Jordan",
      year: YEAR,
      filingStatusLabel: "Single",
      locationLabel: "TX",
      generatedOn: "June 30, 2026",
      scheduleC,
      estimate,
      mileageLog: buildMileageLog(withCustom),
      safeHarbor: computeSafeHarbor(estimate, profile),
    });
    expect(html).toContain("Line 27 — Other expenses");
    expect(html).toContain("Car wash");
    // The category label is user-provided free text, so it must be HTML-escaped in the breakdown.
    expect(html).toContain("Hot bags &lt;x&gt;");
    expect(html).not.toContain("Hot bags <x>");
  });

  it("omits Line 27 when there are no custom expenses", () => {
    expect(buildHtml()).not.toContain("Line 27");
  });

  it("renders a mileage-log appendix listing each trip, escaping user free text", () => {
    const withLog: Entry[] = [
      {
        ...entries[0],
        mileageLog: {
          purpose: "Deliveries, downtown <zone>",
          startLocation: "Home",
          endLocation: "Warehouse",
        },
      },
      entries[1], // no log details — should still appear, with platform fallback + dash route
    ];
    const estimate = computeTaxEstimate(withLog, profile, YEAR);
    const scheduleC = buildScheduleCSummary(withLog, estimate.estimate.mileageDeduction.deductionAmount);
    const html = buildTaxSummaryHtml({
      preparedFor: "Jordan",
      year: YEAR,
      filingStatusLabel: "Single",
      locationLabel: "TX",
      generatedOn: "June 30, 2026",
      scheduleC,
      estimate,
      mileageLog: buildMileageLog(withLog),
      safeHarbor: computeSafeHarbor(estimate, profile),
    });
    expect(html).toContain("Mileage Log — Schedule C Line 9 Substantiation");
    // Free text is HTML-escaped.
    expect(html).toContain("Deliveries, downtown &lt;zone&gt;");
    expect(html).not.toContain("downtown <zone>");
    expect(html).toContain("Home &rarr; Warehouse");
    // The detail-less trip still appears with its platform label as context.
    expect(html).toContain("Uber");
    // Total reconciles with the two entries' miles (1200 + 800).
    expect(html).toContain("Total business miles");
    expect(html).toContain("2,000");
  });

  it("omits the mileage-log appendix when no entry has business miles", () => {
    const noMiles: Entry[] = [{ ...entries[0], mileage: 0 }, { ...entries[1], mileage: 0 }];
    const estimate = computeTaxEstimate(noMiles, profile, YEAR);
    const scheduleC = buildScheduleCSummary(noMiles, estimate.estimate.mileageDeduction.deductionAmount);
    const html = buildTaxSummaryHtml({
      preparedFor: "Jordan",
      year: YEAR,
      filingStatusLabel: "Single",
      locationLabel: "TX",
      generatedOn: "June 30, 2026",
      scheduleC,
      estimate,
      mileageLog: buildMileageLog(noMiles),
      safeHarbor: computeSafeHarbor(estimate, profile),
    });
    expect(html).not.toContain("Mileage Log");
  });

  it("shows the fallback-config warning only when the estimate used a fallback year", () => {
    const real = buildHtml();
    expect(real).not.toContain("weren't finalized");

    // 2099 has no tax-year config, so the estimate falls back and the warning must appear.
    const estimate2099 = computeTaxEstimate(entries, profile, 2099);
    const scheduleC = buildScheduleCSummary(entries, estimate2099.estimate.mileageDeduction.deductionAmount);
    const html = buildTaxSummaryHtml({
      preparedFor: "Jordan",
      year: 2099,
      filingStatusLabel: "Single",
      locationLabel: "TX",
      generatedOn: "June 30, 2099",
      scheduleC,
      estimate: estimate2099,
      mileageLog: buildMileageLog(entries),
      safeHarbor: computeSafeHarbor(estimate2099, profile),
    });
    expect(html).toContain("weren't finalized");
  });
});

describe("buildTaxSummaryHtml — safe-harbor section", () => {
  function htmlFor(testEntries: Entry[], testProfile: TaxProfile) {
    const estimate = computeTaxEstimate(testEntries, testProfile, YEAR);
    const scheduleC = buildScheduleCSummary(testEntries, estimate.estimate.mileageDeduction.deductionAmount);
    return buildTaxSummaryHtml({
      preparedFor: "Jordan",
      year: YEAR,
      filingStatusLabel: "Single",
      locationLabel: "TX",
      generatedOn: "June 30, 2026",
      scheduleC,
      estimate,
      mileageLog: buildMileageLog(testEntries),
      safeHarbor: computeSafeHarbor(estimate, testProfile),
    });
  }

  const bigEntry: Entry = {
    id: "big",
    platform: "doordash",
    date: "2026-02-10",
    grossPay: 60000,
    tips: 0,
    mileage: 0,
    expenses: { parking: 0, tolls: 0, supplies: 0, phone: 0 },
    createdAt: "2026-02-10T00:00:00.000Z",
  };

  it("renders the pay-in table, quarterly figure, and prior-year prompt when a penalty is possible", () => {
    const html = htmlFor([bigEntry], profile); // no prior-year figure, no W2 withholding
    expect(html).toContain("Safe Harbor — Federal Underpayment Penalty");
    expect(html).toContain("90% of this year's federal tax — binding"); // current-year leg binds
    expect(html).toContain("Required annual payment");
    expect(html).toContain("Estimated payments to make");
    expect(html).toContain("per quarter");
    // With no prior-year figure the prior-year leg is unknown and the section prompts for it.
    expect(html).toContain("— not provided");
    expect(html).toContain("Enter last year's federal total tax");
  });

  it("marks the prior-year leg as binding when it's the smaller one", () => {
    const withPrior: TaxProfile = { ...profile, filedTaxByYear: { [YEAR - 1]: { totalTax: 500 } } };
    const html = htmlFor([bigEntry], withPrior);
    // 100% of last year's $500 is far below 90% of this year's tax, so it binds.
    expect(html).toContain("100% of last year's federal tax — binding");
    expect(html).toContain("$500");
    expect(html).not.toContain("— not provided");
  });

  it("shows the de-minimis no-penalty note instead of the table for a small tax bill", () => {
    const smallEntry: Entry = { ...bigEntry, grossPay: 2000 }; // federal tax under the $1,000 floor
    const html = htmlFor([smallEntry], profile);
    expect(html).toContain("Safe Harbor — Federal Underpayment Penalty");
    expect(html).toContain("no underpayment penalty applies");
    expect(html).not.toContain("Required annual payment");
  });
});

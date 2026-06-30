import { describe, expect, it } from "vitest";
import { buildTaxSummaryHtml } from "../taxSummaryHtml";
import { buildScheduleCSummary } from "../scheduleC";
import { computeTaxEstimate } from "../calculations";
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
    });
    expect(html).toContain("weren't finalized");
  });
});

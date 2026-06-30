import type { TaxEstimateForYear } from "./calculations";
import type { ScheduleCSummary } from "./scheduleC";

export interface TaxSummaryData {
  /** Who the report is for (the user's display name). */
  preparedFor: string;
  year: number;
  /** Human-readable filing status, e.g. "Head of Household". */
  filingStatusLabel: string;
  /** State (+ county) line, e.g. "CA" or "MD · Montgomery". */
  locationLabel: string;
  /** Human-readable generation date, e.g. "June 30, 2026". */
  generatedOn: string;
  scheduleC: ScheduleCSummary;
  estimate: TaxEstimateForYear;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Escapes the few characters that matter in HTML text/attribute context. The only user-provided
 * string here is the display name; everything else is numbers/fixed labels. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, amount: number, opts: { strong?: boolean; negative?: boolean } = {}): string {
  const cls = [opts.strong ? "strong" : "", opts.negative ? "neg" : ""].filter(Boolean).join(" ");
  const value = opts.negative ? `(${formatCurrency(amount)})` : formatCurrency(amount);
  return `<tr class="${cls}"><td>${label}</td><td class="num">${value}</td></tr>`;
}

/** Indented breakdown row under Line 27 — the label is user-provided free text, so it's escaped. */
function subRow(label: string, amount: number): string {
  return `<tr class="sub"><td>${escapeHtml(label)}</td><td class="num">${formatCurrency(amount)}</td></tr>`;
}

/**
 * Builds the self-contained HTML for the tax-ready summary PDF. Pure (string in, string out) so it's
 * unit-testable without expo-print; the native render/share lives in taxSummaryPdf.ts. The estimate
 * breakdown is composed to reconcile exactly with the engine's `totalEstimatedTax`
 * (seTax + federalIncomeTax-after-nonrefundable-CTC + state/local − refundable CTC).
 */
export function buildTaxSummaryHtml(data: TaxSummaryData): string {
  const { estimate, scheduleC } = data;
  const e = estimate.estimate;
  const federalAfterCredit = e.federalIncomeTax.incomeTax - e.childTaxCredit.nonrefundableCredit;
  const refundableCredit = e.childTaxCredit.refundableCredit;
  const withholdingCredit = estimate.w2WithholdingYtdEstimate;
  const mileage = e.mileageDeduction;

  // Render the Line 27 "Other expenses" per-category breakdown as indented sub-rows directly under
  // that line — the audit-ready substantiation of what the lumped Line 27 total is made of.
  const expenseRows = scheduleC.expenseLines
    .map((line) => {
      const lineRow = row(`Line ${line.line} — ${line.label}`, line.amount);
      if (line.line !== "27") return lineRow;
      return lineRow + scheduleC.otherExpenses.map((o) => subRow(o.label, o.amount)).join("");
    })
    .join("");

  const taxRows = [
    row("Self-employment tax", e.seTax.totalSeTax),
    row("Federal income tax (after Child Tax Credit)", federalAfterCredit),
    row("State &amp; local tax", e.stateTax.stateTax),
    refundableCredit > 0 ? row("Less: refundable Child Tax Credit", refundableCredit, { negative: true }) : "",
    row("Total estimated tax", e.totalEstimatedTax, { strong: true }),
    withholdingCredit > 0 ? row("Less: estimated W-2 withholding credit", withholdingCredit, { negative: true }) : "",
  ].join("");

  const fallbackWarning = estimate.usedFallbackConfig
    ? `<p class="warn">Note: official ${data.year} tax figures weren't finalized when this was generated, so the nearest available tax-year rates were used. Treat as an estimate.</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #13161B; margin: 0; padding: 32px; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  h2 { font-size: 14px; margin: 28px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #0F5FE0; color: #0F5FE0; }
  .meta { color: #5B6270; font-size: 12px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 0; border-bottom: 1px solid #EEF0F3; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tr.strong td { font-weight: 700; border-bottom: 2px solid #E4E7EC; }
  tr.neg td.num { color: #0E8F5E; }
  tr.sub td { padding: 3px 0; border-bottom: none; color: #5B6270; font-size: 12px; }
  tr.sub td:first-child { padding-left: 18px; }
  .setaside { margin-top: 16px; background: #E8F0FE; border-radius: 10px; padding: 16px; }
  .setaside .label { font-size: 12px; color: #5B6270; }
  .setaside .value { font-size: 26px; font-weight: 800; color: #0F5FE0; }
  .note { color: #9AA1AC; font-size: 11px; margin-top: 4px; }
  .warn { background: #FFF8E8; border: 1px solid #F0DDA0; border-radius: 8px; padding: 10px; color: #8a6d0b; font-size: 12px; }
  .disclaimer { margin-top: 28px; color: #9AA1AC; font-size: 11px; line-height: 1.5; }
</style>
</head>
<body>
  <h1>Tax-Ready Summary — ${data.year}</h1>
  <div class="meta">Prepared for ${escapeHtml(data.preparedFor)}</div>
  <div class="meta">${escapeHtml(data.filingStatusLabel)} · ${escapeHtml(data.locationLabel)}</div>
  <div class="meta">Generated ${escapeHtml(data.generatedOn)} by SetAside Tracker</div>

  ${fallbackWarning}

  <h2>Schedule C — Profit or Loss From Business</h2>
  <table>
    ${row("Line 1 — Gross receipts (earnings + tips)", scheduleC.grossReceipts)}
    ${expenseRows}
    ${row("Line 28 — Total expenses", scheduleC.totalExpenses, { strong: true })}
    ${row("Line 31 — Net profit or (loss)", scheduleC.netProfit, { strong: true })}
  </table>
  <p class="note">Car &amp; truck (Line 9) uses the standard mileage rate: ${mileage.miles.toLocaleString("en-US")} business miles × ${formatCurrency(mileage.ratePerMile)}/mi = ${formatCurrency(mileage.deductionAmount)}, plus any parking and tolls.</p>

  <h2>Estimated Taxes — ${data.year}</h2>
  <table>
    ${taxRows}
  </table>

  <div class="setaside">
    <div class="label">Estimated amount to set aside</div>
    <div class="value">${formatCurrency(estimate.netAmountToSetAside)}</div>
    <div class="note">Total estimated tax${withholdingCredit > 0 ? ", net of estimated W-2 withholding already covering part of it" : ""}.</div>
  </div>

  <p class="disclaimer">
    This summary is generated from the entries you logged in SetAside Tracker and is an estimate to
    help you prepare — it is not tax advice and not an official IRS form. Figures may differ from your
    filed return. Review with a qualified tax professional before filing.
  </p>
</body>
</html>`;
}

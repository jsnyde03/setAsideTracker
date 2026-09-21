/**
 * Fails when the tax-year configs have drifted out of review, or when the current calendar year
 * has no config at all.
 *
 * ## Why this exists
 *
 * Georgia raised its dependent exemption $4,000 → $5,000 effective TY2026 and **nothing in this
 * repo noticed**. It was found by a web search on 2026-09-21, during an audit of something else.
 * The 2026 config file already carried the line *"MUST be reviewed and updated for each new tax
 * year"* at the top — prose that had been true, sat there the whole time, and changed nothing,
 * because nothing could read it.
 *
 * ⚠️ **Tax figures change MID-YEAR, not only at year boundaries.** A once-a-year review keyed to
 * January would have missed Georgia by months. Hence a rolling window rather than a calendar check.
 *
 * ## What it can and cannot do
 *
 * It cannot know tax law, so it cannot tell you a figure is wrong. All it can enforce is that a
 * human looked recently, and that the year the app is actually computing has real figures behind
 * it rather than a silent fallback. That is a much weaker claim than "correct" — and it is the
 * strongest claim a repo can make on its own.
 *
 * Usage:  node scripts/staleness-audit.mjs
 */
import { taxYearConfigs, currentTaxYear } from "../dist/index.js";

/** Review cadence. Six months means a mid-year statutory change is caught within one window. */
const MAX_REVIEW_AGE_MONTHS = 6;

const now = new Date();
const currentYear = now.getFullYear();
const failures = [];
const warnings = [];

const years = Object.keys(taxYearConfigs).map(Number).sort();
console.log(`Tax-year configs present: ${years.join(", ")}`);
console.log(`Today: ${now.toISOString().slice(0, 10)} · current tax year in code: ${currentTaxYear.year}\n`);

// 1. The year the app is computing must have its own config. Without one, `taxYearConfigs[year] ??
//    currentTaxYear` silently falls back to a DIFFERENT year's figures. The UI does flag it via
//    usedFallbackConfig, but by then a wrong number is already on screen.
if (!taxYearConfigs[currentYear]) {
  failures.push(
    `No config for ${currentYear}. The engine will fall back to ${currentTaxYear.year}'s figures — ` +
      `wrong brackets, wrong standard deduction, wrong mileage rate, for every user.`
  );
} else {
  console.log(`✅ ${currentYear} has its own config (no silent fallback).`);
}

// 2. Every config declares when it was last checked, and against what.
for (const year of years) {
  const config = taxYearConfigs[year];
  const reviewedOn = config.reviewedOn;

  if (!reviewedOn || Number.isNaN(Date.parse(reviewedOn))) {
    failures.push(`${year}: reviewedOn is missing or not a valid ISO date (got ${JSON.stringify(reviewedOn)}).`);
    continue;
  }

  const ageMonths = (now.getTime() - Date.parse(reviewedOn)) / (1000 * 60 * 60 * 24 * 30.44);
  const age = ageMonths.toFixed(1);

  // Only the years still in play need to be fresh. A closed year's figures are settled history —
  // holding them to a rolling window would fail the build forever for no benefit.
  const isLive = year >= currentYear;

  if (!isLive) {
    console.log(`   ${year}: reviewed ${reviewedOn} (${age} months ago) — closed year, not gated.`);
  } else if (ageMonths > MAX_REVIEW_AGE_MONTHS) {
    failures.push(
      `${year}: last reviewed ${reviewedOn}, ${age} months ago (limit ${MAX_REVIEW_AGE_MONTHS}). ` +
        `Re-check the figures against the sources cited in taxYears/${year}.ts, then bump reviewedOn.`
    );
  } else {
    console.log(`✅ ${year}: reviewed ${reviewedOn} (${age} months ago) — within ${MAX_REVIEW_AGE_MONTHS} months.`);
  }
}

// 3. A config for next year is worth having before January, not during it.
const nextYear = currentYear + 1;
if (now.getMonth() >= 9 && !taxYearConfigs[nextYear]) {
  warnings.push(
    `It is Q4 and there is no ${nextYear} config yet. New-year figures publish in the autumn ` +
      `(IRS Rev. Proc., SSA COLA) — adding it before 1 January avoids shipping a fallback.`
  );
}

for (const w of warnings) console.log(`\n⚠️  ${w}`);

if (failures.length > 0) {
  console.log(`\n⛔ STALENESS CHECK FAILED (${failures.length}):`);
  for (const f of failures) console.log(`   • ${f}`);
  console.log(
    `\n⚠️  Bump reviewedOn ONLY after actually re-checking the figures. A date newer than the last ` +
      `real review turns a loud, correct failure into silent, false confidence — strictly worse ` +
      `than leaving it stale.`
  );
  process.exit(1);
}

console.log("\n✅ Staleness check passed.");

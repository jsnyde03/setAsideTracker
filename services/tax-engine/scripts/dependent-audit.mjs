/**
 * Inventory of how every state config handles DEPENDENTS, for both tax years.
 *
 * ## Why this exists
 *
 * The 2026-09-20 gap scan found GA, SC and MN modelling dependent *exemptions* (subtractions from
 * income) as dollar-for-dollar tax *credits* — a $40k Georgia filer with two dependents was told
 * $0 state tax instead of ~$891. It found exactly three states because exactly three were looked
 * at, spotted by eye because their numbers were two orders of magnitude larger than the real
 * credits. That heuristic catches a state whose exemption is large and silently passes one whose
 * exemption happens to look credit-sized, or which omits the mechanism entirely.
 *
 * ⚠️ **Hand-built lists of affected sites undercount every time they are measured.** So the list
 * comes from the configs themselves, not from reading them.
 *
 * ## What it can and cannot tell you
 *
 * It reports what the code DOES. It cannot know what each state's law SAYS — that needs a statute,
 * per state, and is the slow half of the work. What it gives you is the shortlist to check and a
 * regression alarm: run it after any config edit and diff the output.
 *
 * Usage:  node scripts/dependent-audit.mjs
 */
import { taxYear2026 } from "../dist/taxYears/2026.js";
import { taxYear2025 } from "../dist/taxYears/2025.js";

/** A per-dependent CREDIT larger than this is almost certainly a misfiled exemption. The real
 *  modelled credits are AR $29, DE $110, NE $176, OR $256 — nothing legitimately approaches $1,000. */
const CREDIT_SANITY_CEILING = 1000;

function inventory(config, year) {
  const taxing = [];
  const noTax = [];

  for (const [code, c] of Object.entries(config.stateTaxConfigs)) {
    if (c.type === "none") {
      noTax.push(code);
      continue;
    }
    taxing.push({
      code,
      type: c.type,
      standardDeduction: c.standardDeduction?.single,
      perDependentExemption: c.exemption?.perDependent,
      perDependentCredit: c.credit?.perDependent,
      perFilerCredit: c.credit?.perFiler?.single,
    });
  }

  const exemption = taxing.filter((s) => s.perDependentExemption !== undefined);
  const credit = taxing.filter((s) => s.perDependentCredit !== undefined);
  const neither = taxing.filter(
    (s) => s.perDependentExemption === undefined && s.perDependentCredit === undefined
  );
  const suspicious = credit.filter((s) => s.perDependentCredit >= CREDIT_SANITY_CEILING);

  console.log(`\n${"=".repeat(78)}\nTAX YEAR ${year}`);
  console.log(`${"=".repeat(78)}`);
  console.log(
    `${taxing.length + noTax.length} configs · ${noTax.length} no-income-tax · ${taxing.length} taxing`
  );

  console.log(`\n✅ DEPENDENT EXEMPTION modelled — reduces income (${exemption.length}):`);
  console.log(
    "   " + (exemption.map((s) => `${s.code}=$${s.perDependentExemption}`).join("  ") || "(none)")
  );

  console.log(`\n✅ DEPENDENT CREDIT modelled — reduces tax owed (${credit.length}):`);
  console.log(
    "   " + (credit.map((s) => `${s.code}=$${s.perDependentCredit}`).join("  ") || "(none)")
  );

  console.log(
    `\n⚠️  NO DEPENDENT MECHANISM AT ALL (${neither.length}) — each is either genuinely absent in`
  );
  console.log(`    that state's law, or an unmodelled exemption. UNVERIFIED either way:`);
  for (let i = 0; i < neither.length; i += 13) {
    console.log("   " + neither.slice(i, i + 13).map((s) => s.code).join("  "));
  }

  if (suspicious.length) {
    console.log(
      `\n🔴 SUSPICIOUS: per-dependent CREDIT ≥ $${CREDIT_SANITY_CEILING} (${suspicious.length}).`
    );
    console.log("    A credit that size does not exist. Almost certainly a misfiled exemption:");
    for (const s of suspicious) console.log(`    ${s.code} = $${s.perDependentCredit}`);
  } else {
    console.log(`\n✅ No per-dependent credit ≥ $${CREDIT_SANITY_CEILING} — the GA/SC/MN class is clear.`);
  }

  return { taxing, exemption, credit, neither, suspicious };
}

const r2026 = inventory(taxYear2026, 2026);
const r2025 = inventory(taxYear2025, 2025);

// Cross-year drift: a state handled one way in 2025 and another in 2026 is either a real statutory
// change or a half-applied edit. Either way it should be deliberate, and it should be visible.
console.log(`\n${"=".repeat(78)}\nCROSS-YEAR DRIFT\n${"=".repeat(78)}`);
const shape = (s) =>
  s.perDependentExemption !== undefined
    ? `exemption:${s.perDependentExemption}`
    : s.perDependentCredit !== undefined
      ? `credit:${s.perDependentCredit}`
      : "none";
const by2025 = new Map(r2025.taxing.map((s) => [s.code, shape(s)]));
const drift = r2026.taxing.filter((s) => by2025.get(s.code) !== shape(s));
if (drift.length === 0) {
  console.log("None — every state handles dependents identically in both years.");
} else {
  for (const s of drift) console.log(`  ${s.code}: 2025 ${by2025.get(s.code)}  →  2026 ${shape(s)}`);
}

// Exit non-zero on the one thing that is unambiguously a bug, so this can become a CI gate (1.2.2.7)
// rather than a report nobody runs.
if (r2026.suspicious.length || r2025.suspicious.length) {
  console.log("\n⛔ FAIL: a per-dependent credit is too large to be real. See above.");
  process.exit(1);
}

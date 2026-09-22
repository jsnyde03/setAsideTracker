#!/usr/bin/env node
/**
 * Test- and gating-hygiene sweeps. `node tools/sweep-hygiene.mjs` from the repo root.
 *
 * ## Why this is a script and not a checklist
 *
 * Measured repeatedly across this portfolio: **every complete list came from a script, and every
 * short one came from a person.** These are the classes that have actually bitten v1.2, each
 * expressed as a property of the source rather than a list of things to look for — a pattern over
 * prose can only find what its author already thought of.
 *
 * ⚠️ **This REPORTS; it does not gate.** Both sweeps over-report by design (see each one's note), so
 * wiring them into CI would train people to ignore them. Run it at a sweep point — 1.2.11 is the
 * next one — and triage the output.
 *
 * ⛔ It lived in a scratchpad when it was first written, and the plan cited it as a deliverable. A
 * scratchpad does not survive the session that made it; that is why it is here.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "mobile");
const norm = (p) => p.split(sep).join("/");
const rel = (f) => norm(f).replace(norm(MOBILE) + "/", "");
const read = (f) => readFileSync(f, "utf8");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(norm(full));
  }
  return out;
}
const files = walk(MOBILE);

// ─── 1. absence assertions with no positive control ──────────────────────────────────────────────
// `toHaveCount(0)` is equally true of a page that never rendered, so an absence assertion needs
// something positive alongside it proving the screen is there. ⚠️ Over-reports: it scans backwards
// within a test body, so a control living in a helper, or asserted after the absence, reads as
// missing. Triage, don't obey.
console.log("### absence assertions with no positive control in the same test");
let flagged = 0;
for (const file of files.filter((f) => f.includes("/e2e/"))) {
  let sawPositive = false;
  read(file).split("\n").forEach((line, i) => {
    if (/\b(test|it)\s*\(/.test(line)) sawPositive = false;
    if (line.includes("toBeVisible()") || line.includes("toHaveValue(")) sawPositive = true;
    const isComment = line.trim().startsWith("*") || line.trim().startsWith("//");
    if (line.includes("toHaveCount(0)") && !isComment && !sawPositive) {
      console.log(`  ${rel(file)}:${i + 1}  ${line.trim().slice(0, 96)}`);
      flagged++;
    }
  });
}
console.log(`  -> ${flagged} to triage\n`);

// ─── 2. premium destinations and their route guards ──────────────────────────────────────────────
// Derived from the GATE ITSELF — whatever the dashboard routes through
// `canUsePremium ? X : onOpenPaywall` is a premium destination by definition. An earlier version of
// this keyed on the string "(Premium)" in a docstring, which missed a screen whose docstring read
// "(Premium, [D20])" and falsely flagged two free ones. Derive from the mechanism, never the prose.
console.log("### premium destinations, and what guards their routes");
const dashboard = read(join(MOBILE, "src", "screens", "DashboardScreen.tsx"));
const index = read(join(MOBILE, "app", "index.tsx"));
const handlers = [...new Set([...dashboard.matchAll(/canUsePremium \? (on\w+) : onOpenPaywall/g)].map((m) => m[1]))];
for (const handler of handlers) {
  const routed = new RegExp(`${handler}=\\{\\(\\) => router\\.push\\("([^"]+)"\\)`).exec(index);
  const route = routed ? routed[1] : "(not routed from index)";
  let guards = "FILE NOT FOUND";
  try {
    guards = [...read(join(MOBILE, "app", `${route}.tsx`)).matchAll(/<(Require\w+)/g)].map((m) => m[1]).join(", ") || "NONE";
  } catch {}
  console.log(`  ${handler.padEnd(24)} ${route.padEnd(22)} guards: ${guards}`);
}
console.log("\n  ⚠️ `RequirePremium` does not exist yet — the paywall lives on the dashboard card's");
console.log("     onPress, so a deep link walks past it. Filed to the v1.2 deferred backlog.");

#!/usr/bin/env node
/**
 * Does the PUBLISHED privacy policy match the one in this repo?
 *
 * ⛔ **Why this exists.** [D16] declared `docs/privacy.html` the single privacy policy, and that was
 * true inside this repo and false in the world: the URL App Store Connect points at was served by a
 * *different* repository, and on 2026-09-22 it was **83 days stale** — dated July 1 and never
 * mentioning location, while the canonical file had disclosed location capture since 1.2.5 landed
 * the mileage tracker. `privacyClaimsAgree.test.ts` was green throughout, because the published copy
 * was not a file it could read.
 *
 * ⚠️ **The drift did not come back because someone was careless. It came back because the check
 * could not see the thing that mattered.** This one looks at the live URL.
 *
 * Not a vitest gate: it needs the network, and a unit suite that reaches the internet fails for
 * reasons that have nothing to do with the code. Run it **at submission**, and in any release
 * workflow, where a network call is already the point.
 *
 *   node tools/check-published-policy.mjs
 *
 * Exit 0 = the published policy matches. Exit 1 = it does not, and the app is about to describe its
 * data practices to Apple with a document that says something else.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = join(REPO, "docs", "privacy.html");
const PUBLISHED = "https://jsnyde03.github.io/setAsideTracker/privacy.html";

/** Compare meaning, not bytes: whitespace and line endings differ between a repo file and a CDN. */
function normalize(html) {
  return html.replace(/\s+/g, " ").trim();
}

/** The claims that must never be missing, each one a thing the app actually does. */
const REQUIRED_CLAIMS = [
  { label: "location disclosure", pattern: /location/i },
  { label: "last-updated line", pattern: /last updated/i },
];

const local = readFileSync(LOCAL, "utf8");

const response = await fetch(PUBLISHED, { redirect: "follow" });
if (!response.ok) {
  console.error(`✗ ${PUBLISHED} returned ${response.status}`);
  console.error("  The privacy policy URL in App Store Connect must resolve. Fix before submitting.");
  process.exit(1);
}
const published = await response.text();

let failed = false;

// 1. Every claim the local policy makes must also be on the published page. Checked by name so the
//    failure says WHICH claim is missing, not merely that two documents differ.
for (const { label, pattern } of REQUIRED_CLAIMS) {
  const inLocal = pattern.test(local);
  const inPublished = pattern.test(published);
  if (inLocal && !inPublished) {
    console.error(`✗ published policy is missing the ${label} that docs/privacy.html carries`);
    failed = true;
  }
}

// 2. And the documents must actually be the same one. The named checks above catch the failure we
//    have already had; this catches the ones we have not thought of.
if (normalize(local) !== normalize(published)) {
  const localDate = local.match(/Last updated:[^<]{0,30}/i)?.[0] ?? "unknown";
  const publishedDate = published.match(/Last updated:[^<]{0,30}/i)?.[0] ?? "unknown";
  console.error("✗ published policy differs from docs/privacy.html");
  console.error(`    repo:      ${localDate.trim()}`);
  console.error(`    published: ${publishedDate.trim()}`);
  console.error(`    ${PUBLISHED}`);
  console.error("  Pages serves `master`:/docs — merge the policy to master before submitting.");
  failed = true;
}

if (failed) process.exit(1);
console.log(`✓ published policy matches docs/privacy.html — ${PUBLISHED}`);

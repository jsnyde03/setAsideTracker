import { readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The privacy policy is enforced here, not merely restated.
 *
 * `docs/privacy.html` promises that analytics "never sends the amounts you enter, your tax figures,
 * your name, or your email", and since [D22] that it does not send the user's state either. Those
 * are claims about **every future call site**, which is exactly the shape of thing a review cannot
 * hold and a gate can. A new `trackEvent` three months from now is the failure mode; this fails it.
 *
 * ⚠️ **Structural, not a word list.** It reads the property KEYS actually passed to `trackEvent`
 * rather than grepping for suspicious-looking strings, so it cannot be fooled by a synonym — a key
 * it has never heard of still gets compared against the allow-list and still fails.
 */

const APP_ROOT = join(__dirname, "..", "..");
const norm = (p: string) => p.split(sep).join("/");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(norm(full));
  }
  return out;
}

/**
 * Every property key the codebase attaches to an analytics event. Deliberately permissive about
 * WHERE it looks (any `trackEvent(...)` with an object argument) and strict about what it finds.
 */
function analyticsPropertyKeys(): { file: string; key: string }[] {
  const found: { file: string; key: string }[] = [];
  for (const dir of ["src", "app"]) {
    for (const file of sourceFiles(join(APP_ROOT, dir))) {
      const source = readFileSync(file, "utf8");
      for (const call of source.matchAll(/trackEvent\([^,)]*,\s*\{([^}]*)\}/gs)) {
        for (const key of call[1].matchAll(/(?:^|\n)\s*(?:\/\/[^\n]*\n\s*)*([A-Za-z_$][\w$]*)\s*:/g)) {
          found.push({ file: file.replace(norm(APP_ROOT) + "/", ""), key: key[1] });
        }
      }
    }
  }
  return found;
}

/**
 * What analytics is allowed to carry, and nothing else. Adding a key here is a deliberate act that
 * shows up in review — which is the point. Anything added to an event without being added here
 * fails, including fields nobody thought to forbid.
 */
const ALLOWED_KEYS = new Set(["hasW2Job", "platform", "plan", "restored"]);

describe("analytics carries only what the privacy policy says it carries", () => {
  it("finds the call sites at all", () => {
    // The control. Every assertion below is vacuously true if the scan returns nothing — which is
    // exactly what a broken regex would do, silently, forever.
    expect(analyticsPropertyKeys().length).toBeGreaterThan(0);
  });

  it("sends no property outside the allow-list", () => {
    const offenders = analyticsPropertyKeys().filter(({ key }) => !ALLOWED_KEYS.has(key));
    expect(
      offenders,
      `analytics property not in the allow-list: ${offenders.map((o) => `${o.key} (${o.file})`).join(", ")}`
    ).toEqual([]);
  });

  it("never sends the user's state ([D22]), name, email or any amount", () => {
    // Named explicitly as well as covered by the allow-list, because these are the specific claims
    // the published policy makes — if one ever regresses the failure should say which promise broke.
    const forbidden = ["state", "county", "name", "email", "grossPay", "tips", "amount", "earnings"];
    const keys = analyticsPropertyKeys();
    for (const bad of forbidden) {
      const hit = keys.find(({ key }) => key.toLowerCase() === bad.toLowerCase());
      expect(hit, `the privacy policy says analytics never sends "${bad}" — ${hit?.file}`).toBeUndefined();
    }
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * [D16] says one claim lives in three places — the privacy **policy**, the App Store Connect
 * **labels**, and `app.json` — and that they must move together. This is that rule as a gate.
 *
 * ⛔ **It exists because the rule caught its own author twice in one day.** 1.2.10.1 wrote a privacy
 * manifest declaring three data types while the App Store labels declared **four** — Performance
 * Data was simply missed — and it left `STORE_LISTING.md` still claiming analytics sends a state
 * code an hour after [D22] stopped sending one. Both were found by reading the three documents side
 * by side, which is exactly the review nobody reliably performs twice.
 *
 * ⚠️ **Two structured sources, compared to each other.** The policy is prose and is not asserted on
 * here beyond a couple of load-bearing phrases; the manifest and the store listing's table both have
 * shape, so they can be compared exactly.
 */

const REPO = join(__dirname, "..", "..", "..", "..");
const APP_JSON = join(__dirname, "..", "..", "app.json");

/** The data types the shipped privacy manifest declares. */
function manifestTypes(): Set<string> {
  const config = JSON.parse(readFileSync(APP_JSON, "utf8"));
  const declared = config.expo.ios.privacyManifests.NSPrivacyCollectedDataTypes as {
    NSPrivacyCollectedDataType: string;
  }[];
  return new Set(declared.map((t) => t.NSPrivacyCollectedDataType.replace("NSPrivacyCollectedDataType", "")));
}

/** The data types the App Store Connect privacy table declares, read from its own rows. */
function storeListingTypes(): Set<string> {
  const table = readFileSync(join(REPO, "STORE_LISTING.md"), "utf8");
  const found = new Set<string>();
  for (const row of table.matchAll(/^\|\s*\*\*([^*]+)\*\*\s*\|\s*Yes\s*\|/gm)) {
    found.add(row[1].trim().replace(/\s+/g, ""));
  }
  return found;
}

describe("the privacy manifest and the App Store labels declare the same thing ([D16])", () => {
  it("finds both lists at all", () => {
    // The control: two empty sets are trivially equal, which is how this gate would rot silently.
    expect(manifestTypes().size).toBeGreaterThan(0);
    expect(storeListingTypes().size).toBeGreaterThan(0);
  });

  it("declares the same data types in both places", () => {
    const manifest = [...manifestTypes()].sort();
    const listing = [...storeListingTypes()].sort();
    expect(manifest, "privacy manifest (app.json) vs App Store labels (STORE_LISTING.md)").toEqual(listing);
  });
});

describe("no document still claims data the app stopped collecting", () => {
  const RETIRED_CLAIMS = [
    // [D22] — analytics no longer sends the user's state, and the "Location — No" App Privacy
    // answer is only honest while that stays true.
    { phrase: "a state code", why: "[D22] removed the state code from analytics" },
  ];

  it.each(["STORE_LISTING.md", "ASC_SUBMISSION_CHECKLIST.md", "docs/privacy.html"])(
    "%s makes no retired claim",
    (relativePath) => {
      const text = readFileSync(join(REPO, relativePath), "utf8");
      for (const { phrase, why } of RETIRED_CLAIMS) {
        expect(text.includes(phrase), `${relativePath} still says "${phrase}" — ${why}`).toBe(false);
      }
    }
  );
});

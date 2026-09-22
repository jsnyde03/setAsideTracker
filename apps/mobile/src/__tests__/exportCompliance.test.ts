import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `ITSAppUsesNonExemptEncryption` is absent from `app.json` **on purpose** ([D23]), and this test
 * exists because that is the kind of absence someone fixes.
 *
 * The key's only function is to **bypass** App Store Connect's export-compliance questionnaire by
 * pre-answering it. The app encrypts local data with crypto-js AES-256, and whether that is exempt
 * turns on **Note 4 to Category 5 Part 2** — the primary-function test, not on whose crypto library
 * it is. The reading that says this app qualifies (its primary function is tax *calculation*;
 * BIS lists inventory-management software as a Note 4 example) is defensible but it is a reading.
 *
 * ⛔ **So we stopped answering the question and started asking it.** With the key gone, ASC puts its
 * own questionnaire in front of the first upload, and Apple's flow produces the classification.
 * That answer then gets encoded here deliberately, with a date and a source — not guessed at by the
 * next person who notices a missing Info.plist key.
 *
 * ⚠️ **Adding it back is a legal declaration, not a config tidy-up.** If you are here because a
 * build showed "Missing Compliance" in App Store Connect: that is this working as intended — answer
 * the questionnaire in ASC, then come back and record the outcome.
 */
describe("export compliance is asked, not assumed ([D23])", () => {
  const APP_JSON = join(__dirname, "..", "..", "app.json");

  it("does not pre-answer the export-compliance question", () => {
    const raw = readFileSync(APP_JSON, "utf8");
    const config = JSON.parse(raw);

    // Asserted on the raw text as well as the parsed object: the key is meaningful anywhere under
    // ios.infoPlist, and a future config could nest it somewhere this object lookup misses.
    expect(raw).not.toContain("ITSAppUsesNonExemptEncryption");
    expect(config.expo.ios.infoPlist?.ITSAppUsesNonExemptEncryption).toBeUndefined();
  });

  it("still has the ios config it is supposed to have — the control", () => {
    // Without this, deleting the whole ios block would pass the assertion above.
    const config = JSON.parse(readFileSync(APP_JSON, "utf8"));
    expect(config.expo.ios.bundleIdentifier).toBe("com.gigtaxtracker.app");
    expect(config.expo.ios.privacyManifests).toBeDefined();
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `ITSAppUsesNonExemptEncryption: false` is in `app.json` **deliberately** ([D23] → [D30]), and this
 * test guards the value rather than the key's presence.
 *
 * ## What it does and why it is here
 *
 * The key pre-answers App Store Connect's export-compliance questionnaire, so an uploaded build is
 * **immediately installable** instead of sitting in *"Missing Compliance"* until somebody clicks
 * through a form. That manual step is what [D30] removes (Jason 2026-09-26: *"builds testable
 * immediately"*).
 *
 * ## ⛔ This is a legal declaration, not a config convenience
 *
 * The app encrypts local data with **crypto-js AES-256**, so the exemption does not rest on "we only
 * use Apple's crypto". It rests on **Note 4 to Category 5 Part 2** — the *primary-function* test. The
 * reading is that this app's primary function is tax **calculation**, with encryption incidental to
 * protecting local data, and BIS lists inventory-management software as a Note 4 example. ⚠️ **That
 * is a reading, and [D23] existed precisely because being wrong about a category is an App Store
 * rejection.**
 *
 * ## What changed between [D23] and [D30]
 *
 * [D23] removed the key so **Apple's own flow** would produce the classification rather than us
 * guessing — *"we stopped answering the question and started asking it"*. [D30] records the answer
 * and stops asking every time, which is the ending [D23] was written to reach.
 *
 * ⚠️ **UNCONFIRMED AT TIME OF WRITING:** what App Store Connect's questionnaire concluded on the
 * 2026-09-25 build has not been recorded here yet. **If Apple's flow said anything other than
 * "exempt", this file and `app.json` are both wrong and must change together.** Recorded as an open
 * hole rather than written as if it were settled.
 *
 * ## If you are here because something failed
 *
 * ⛔ **Do not "fix" this by deleting the key.** That reinstates a manual ASC step on every build. And
 * do not flip it to `true` without an exemption code — `true` requires
 * `ITSEncryptionExportComplianceCode` from a granted CCATS/ERN, which this project does not have.
 */
describe("export compliance is pre-answered, and the answer is recorded ([D30])", () => {
  const APP_JSON = join(__dirname, "..", "..", "app.json");
  const raw = () => readFileSync(APP_JSON, "utf8");

  it("declares the app exempt, so a build is installable the moment it uploads", () => {
    const infoPlist = JSON.parse(raw()).expo.ios.infoPlist;
    // `toBe(false)` and not `toBeFalsy()`: an absent key is falsy, and absent is the old behaviour
    // this replaced — the whole point is that a specific value is present.
    expect(infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  /**
   * ⛔ **`true` is the dangerous neighbour, so it is named.** Flipping the value is a one-character
   * edit that looks like a correction and would put every build back behind a questionnaire it cannot
   * answer — `true` requires an `ITSEncryptionExportComplianceCode` from a granted CCATS/ERN.
   */
  it("never claims NON-exempt encryption without an exemption code", () => {
    const infoPlist = JSON.parse(raw()).expo.ios.infoPlist;
    if (infoPlist.ITSAppUsesNonExemptEncryption === true) {
      expect(
        infoPlist.ITSEncryptionExportComplianceCode,
        "declared non-exempt encryption with no compliance code — every build will be rejected",
      ).toBeTruthy();
    }
  });

  it("still has the ios config it is supposed to have — the control", () => {
    // Without this, deleting the whole ios block would fail the assertions above for the wrong
    // reason, and a future refactor could "fix" them by removing the wrong thing.
    const config = JSON.parse(raw());
    expect(config.expo.ios.bundleIdentifier).toBe("com.gigtaxtracker.app");
    expect(config.expo.ios.privacyManifests).toBeDefined();
  });

  /**
   * ⚠️ The reasoning above is the point of this file, and a value with no recorded basis is how
   * [D23] got reversed by accident in the first place. If the explanation is gone, the next person
   * finds a bare boolean and treats it as a config default.
   */
  it("keeps its own reasoning, because a bare boolean invites a tidy-up", () => {
    const self = readFileSync(__filename, "utf8");
    expect(self).toContain("Note 4 to Category 5 Part 2");
    expect(self).toContain("[D30]");
  });
});

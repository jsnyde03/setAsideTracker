import { expect, test } from "@playwright/test";
import { resetAppStorage } from "./helpers";

/**
 * The recovery surface ([D12], 1.2.3.3): what a user sees when their data is on the device but
 * cannot be read.
 *
 * ⚠️ **What this can and cannot prove.** react-native-web renders no `Alert`, so the erase
 * confirmation and both failure alerts are device-owed — they are manual gates in the TestFlight
 * checklist. What runs here is the part that was actually broken: the *routing* decision. For as
 * long as `loadError` had no consumer, an unreadable device landed on **onboarding**, and these
 * assertions are the ones that would have caught it.
 *
 * Unreadable state is seeded as corrupt JSON rather than as bad ciphertext because web has no
 * keystore and stores plaintext — so the decode path reaches the same `UnreadableDataError` by the
 * route the platform actually takes.
 */
const ENTRIES_KEY = "gigTaxTracker:entries";
const PROFILE_KEY = "gigTaxTracker:localUserProfile";

async function seedUnreadableData(page: import("@playwright/test").Page) {
  await page.evaluate(
    ([entriesKey, profileKey]) => {
      localStorage.setItem(entriesKey, '{"truncated":');
      localStorage.setItem(profileKey, '{"id":"u","displayName":"Real User"}');
    },
    [ENTRIES_KEY, PROFILE_KEY]
  );
  await page.reload();
}

test.describe("unreadable data", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("shows the recovery screen instead of onboarding", async ({ page }) => {
    await seedUnreadableData(page);

    await expect(page.getByText("We couldn't open your data")).toBeVisible();

    // ⭐ The assertion that matters. A user whose data is on the device must never be greeted as a
    // new one — and must never be walked into a flow that writes over what could not be read.
    await expect(page.getByText("Welcome")).toHaveCount(0);
    await expect(page.getByLabel("Try again")).toBeVisible();
    await expect(page.getByLabel("Restore from a backup")).toBeVisible();
    await expect(page.getByLabel("Erase and start over")).toBeVisible();
  });

  test("a retry that does not help says so, and keeps the recovery routes available", async ({ page }) => {
    await seedUnreadableData(page);
    await expect(page.getByText("We couldn't open your data")).toBeVisible();

    await page.getByLabel("Try again").click();

    // The data is still corrupt, so the retry fails — the screen must say that rather than look
    // like it ignored the tap, and must not fall through to the app.
    await expect(page.getByText("Still no luck", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Restore from a backup")).toBeVisible();
  });

  test("readable data is unaffected — the gate only fires on a real failure", async ({ page }) => {
    // The control. Without it, a recovery screen that rendered unconditionally would pass the test
    // above and break the entire app, and nothing here would notice.
    await expect(page.getByText("We couldn't open your data")).toHaveCount(0);
    await expect(page.getByText("Welcome").first()).toBeVisible();
  });
});

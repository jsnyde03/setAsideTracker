import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, resetAppStorage, visible } from "./helpers";

/**
 * A setting must never show a state that was not stored (1.2.3.4).
 *
 * Until now `setRemindersEnabled`, `setAppLockEnabled` and `setScheme` set React state *before*
 * awaiting the write, and nothing rolled them back. The caller alerted — but the switch stayed where
 * the user put it, so a failed write left someone looking at an App Lock they did not have.
 *
 * ⚠️ **The failure has to be injected at the real boundary.** AsyncStorage on web is backed by
 * `localStorage`, so overriding `setItem` for the settings key is the closest thing to a disk that
 * refuses a write; a mocked repository would only test the mock. App Lock itself cannot be driven
 * here — its switch is disabled unless the device reports biometrics — so reminders stands in, and
 * the two setters are the same three lines.
 */
async function failWritesToAppSettings(page: Page) {
  await page.addInitScript(() => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      if (key === "gigTaxTracker:appSettings") throw new Error("QuotaExceededError (injected)");
      original(key, value);
    };
  });
}

test.describe("a settings write that fails", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("leaves the switch showing what is actually stored", async ({ page }) => {
    await completeOnboarding(page);
    await failWritesToAppSettings(page);
    await page.goto("/settings");

    const reminders = visible(page.getByRole("switch")).last();
    await expect(reminders).toBeVisible();
    // Reminders default to on, so this attempts to turn them OFF.
    await expect(reminders).toBeChecked();

    await reminders.click();

    // The write threw. The switch must go back to what storage still says, not sit on the value the
    // user picked — and it must still say so after a reload, which is the honest check.
    await expect(reminders).toBeChecked();
    await page.reload();
    await expect(visible(page.getByRole("switch")).last()).toBeChecked();
  });

  test("a write that succeeds still moves the switch — the control", async ({ page }) => {
    // Without this, a switch hard-wired to ignore every tap would pass the test above.
    await completeOnboarding(page);
    await page.goto("/settings");

    const reminders = visible(page.getByRole("switch")).last();
    await expect(reminders).toBeChecked();

    await reminders.click();

    await expect(reminders).not.toBeChecked();
    await page.reload();
    await expect(visible(page.getByRole("switch")).last()).not.toBeChecked();
  });
});

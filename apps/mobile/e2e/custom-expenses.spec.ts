import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * Custom expense categories are Premium-authored. On web there's no RevenueCat SDK, so the user is
 * always free — exactly the state to verify here: the entry form shows the locked
 * "Custom expense categories · Premium" row and does NOT expose the label/amount inputs. The premium
 * authoring path (section expands, rows add/remove, values persist) is covered by unit tests; the
 * locked-row → Alert → paywall hop is native-only (react-native-web's Alert is a no-op) and lives in
 * Maestro (custom-expenses-gating.yaml).
 */
test.describe("Custom expense categories gating", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("free user sees the locked Premium row, not the input fields", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();

    // The custom-categories section is present but locked behind Premium…
    await expect(page.getByText(/Custom expense categories\s+·\s+Premium/)).toBeVisible();
    // …and the premium-only authoring fields are not rendered for a free user.
    await expect(page.getByText("Add another category")).toHaveCount(0);
    await expect(page.getByText(/Category 1/)).toHaveCount(0);
  });
});

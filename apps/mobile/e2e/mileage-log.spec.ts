import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * IRS mileage-log fields are Premium-authored. On web there's no RevenueCat SDK, so the user is
 * always free — which is exactly the state to verify here: the entry form shows the locked
 * "IRS mileage log · Premium" row and does NOT expose the purpose/location inputs. The premium
 * authoring path (section expands, fields persist) is covered by unit tests; the locked-row →
 * Alert → paywall hop is native-only (react-native-web's Alert is a no-op) and lives in Maestro.
 */
test.describe("IRS mileage log gating", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("free user sees the locked Premium row, not the input fields", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();

    // The mileage-log section is present but locked behind Premium…
    await expect(page.getByText(/IRS mileage log\s+·\s+Premium/)).toBeVisible();
    // …and the premium-only authoring fields are not rendered for a free user.
    await expect(page.getByText("Business purpose")).toHaveCount(0);
    await expect(page.getByText("Start location")).toHaveCount(0);
  });
});

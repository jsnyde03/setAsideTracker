import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * What-if earnings simulator: from the dashboard, open the simulator (pre-filled with this year's
 * actuals), change the hypothetical earnings, and confirm the projected set-aside recomputes live
 * and the comparison-to-actuals updates. Pure tax-engine reuse — no persistence.
 */
test.describe("what-if simulator", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("recomputes the projected set-aside as the scenario changes", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "CA", filingStatus: "Single" });

    // Log a known entry so the simulator pre-fills from a real number.
    await page.getByText("Log Earnings", { exact: true }).click();
    await page.getByText("DoorDash", { exact: true }).click();
    await page.getByPlaceholder("0.00").first().fill("50000"); // Gross pay.
    await page.getByText("Save Entry", { exact: true }).click();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();

    // Open the simulator.
    await page.getByText("What if I earned more?").click();
    await expect(page.getByText("What if…")).toBeVisible();
    await expect(page.getByText("You'd set aside")).toBeVisible();

    // Pre-filled from the logged $50,000 entry, so the projection equals this year's actuals.
    await expect(page.getByLabel("Gig earnings")).toHaveValue("50000");
    await expect(page.getByText(/Same as your \d{4} so far/)).toBeVisible();

    // Bump earnings → projection should jump above actuals.
    await page.getByLabel("Gig earnings").fill("150000");
    await expect(page.getByText(/more than your \d{4} so far/)).toBeVisible();

    // And drop them below → projection should fall under actuals.
    await page.getByLabel("Gig earnings").fill("20000");
    await expect(page.getByText(/less than your \d{4} so far/)).toBeVisible();

    // Reset restores the logged numbers.
    await page.getByLabel(/Reset to your \d{4} numbers/).click();
    await expect(page.getByLabel("Gig earnings")).toHaveValue("50000");
  });
});

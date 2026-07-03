import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * Baseline regression for the core daily-use loop: onboard → see the dashboard → log an entry →
 * see the dashboard reflect it. This is the single most important flow in the app; if it breaks,
 * nothing else matters. Runs against the Expo-web build.
 */
test.describe("core loop", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("onboarding lands on the dashboard", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });
    await expect(page.getByText("Your earnings")).toBeVisible();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
  });

  test("logging an entry updates the dashboard", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    // AddEntry screen.
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    await page.getByPlaceholder("0.00").first().fill("120"); // Gross pay is the first 0.00 field.
    await page.getByText("Save Entry", { exact: true }).click();

    // Back on the dashboard, the new entry shows up in the list and the totals reflect it.
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
    await expect(page.getByLabel(/Edit DoorDash entry/)).toBeVisible();
    await expect(page.getByText(/\$120/).first()).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * The safe-harbor / Form 2210 calculator is Premium. On web there's no RevenueCat SDK, so the user
 * is always free — the state to verify here. The dashboard surfaces it as an "Avoid the IRS penalty
 * · Premium" card whenever there's gig tax to set aside (no W2 job required, unlike the W-4 card).
 * Like the W-4 card it navigates a free user straight to the paywall (no native Alert), so the full
 * free-user → locked-card → paywall hop is web-testable end to end. The safe-harbor math itself is
 * covered by the computeSafeHarbor unit tests.
 */
test.describe("Safe-harbor calculator gating", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("free user with gig tax sees the locked card and tapping it opens the paywall", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    await page.getByPlaceholder("0.00").first().fill("4000"); // enough gig income to owe SE tax
    await page.getByText("Save Entry", { exact: true }).click();

    // Back on the dashboard: the safe-harbor card is present but locked behind Premium.
    const card = page.getByText(/Avoid the IRS penalty\s+·\s+Premium/);
    await expect(card).toBeVisible();

    // Tapping it routes a free user straight to the paywall (no native Alert in between).
    await card.click();
    await expect(page.getByText("SetAside Premium")).toBeVisible();
    await expect(page.getByLabel("Subscribe")).toBeVisible();
  });

  test("the safe-harbor card does not show before any income is logged (no tax to set aside)", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });
    await expect(page.getByText(/No entries yet/)).toBeVisible();
    await expect(page.getByText(/Avoid the IRS penalty/)).toHaveCount(0);
  });
});

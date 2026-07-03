import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * The W-4 withholding optimizer is Premium. On web there's no RevenueCat SDK, so the user is always
 * free — the state to verify here. The dashboard surfaces the optimizer as a "Skip quarterly
 * payments · Premium" card, but only for someone who has both a W2 job and gig tax to cover. Unlike
 * the entry-form locked rows (which fire a native-only Alert), this card navigates straight to the
 * paywall, so the full free-user → locked-card → paywall hop is web-testable end to end. The actual
 * recommendation math is covered by the computeW4Optimization unit tests.
 */
test.describe("W-4 optimizer gating", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("free W2 user sees the locked card and tapping it opens the paywall", async ({ page }) => {
    // Needs a W2 job (so the card is relevant) + logged gig income (so there's tax to cover).
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single", hasW2Job: true });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    await page.getByPlaceholder("0.00").first().fill("4000"); // enough gig income to owe SE tax
    await page.getByText("Save Entry", { exact: true }).click();

    // Back on the dashboard: the optimizer card is present but locked behind Premium.
    const card = page.getByText(/Skip quarterly payments\s+·\s+Premium/);
    await expect(card).toBeVisible();

    // Tapping it routes a free user straight to the paywall (no native Alert in between).
    await card.click();
    await expect(page.getByText("SetAside Premium")).toBeVisible();
    await expect(page.getByLabel("Subscribe")).toBeVisible();
  });

  test("the optimizer card does not show for a user with no W2 job", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    await page.getByPlaceholder("0.00").first().fill("4000");
    await page.getByText("Save Entry", { exact: true }).click();

    await expect(page.getByText("Set aside for taxes")).toBeVisible();
    await expect(page.getByText(/Skip quarterly payments/)).toHaveCount(0);
  });
});

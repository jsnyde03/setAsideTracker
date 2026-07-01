import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * The expense breakdown is Premium. On web there's no RevenueCat SDK, so the user is always free —
 * the state to verify here. The dashboard surfaces it as an "Expense breakdown · Premium" card,
 * soft-gated on *data*: it only appears once the year has a deductible expense (a bucket cost or
 * business mileage), so it never shows on an empty app. Tapping the locked card routes a free user
 * straight to the paywall (no native Alert), making the whole hop web-testable. The Schedule C
 * grouping itself is covered by the buildScheduleCSummary unit tests.
 */
test.describe("Expense breakdown gating", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("free user with a deductible expense sees the locked card and tapping it opens the paywall", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    await page.getByPlaceholder("0.00").first().fill("4000"); // gross pay
    await page.getByPlaceholder("0", { exact: true }).first().fill("500"); // business miles → a Line 9 expense
    await page.getByText("Save Entry", { exact: true }).click();

    // Back on the dashboard: the breakdown card is present but locked behind Premium.
    const card = page.getByText(/Expense breakdown\s+·\s+Premium/);
    await expect(card).toBeVisible();

    // Tapping it routes a free user straight to the paywall (no native Alert in between).
    await card.click();
    await expect(page.getByText("SetAside Premium")).toBeVisible();
    await expect(page.getByLabel("Subscribe")).toBeVisible();
  });

  test("the card does not show when no deductible expense has been logged", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    await page.getByPlaceholder("0.00").first().fill("4000"); // gross pay only — no mileage or expenses
    await page.getByText("Save Entry", { exact: true }).click();

    await expect(page.getByText("Set aside for taxes")).toBeVisible();
    await expect(page.getByText(/Expense breakdown/)).toHaveCount(0);
  });
});

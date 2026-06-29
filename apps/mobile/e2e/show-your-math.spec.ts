import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * "Show your math" audit trail: each tax figure on the dashboard opens a detail sheet explaining
 * how it was calculated (AGI → standard deduction → taxable income → per-bracket tax). Logs a
 * high-income entry so the federal figure actually spans multiple brackets, then taps into the
 * detail sheets and asserts the math is shown.
 */
test.describe("show your math", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("breakdown rows open a detail sheet with the underlying math", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "CA", filingStatus: "Single" });

    // Log enough income that federal income tax is non-zero and reaches multiple brackets.
    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    await page.getByPlaceholder("0.00").first().fill("90000"); // Gross pay.
    await page.getByText("Save Entry", { exact: true }).click();

    await expect(page.getByText("Set aside for taxes")).toBeVisible();
    await expect(page.getByText("Tap any line to see how it's calculated.")).toBeVisible();

    // Federal income tax → detail sheet shows AGI, taxable income and at least one bracket line.
    await page.getByLabel(/Federal income tax:.*Tap to see how this is calculated/).click();
    await expect(page.getByText("Adjusted gross income")).toBeVisible();
    await expect(page.getByText("Taxable income")).toBeVisible();
    await expect(page.getByText("Standard deduction", { exact: true })).toBeVisible();
    // A progressive-bracket line, e.g. "10% on $9,000.00".
    await expect(page.getByText(/%\s+on\s+\$/).first()).toBeVisible();
    await page.getByLabel("Close").click();
    await expect(page.getByText("Adjusted gross income")).toBeHidden();

    // Self-employment tax → detail sheet shows the Social Security / Medicare split.
    await page.getByLabel(/Self-employment tax:.*Tap to see how this is calculated/).click();
    await expect(page.getByText("Social Security (12.4%)")).toBeVisible();
    await expect(page.getByText("Medicare (2.9%)")).toBeVisible();
    await page.getByLabel("Close").click();

    // State income tax → detail sheet shows CA taxable income and brackets.
    await page.getByLabel(/CA state income tax:.*Tap to see how this is calculated/).click();
    await expect(page.getByText("State taxable income")).toBeVisible();
    await expect(page.getByText("State & local tax")).toBeVisible();
  });
});

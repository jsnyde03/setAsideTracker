import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * Year-over-year insights is Premium. Unlike the W-4 / safe-harbor cards (gated on tax conditions),
 * this one is soft-gated on *data*: the dashboard card only appears once entries span 2+ distinct
 * tax years, so a fresh subscriber never lands on a near-empty comparison. On web there's no
 * RevenueCat SDK, so the user is always free — tapping the locked card routes straight to the
 * paywall (no native Alert), making the whole hop web-testable. The comparison math itself is
 * covered by the computeYearOverYear unit tests.
 */
test.describe("Year-over-year insights gating", () => {
  const priorYear = new Date().getFullYear() - 1;

  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  async function logEntry(page: import("@playwright/test").Page, amount: string, date?: string) {
    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    if (date) {
      await page.getByLabel("Date").fill(date);
    }
    await page.getByPlaceholder("0.00").first().fill(amount);
    await page.getByText("Save Entry", { exact: true }).click();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
  }

  test("free user with 2+ years of data sees the locked card and tapping it opens the paywall", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    // Two entries in two different tax years — the soft gate for the card to appear.
    await logEntry(page, "5000");
    await logEntry(page, "3000", `${priorYear}-06-15`);

    const card = page.getByText(/Year-over-year insights\s+·\s+Premium/);
    await expect(card).toBeVisible();

    await card.click();
    await expect(page.getByText("SetAside Premium")).toBeVisible();
    await expect(page.getByLabel("Subscribe")).toBeVisible();
  });

  test("the card does not show with only one year of data (soft-gated)", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await logEntry(page, "5000"); // a single current-year entry — only one tracked year

    await expect(page.getByText(/Year-over-year insights/)).toHaveCount(0);
  });
});

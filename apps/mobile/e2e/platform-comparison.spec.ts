import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, grossPayField, platformChip, resetAppStorage, visible } from "./helpers";

async function logEntry(page: Page, platform: string, grossPay: string) {
  await page.getByText("Log Earnings", { exact: true }).click();
  await platformChip(page, platform).click();
  await grossPayField(page).fill(grossPay);
  await page.getByText("Save Entry", { exact: true }).click();
  await expect(page.getByText("Set aside for taxes")).toBeVisible();
}

/**
 * Platform earnings comparison: once 2+ platforms have entries, the dashboard surfaces a
 * "Compare your platforms" card that opens a ranked per-platform breakdown.
 */
test.describe("platform comparison", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("dashboard card appears with 2+ platforms and opens the comparison", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    // With a single platform, the comparison card should NOT show yet.
    await logEntry(page, "DoorDash", "300");
    await expect(page.getByText("Compare your platforms")).toBeHidden();

    // A second platform unlocks the comparison card.
    await logEntry(page, "Uber", "120");
    await expect(page.getByText("Compare your platforms")).toBeVisible();

    // Open the full comparison — both platforms ranked, DoorDash (higher earnings) first.
    await page.getByLabel("Compare your platforms").click();
    await expect(page.getByText("Compare platforms")).toBeVisible();
    // Both platforms appear on the comparison screen itself. Visibility-scoped because "DoorDash"
    // also sits — hidden — on the dashboard behind this route, in both an entry row and the
    // "leads with" teaser on the card that opened this screen.
    await expect(visible(page.getByText("DoorDash", { exact: true })).first()).toBeVisible();
    await expect(visible(page.getByText("Uber", { exact: true })).first()).toBeVisible();
    await expect(visible(page.getByText("$300.00")).first()).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * Earnings share card: once there are earnings, the dashboard shows a share button that opens a
 * preview of the shareable summary card. The actual image capture + native share sheet are
 * iOS-only (react-native-view-shot + expo-sharing) and verified on a device — here we only assert
 * the card renders with the right summary and that the web build flags sharing as app-only.
 */
test.describe("earnings share card", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("share button opens a card preview of the earnings summary", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    // No earnings yet → no share affordance.
    await expect(page.getByLabel("Share earnings")).toBeHidden();

    await page.getByText("Log Earnings", { exact: true }).click();
    await page.getByText("DoorDash", { exact: true }).click();
    await page.getByPlaceholder("0.00").first().fill("1000");
    await page.getByText("Save Entry", { exact: true }).click();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();

    // Earnings exist → share button appears and opens the card preview.
    await page.getByLabel("Share earnings").click();
    await expect(page.getByText("Share your earnings")).toBeVisible();
    await expect(page.getByText(/My \d{4} gig earnings/)).toBeVisible();
    await expect(page.getByText("Tracked with SetAsideTracker")).toBeVisible();
    // Web build is honest that the actual share is iOS-only.
    await expect(page.getByText(/Sharing works on the iOS app/)).toBeVisible();
  });
});

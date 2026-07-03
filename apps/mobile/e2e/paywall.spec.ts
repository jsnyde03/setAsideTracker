import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * Premium paywall web render. On web there's no RevenueCat SDK (IAP is iOS-only), so the paywall
 * shows its static-price fallback ($29.99 / $4.99) — which is exactly what we want to verify here:
 * the layout, the Apple Guideline 3.1.2 elements (billed price prominent, auto-renewal disclosure,
 * Terms/Privacy links, restore), and that it's reachable from Settings. The real purchase loop is
 * native and verified via Maestro + a manual TestFlight pass, not here.
 */
test.describe("premium paywall", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("is reachable from Settings and shows the required subscription info", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByLabel("Settings").click();
    await expect(page.getByLabel("Upgrade to Premium")).toBeVisible();
    await page.getByLabel("Upgrade to Premium").click();

    // Header + both billed prices (static fallback on web).
    await expect(page.getByText("SetAside Premium")).toBeVisible();
    await expect(page.getByText("$29.99").first()).toBeVisible();
    await expect(page.getByText("$4.99").first()).toBeVisible();
    await expect(page.getByText("per year").first()).toBeVisible();
    await expect(page.getByText("per month").first()).toBeVisible();

    // Apple Guideline 3.1.2 required elements.
    await expect(page.getByText(/automatically renews/)).toBeVisible();
    await expect(page.getByText("Terms of Use (EULA)")).toBeVisible();
    await expect(page.getByText("Privacy Policy")).toBeVisible();
    await expect(page.getByLabel("Subscribe")).toBeVisible();
    await expect(page.getByText("Restore purchases")).toBeVisible();
  });
});

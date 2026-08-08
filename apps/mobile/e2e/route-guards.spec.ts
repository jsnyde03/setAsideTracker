import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * Route guards (1.2.0.5).
 *
 * These states were structurally unreachable before 1.2.0.4 — the old screen dispatch only rendered a
 * screen when the data it needed existed, which is why those routes still cast `taxProfile as
 * TaxProfile`. Real routing made them addressable by URL, and `app.json` now declares a `scheme`, so
 * they're reachable by deep link on device too. These tests pin the guards that make the casts honest
 * again.
 */
test.describe("route guards", () => {
  test("a data route entered without a profile redirects to onboarding", async ({ page }) => {
    await resetAppStorage(page);

    // Straight to a route that would otherwise render against a null tax profile.
    await page.goto("/what-if");

    await expect(page.getByText("Welcome")).toBeVisible();
    // And it did not render the guarded screen on the way past.
    await expect(page.getByText("What if I earned more?")).toBeHidden();
  });

  test("every guarded route redirects when there is no profile", async ({ page }) => {
    await resetAppStorage(page);

    for (const route of [
      "/settings",
      "/tax-profile",
      "/entry",
      "/safe-harbor",
      "/w4-optimizer",
      "/year-over-year",
      "/expense-breakdown",
      "/platform-comparison",
    ]) {
      await page.goto(route);
      await expect(page.getByText("Welcome"), `${route} should redirect to onboarding`).toBeVisible();
    }
  });

  test("a route entered directly can still be closed", async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);

    // Entered with NO history — a deep link, a shared URL, a bookmark. `router.back()` alone does
    // nothing on an empty stack, which left the close button dead and force-quitting as the only way
    // out. Every test before this one reached these screens by tapping through, the one path where
    // plain `back()` was always fine.
    await page.goto("/what-if");
    await expect(page.getByText("What if…")).toBeVisible();

    await page.getByLabel("Close").click();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
  });

  test("onboarding entered WITH a profile redirects to the dashboard", async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);

    // Re-entering setup with a profile already saved would otherwise walk an existing user back
    // through it and overwrite what they had.
    await page.goto("/onboarding");

    await expect(page.getByText("Set aside for taxes")).toBeVisible();
    await expect(page.getByText("Welcome")).toBeHidden();
  });
});

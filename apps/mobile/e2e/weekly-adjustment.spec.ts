import { expect, test } from "@playwright/test";
import { completeOnboarding, grossPayField, resetAppStorage, visible } from "./helpers";

/**
 * The reconciliation row (1.2.4.5): when the weekly figures stop adding up to what is owed, the app
 * says so instead of letting the two numbers quietly disagree.
 *
 * Drift is induced the way a real user causes it — **by moving state after logging work.** Each
 * week's figure is frozen at the rate in effect when it was logged ([D7]), so a profile change moves
 * the year total while every past week correctly stays put. That difference has to be visible, or a
 * user who adds the weeks up and compares them to the headline finds a mismatch and no explanation.
 */
test.describe("the weekly adjustment", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    await grossPayField(page).fill("9000");
    await page.getByText("Save Entry", { exact: true }).click();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
  });

  test("is absent while nothing has invalidated a frozen rate — the control", async ({ page }) => {
    await visible(page.getByLabel(/Set aside for this week/)).first().click();
    await expect(visible(page.getByText(/Set aside by week/)).first()).toBeVisible();

    // Without this, a row shown unconditionally would pass the test below and be wrong every day.
    await expect(page.getByText("Adjustment", { exact: true })).toHaveCount(0);
    await expect(visible(page.getByText(/Total to set aside/)).first()).toBeVisible();
  });

  test("appears once a profile change moves what is owed", async ({ page }) => {
    // Texas has no income tax and California does, so moving raises the year total while the week
    // that was already logged keeps the figure it was frozen at.
    await page.goto("/tax-profile");
    await page.getByPlaceholder("e.g. CA").fill("California");
    await visible(page.getByText("California", { exact: true })).first().click();
    // The tax-profile screen's button is "Save" -- the entry form's is "Save Changes".
    await visible(page.getByLabel("Save", { exact: true })).first().click();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();

    await visible(page.getByLabel(/Set aside for this week/)).first().click();
    await expect(visible(page.getByText(/Set aside by week/)).first()).toBeVisible();

    const adjustment = visible(page.getByText("Adjustment", { exact: true })).first();
    await expect(adjustment, "the weeks no longer sum to the year total and nothing said so").toBeVisible();
    await expect(
      visible(page.getByText(/Each week was set at the rate in effect at the time/)).first()
    ).toBeVisible();
  });
});

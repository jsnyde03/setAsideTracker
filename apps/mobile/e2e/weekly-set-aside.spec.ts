import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, grossPayField, resetAppStorage, visible } from "./helpers";

/**
 * The weekly set-aside on the dashboard, and the week list behind it ([D7], [D15], 1.2.4.4).
 *
 * The arithmetic has unit tests; what only a rendered app can show is that the figure reaches the
 * screen, that the year total is still there beside it, and that the drill-down opens.
 */
async function logEntry(page: Page, grossPay: string) {
  await page.getByText("Log Earnings", { exact: true }).click();
  await expect(page.getByText("Platform")).toBeVisible();
  await page.getByText("DoorDash", { exact: true }).click();
  await grossPayField(page).fill(grossPay);
  await page.getByText("Save Entry", { exact: true }).click();
  await expect(page.getByText("Set aside for taxes")).toBeVisible();
}

test.describe("weekly set-aside", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });
  });

  test("shows this week beside the year total, not instead of it", async ({ page }) => {
    await expect(visible(page.getByText("This week")).first()).toBeVisible();
    // ⭐ [D15]: the week is added, never substituted — the year total is what is actually owed.
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
    await expect(visible(page.getByText("No shifts logged yet this week")).first()).toBeVisible();
  });

  test("a logged shift moves this week's figure off zero", async ({ page }) => {
    await logEntry(page, "600");

    await expect(visible(page.getByText("1 shift so far")).first()).toBeVisible();
    // The label carries the amount, so asserting on it proves a real figure reached the screen
    // without pinning a dollar value the tax math is free to change (the 1.2.1.5 lesson).
    const weekRow = visible(page.getByLabel(/Set aside for this week/)).first();
    await expect(weekRow).toBeVisible();

    // ⚠️ Asserted on the RENDERED TEXT, not the accessibility label. The first version of this test
    // read the label -- and a plant that hardcoded the displayed figure to $0.00 passed it, because
    // the label is built from the same data and kept telling the truth while the screen did not.
    // A user reads the number, so the test reads the number.
    const rowText = await weekRow.innerText();
    expect(rowText, `week row read: ${rowText}`).toMatch(/\$[\d,]+\.\d{2}/);
    expect(rowText).not.toMatch(/\$0\.00/);

    // The label still has to carry it, for VoiceOver.
    const label = await weekRow.getAttribute("aria-label");
    expect(label).toMatch(/Set aside for this week, \$[\d,]+\.\d{2}/);
    expect(label).not.toMatch(/\$0\.00/);
  });

  test("tapping it opens every week, and closing returns to the dashboard", async ({ page }) => {
    await logEntry(page, "600");

    await visible(page.getByLabel(/Set aside for this week/)).first().click();

    await expect(visible(page.getByText(/Set aside by week/)).first()).toBeVisible();
    await expect(visible(page.getByText("1 shift", { exact: false })).first()).toBeVisible();
    // Nothing is estimated: this entry was logged by this build, so it carries its own frozen rate.
    // ⚠️ Asserted on the sheet's own footnote, not on the word "estimated" -- the dashboard behind
    // this modal says "Q4 2026 estimated tax", which a loose match happily counts as a defect.
    await expect(page.getByText("Weeks marked estimated", { exact: false })).toHaveCount(0);

    await visible(page.getByLabel("Close")).first().click();
    await expect(visible(page.getByText(/Set aside by week/))).toHaveCount(0);
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
  });
});

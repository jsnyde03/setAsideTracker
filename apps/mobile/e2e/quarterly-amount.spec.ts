import { expect, test } from "@playwright/test";
import { completeOnboarding, grossPayField, resetAppStorage, visible } from "./helpers";

/**
 * 1.2.6.1 — the per-quarter estimated payment on the dashboard's due-date card.
 *
 * The gating claim is split in two, and the split is the whole point: **the DATE is the core
 * set-aside job and stays free; the AMOUNT is the premium line.** On web there is no RevenueCat SDK
 * so a user is always free, and demo mode's premium preview ([D5]) is what makes the paid side
 * reachable here at all.
 *
 * ⚠️ Every absence assertion below is paired with a positive one on the same card. `toHaveCount(0)`
 * is equally true of a page that never rendered, and this suite has been fooled by exactly that.
 */
test.describe("Per-quarter estimated payment", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("a free user gets the due DATE and no dollar amount", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).click();
    await grossPayField(page).fill("40000"); // well past the de-minimis floor, so a payment IS owed
    await page.getByText("Save Entry", { exact: true }).click();

    // The control. Without it, the absence assertion below would pass on a card that never drew.
    await expect(visible(page.getByText("Next payment due")).first()).toBeVisible();
    await expect(page.getByText("Estimated payment")).toHaveCount(0);
    await expect(page.getByText(/per quarter/)).toHaveCount(0);
  });

  test("the demo's premium preview shows the amount, beside the same free date row", async ({ page }) => {
    await visible(page.getByText("Explore with sample data")).first().click();
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();

    // Both halves on screen together: the date a free user also gets, and the amount they do not.
    await expect(visible(page.getByText("Next payment due")).first()).toBeVisible();
    await expect(visible(page.getByText("Estimated payment")).first()).toBeVisible();
    // Asserted as a shape, never a figure — 1.2.2 and 1.2.4 each moved what the seed produces, and
    // a hardcoded dollar amount is a test that fails the next time the tax math is corrected.
    await expect(visible(page.getByText(/≈\s*\$[\d,]+(\.\d\d)?\s+per quarter/)).first()).toBeVisible();
  });

  test("the projection is labelled as one, not left to read as an instruction", async ({ page }) => {
    await visible(page.getByText("Explore with sample data")).first().click();
    await expect(visible(page.getByText("Estimated payment")).first()).toBeVisible();

    // The persona is dated into the current year, so its figure is earnings-so-far scaled up. A
    // number sitting next to a deadline reads as "pay this" unless something says otherwise.
    await expect(visible(page.getByText(/Projected from your earnings so far/)).first()).toBeVisible();
  });
});

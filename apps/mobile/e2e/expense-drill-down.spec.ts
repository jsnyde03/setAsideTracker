import { expect, test } from "@playwright/test";
import { dismissTourIfShowing, resetAppStorage, visible } from "./helpers";

/**
 * 1.2.6.5 — tapping a Schedule C line to see which entries make it up.
 *
 * Reached through demo mode: the expense breakdown is Premium and web has no RevenueCat SDK. The
 * persona logs mileage, parking, tolls, supplies, phone and two custom categories, so every mapped
 * line has something behind it.
 */
test.describe("Expense breakdown drill-down", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  async function openBreakdown(page: import("@playwright/test").Page) {
    await visible(page.getByText("Explore with sample data")).first().click();
    await dismissTourIfShowing(page);
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
    await visible(page.getByText(/Expense breakdown/)).first().click();
    await expect(visible(page.getByText("By Schedule C line")).first()).toBeVisible();
  }

  test("a line opens a sheet naming the entries behind it", async ({ page }) => {
    await openBreakdown(page);

    // The control: the sheet is NOT open before the tap, so its appearance below is the tap's doing
    // and not something that was on screen all along.
    await expect(page.getByText(/largest first/)).toHaveCount(0);

    await visible(page.getByLabel(/^Line 9 .*Tap to see which entries make this up/)).first().click();

    await expect(visible(page.getByText(/largest first/)).first()).toBeVisible();
    await expect(visible(page.getByText("Line 9 total")).first()).toBeVisible();
    // Line 9 is mileage + parking + tolls at once, so a row has to say which — the amount cannot.
    await expect(visible(page.getByText(/\d+ mi/)).first()).toBeVisible();
  });

  test("the sheet's own total matches the line that opened it", async ({ page }) => {
    await openBreakdown(page);

    // Captured off the screen rather than hardcoded: the seed's figures move with the tax maths.
    const lineRow = visible(page.getByLabel(/^Line 22 Supplies: \$[\d,.]+\./)).first();
    const label = await lineRow.getAttribute("aria-label");
    const lineTotal = /\$[\d,]+(?:\.\d\d)?/.exec(label ?? "")?.[0];
    expect(lineTotal).toBeTruthy();

    await lineRow.click();
    await expect(visible(page.getByText("Line 22 total")).first()).toBeVisible();

    // ⛔ Asserting the line's own figure appears in the sheet proves NOTHING — the sheet prints
    // `line.amount` for its total, so that passes with zero rows behind it. That is what the first
    // version of this test did. Sum the ROWS instead, which is the claim the feature actually makes.
    const rowLabels = await visible(page.getByLabel(/^Entry \w+ \d+,/)).allTextContents();
    const amounts = await Promise.all(
      (await visible(page.getByLabel(/^Entry \w+ \d+,/)).all()).map(async (row) => {
        const label = (await row.getAttribute("aria-label")) ?? "";
        const match = /:\s*\$([\d,]+(?:\.\d\d)?)/.exec(label);
        return match ? Number(match[1].replace(/,/g, "")) : 0;
      })
    );

    expect(amounts.length, "the sheet must actually list rows").toBeGreaterThan(0);
    expect(rowLabels.length).toBe(amounts.length);
    const rowSum = amounts.reduce((sum, amount) => sum + amount, 0);
    const lineValue = Number((lineTotal as string).replace(/[$,]/g, ""));
    // Cent-level tolerance: each row is rounded for display, the line is rounded once.
    expect(Math.abs(rowSum - lineValue)).toBeLessThan(0.05);
  });

  test("the sheet dismisses and can be reopened on a different line", async ({ page }) => {
    await openBreakdown(page);

    await visible(page.getByLabel(/^Line 22 Supplies/)).first().click();
    await expect(visible(page.getByText("Line 22 total")).first()).toBeVisible();

    // "Close details", not "Close" — the screen underneath keeps its own Close in the tree, and
    // targeting that one clicks a button the modal is covering, which retries until it times out.
    await visible(page.getByLabel("Close details")).first().click();
    await expect(page.getByText("Line 22 total")).toHaveCount(0);

    await visible(page.getByLabel(/^Line 25 /)).first().click();
    await expect(visible(page.getByText("Line 25 total")).first()).toBeVisible();
    // Not a stale sheet showing the previous line's rows.
    await expect(page.getByText("Line 22 total")).toHaveCount(0);
  });
});

import { expect, test } from "@playwright/test";
import { resetAppStorage, visible } from "./helpers";

/**
 * 1.2.6.3 — the safe-harbor payment tracker ([D19]).
 *
 * Reached through demo mode, because the safe-harbor screen is Premium and web has no RevenueCat
 * SDK. The persona seeds every already-passed quarter as paid in full, so the resting state is
 * "nothing overdue" — which makes the *edit* below the real test: clearing a past quarter has to
 * move the summary, and that is the only thing here that exercises the persistence path.
 */
test.describe("Safe-harbor payment tracker", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  async function openSafeHarbor(page: import("@playwright/test").Page) {
    await visible(page.getByText("Explore with sample data")).first().click();
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
    await visible(page.getByText(/Avoid the IRS penalty/)).first().click();
  }

  test("shows all four quarters against the year's target", async ({ page }) => {
    await openSafeHarbor(page);

    await expect(visible(page.getByText(/What you've paid \(\d{4}\)/)).first()).toBeVisible();
    for (const quarter of [1, 2, 3, 4]) {
      await expect(visible(page.getByLabel(`Paid for Q${quarter}`)).first()).toBeVisible();
    }
  });

  test("the persona is square with every deadline that has passed", async ({ page }) => {
    await openSafeHarbor(page);

    // The seed pays each past quarter in full, computed at seed time — so this holds whatever date
    // the demo is opened on, rather than only while Q1 happens to be the last one gone by.
    await expect(visible(page.getByText(/Nothing overdue/)).first()).toBeVisible();
    const q1 = visible(page.getByLabel("Paid for Q1")).first();
    expect(Number(await q1.inputValue())).toBeGreaterThan(0);
  });

  test("clearing a past quarter's payment reports it as overdue", async ({ page }) => {
    await openSafeHarbor(page);
    await expect(visible(page.getByText(/Nothing overdue/)).first()).toBeVisible();

    const q1 = visible(page.getByLabel("Paid for Q1")).first();
    const paid = await q1.inputValue();
    expect(Number(paid)).toBeGreaterThan(0); // the control: there was a payment to remove

    await q1.fill("");
    await q1.blur();

    // The summary counts only deadlines already passed, so removing a PAST payment must move it.
    await expect(visible(page.getByText(/short on payments that were already due/)).first()).toBeVisible();
    await expect(page.getByText(/Nothing overdue/)).toHaveCount(0);
  });
});

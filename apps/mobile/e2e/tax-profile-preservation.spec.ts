import { expect, test } from "@playwright/test";
import { dismissTourIfShowing, resetAppStorage, visible } from "./helpers";

/**
 * Editing the tax profile must not destroy the fields the form does not edit.
 *
 * ⛔ **This is a regression test for a bug that was live in v1.1.1.** `EditTaxProfileScreen` built
 * the saved profile by listing fields by hand, and `saveTaxProfile` replaces the stored profile
 * wholesale — so every field the list forgot was erased on save. `amountSetAsideByYear` was
 * remembered; `filedTaxByYear`, added later for the safe-harbor screen, was not. Changing a single
 * dependent count wiped the user's filed prior-year tax, which comes off their 1040 and which the
 * app cannot recompute.
 *
 * The journey is the proof: the unit tests around `filedTaxByYear` all exercise the *arithmetic*,
 * and not one of them goes through the screen that was losing it.
 */
test.describe("Tax-profile edits preserve fields the form does not own", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("saving an edit leaves the filed prior-year tax intact", async ({ page }) => {
    // Demo mode, for its premium preview ([D5]) — the safe-harbor screen is Premium, and on web
    // there is no RevenueCat SDK, so this is the only way to reach it. The persona seeds a filed
    // prior-year figure, so there is something real to lose.
    await visible(page.getByText("Explore with sample data")).first().click();
    await dismissTourIfShowing(page);
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();

    await visible(page.getByText(/Avoid the IRS penalty/)).first().click();
    const priorTax = visible(page.getByLabel("Last year's total federal tax")).first();
    await expect(priorTax).toBeVisible();

    // The control. Asserting "still there" afterwards proves nothing unless something was there to
    // begin with — and captured, not hardcoded: the seed's figures move when the tax maths does.
    const before = await priorTax.inputValue();
    expect(before).toMatch(/^\d+(\.\d+)?$/);
    expect(Number(before)).toBeGreaterThan(0);

    await visible(page.getByLabel("Close")).first().click();
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();

    // A real edit through the real form — the save path that was doing the damage.
    //
    // ⚠️ Deliberately a field that does NOT change whether there is federal tax to set aside.
    // Bumping `Dependents` to 2 was the first attempt and it took the persona's tax to $0, which
    // correctly removed the safe-harbor card from the dashboard — a failure that looked exactly
    // like the regression until the captured page snapshot showed "Set aside for taxes $0.00".
    // Lowering withholding moves the number the other way and keeps the card on screen.
    await visible(page.getByLabel("Settings")).first().click();
    await visible(page.getByLabel("Edit tax profile")).first().click();
    const withheld = visible(page.getByLabel("Federal income tax withheld YTD (optional)")).first();
    await expect(withheld).toBeVisible();
    await withheld.fill("100");
    await visible(page.getByLabel("Save")).first().click();

    // Back to safe harbor: the figure the form never displayed must have survived the save.
    await visible(page.getByLabel("Close")).first().click();
    await visible(page.getByText(/Avoid the IRS penalty/)).first().click();
    await expect(visible(page.getByLabel("Last year's total federal tax")).first()).toHaveValue(before);
  });
});

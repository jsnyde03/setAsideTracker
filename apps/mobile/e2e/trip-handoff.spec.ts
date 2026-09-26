import { expect, test } from "@playwright/test";
import { completeOnboarding, grossPayField, resetAppStorage, visible } from "./helpers";

/**
 * The trip hand-off: miles captured outside the entry form land in it (1.2.21.1).
 *
 * ⛔ **This is the ONLY part of 1.2.21 a browser can see.** `TripTrackerButton` and
 * `TripRunningBanner` both return `null` on web — there is no location task — so the dashboard card
 * and the running strip render nothing at all here. ⚠️ **A spec asserting anything about them would
 * pass by rendering nothing, which is worse than no spec**: it would report coverage of the feature
 * that was actually buried. They are device rows.
 *
 * What is testable is the seam between them and the form, which is a route param — and the case that
 * matters more than the happy path is the one where the param must be **ignored**.
 */

const MILEAGE_FIELD = "Mileage (business miles driven)";

test.describe("trip hand-off into the entry form", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);
  });

  test("a captured trip pre-fills the mileage field", async ({ page }) => {
    await page.goto("/entry?miles=4.2");
    await expect(visible(page.getByLabel(MILEAGE_FIELD)).first()).toHaveValue("4.2");
  });

  test("the rest of the form is untouched — only mileage is pre-filled", async ({ page }) => {
    await page.goto("/entry?miles=4.2");
    // A pre-filled mileage must not imply anything about what was earned.
    await expect(grossPayField(page)).toHaveValue("");
  });

  /**
   * ⛔ **The case worth writing the spec for.** `initialMileage` is ignored in edit mode, because an
   * existing entry already has its own mileage and a stray param must never silently overwrite a
   * number the user typed. Asserted by constructing the collision deliberately: a real entry's id
   * AND a conflicting `miles`.
   */
  test("editing an entry ignores a miles param and keeps the entry's own", async ({ page }) => {
    // Log an entry carrying a known mileage.
    await visible(page.getByText("Log Earnings", { exact: true })).first().click();
    await visible(page.getByText("DoorDash", { exact: true })).first().click();
    await grossPayField(page).fill("100");
    await visible(page.getByLabel(MILEAGE_FIELD)).first().fill("12");
    await visible(page.getByText("Save Entry", { exact: true })).first().click();
    await expect(visible(page.getByLabel(/Edit DoorDash entry/)).first()).toBeVisible();

    // Open it for editing to learn its id, then re-enter with a conflicting param.
    await visible(page.getByLabel(/Edit DoorDash entry/)).first().click();
    await expect(visible(page.getByLabel(MILEAGE_FIELD)).first()).toHaveValue("12");
    const editUrl = new URL(page.url());
    expect(editUrl.searchParams.get("id"), "the edit route carries no id to collide with").toBeTruthy();

    editUrl.searchParams.set("miles", "999");
    await page.goto(editUrl.toString());

    await expect(
      visible(page.getByLabel(MILEAGE_FIELD)).first(),
      "a miles param overwrote the mileage on an entry being edited",
    ).toHaveValue("12");
  });
});

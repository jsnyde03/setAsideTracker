import { expect, test } from "@playwright/test";
import { completeOnboarding, grossPayField, resetAppStorage, visible } from "./helpers";

/**
 * `TextField` announces each field exactly once (1.2.18.2).
 *
 * ⛔ **This exists because the change it guards had no test.** `TextField` hid its visible label and
 * hint from assistive tech with `accessibilityElementsHidden` + `importantForAccessibility` — props
 * **react-native-web drops entirely**. So the claim in that component's comment ("left exposed
 * they'd be announced twice") was true on iOS and **unverifiable here**, and could have rotted
 * without anything noticing. `aria-hidden` makes it true on both and checkable on one.
 *
 * ⚠️ **Asserted POSITIVELY, not as the absence of the old props.** The repo's standing lesson from
 * 1.2.9.1 is that changing an accessible name needs the NEW fact stated, or the suite only proves
 * the control still exists.
 */

test.describe("field labels are announced once", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);
    await visible(page.getByText("Log Earnings", { exact: true })).first().click();
  });

  test("the input carries the accessible name, and the visible label is hidden from the tree", async ({
    page,
  }) => {
    // The input is still reachable by name — this is the half that must NOT change.
    const input = grossPayField(page);
    await expect(input).toBeVisible();
    await expect(input).toHaveJSProperty("tagName", "INPUT");

    // And the visible label beside it is out of the accessibility tree, so it is not read twice.
    const labelNode = page
      .locator('[aria-hidden="true"]')
      .filter({ hasText: /^Gross pay$/ })
      .first();
    await expect(
      labelNode,
      "the visible label is exposed to screen readers — it will be announced twice",
    ).toHaveCount(1);
  });

  test("every visible field label on this form is hidden from the tree", async ({ page }) => {
    // ⚠️ The class, not one example — a sweep that checks a single field would pass while any other
    // caller of TextField regressed. These four are all rendered through it on the entry form.
    for (const label of ["Gross pay", "Tips", "Hours worked (optional)"]) {
      const hidden = page
        .locator('[aria-hidden="true"]')
        .filter({ hasText: new RegExp(`^${label.replace(/[()]/g, "\\$&")}$`) });
      await expect(hidden, `"${label}" is not hidden from the accessibility tree`).toHaveCount(1);
    }
  });
});

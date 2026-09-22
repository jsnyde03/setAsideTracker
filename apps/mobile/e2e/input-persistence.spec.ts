import { expect, test } from "@playwright/test";
import { completeOnboarding, grossPayField, platformChip, resetAppStorage, visible } from "./helpers";

/**
 * Blur-to-save actually saves (1.2.6.6).
 *
 * ⛔ **Regression test for a class, not a bug.** Three inputs committed on `onEndEditing`, which a
 * web blur never reaches, so everything typed into them was discarded — and the two safe-harbor
 * fields have no Save button, so blur was the only path they had. It worked on a device, which is
 * why nothing caught it; what it cost was the ability to verify any of it here.
 *
 * ⚠️ **These assert across a real `page.reload()`**, and that is the whole point. Navigating away
 * and back does not unmount the dashboard, so the input keeps its own text and a probe that checks
 * that way reports a save that never happened — which is exactly how this was nearly dismissed.
 * A reload is the only thing that forces a genuine re-read, and it needs a real onboarded user
 * because demo mode's store is in memory.
 */
test.describe("Inputs that save on blur", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await platformChip(page, "DoorDash").click();
    await grossPayField(page).fill("40000"); // enough tax owed that safe harbor has something to say
    await page.getByText("Save Entry", { exact: true }).click();
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
  });

  test("the dashboard's amount-set-aside survives a reload without pressing Save", async ({ page }) => {
    const field = visible(page.getByLabel("Amount set aside so far")).first();
    await field.fill("4321");
    // Deliberately NOT pressing "Save amount set aside" — that button is the other path and would
    // prove nothing about blur.
    await field.blur();

    await page.reload();
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
    await expect(visible(page.getByLabel("Amount set aside so far")).first()).toHaveValue("4321");
  });

  test("the safe-harbor prior-year figures survive a reload", async ({ page }) => {
    // Free on web (no RevenueCat), so reach the screen through the demo's premium preview... which
    // is in-memory and cannot survive a reload. Instead: these fields are only reachable behind the
    // paywall, so drive them through the route directly, which no premium guard blocks today.
    await page.goto("/safe-harbor");
    const priorTax = visible(page.getByLabel("Last year's total federal tax")).first();
    await expect(priorTax).toBeVisible();

    await priorTax.fill("7777");
    await priorTax.blur();

    await page.reload();
    await expect(visible(page.getByLabel("Last year's total federal tax")).first()).toHaveValue("7777");
  });
});

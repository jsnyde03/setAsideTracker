import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTourIfShowing, resetAppStorage, visible } from "./helpers";

/**
 * The set-aside figure on each recent-entry row (1.2.20).
 *
 * ⛔ **What this file does NOT try to prove: that the number is right.** Agreement between a row and
 * the weekly sheet is arithmetic, and `weeklySetAside.test.ts` proves it exactly — including that
 * the rows in a week sum to the week's own figure, planted against a deliberately disagreeing
 * implementation. ⚡ **Restating that here in a browser would be a weaker version of a stronger
 * test**, and the weak version is the one that would quietly start passing over a wrong figure.
 *
 * What a browser can answer is presence and wiring: the line renders, it is not a `$0.00` row, and
 * — the part no unit test can see — **the accessible name carries the money it replaces.**
 */

test.describe("set-aside on recent entries", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);
    // Demo data, because a freshly onboarded account has no entries to show a figure for. The seed
    // freezes each rate the way the app does (`demoSeed.ts` calls `computeSetAsideRate`), so these
    // are exact figures rather than estimates.
    await visible(page.getByLabel("Settings")).first().click();
    await visible(page.getByText("Explore sample data")).click();
    await dismissTourIfShowing(page);
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
  });

  test("each entry shows what it says to set aside", async ({ page }) => {
    const asideLines = visible(page.getByText(/\$[\d,]+\.\d\d aside$/));
    expect(await asideLines.count(), "no entry row showed a set-aside figure").toBeGreaterThan(0);
  });

  test("never renders a $0.00 line, which would say nothing", async ({ page }) => {
    // The omission rule: an entry that adds no tax shows no line at all.
    await expect(visible(page.getByText(/^\$0\.00 aside$/))).toHaveCount(0);
    await expect(visible(page.getByText(/^~\$0\.00 aside$/))).toHaveCount(0);
  });

  /**
   * ⛔ **The half no unit test can reach, and the reason this feature touched the label at all.**
   * A wrapper `accessibilityLabel` replaces every word inside it, so before 1.2.20.3 a VoiceOver
   * user heard "Edit DoorDash entry from 2026-09-20" and **no money whatsoever** — not the gross,
   * not the expenses. Asserted POSITIVELY: the name must contain currency, because asserting the
   * absence of the old string would pass for any replacement at all.
   */
  test("the row's accessible name carries the money a sighted user sees", async ({ page }) => {
    const rows = visible(page.getByLabel(/^Edit .* entry from .*\$[\d,]+\.\d\d/));
    expect(
      await rows.count(),
      "entry rows name no dollar amount — a screen reader user hears none of the figures",
    ).toBeGreaterThan(0);

    // And specifically the new one, so a label that merely regained the gross does not pass.
    const withAside = visible(page.getByLabel(/entry from .*set aside\./));
    expect(
      await withAside.count(),
      "no row's accessible name mentions its set-aside",
    ).toBeGreaterThan(0);
  });
});

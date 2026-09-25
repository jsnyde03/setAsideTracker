import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, dismissTourIfShowing, resetAppStorage, visible } from "./helpers";

/**
 * Exactly one dashboard stays mounted, however you get there (1.2.19).
 *
 * ⛔ **This exists because the leak was CUMULATIVE and completely invisible.** `router.replace("/")`
 * while a dashboard is already below it in the stack mounts a **second** one and never unmounts the
 * first. Measured from the DOM across three navigations: **1 → 2 → 3 → 4**. Only ever one is
 * *visible*, which is why nothing noticed for a month — a covered route is `display:none`.
 *
 * ⚡ **What made it visible was a `Modal`: its portal ESCAPES the `display:none` wrapper.** The
 * guided tour rendered from every mounted copy at once, and the stale ones cannot measure their
 * anchors, so a degraded centred card drew on top of the working one. That is the only reason this
 * was ever seen, and the next overlay would have found it again.
 *
 * The fix is `router.dismissTo(href)` — documented as "dismisses screens until the href is reached;
 * if it is not found, replaces the current screen with it". That is exactly the two cases: Settings
 * sits above a dashboard, onboarding does not.
 *
 * ⚠️ **Counted including hidden nodes, deliberately.** A visible-only count reads `1` the whole way
 * through a fourfold leak — it is the assertion that would have been written by someone who had not
 * measured first.
 */

/** Every mounted dashboard, visible or not, found by a marker only it renders. */
async function dashboards(page: Page): Promise<{ total: number; visible: number }> {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("div")).filter(
      (d) => d.textContent === "Set aside for taxes",
    );
    const hidden = (el: Element) => {
      let n: Element | null = el;
      while (n) {
        if (getComputedStyle(n).display === "none") return true;
        n = n.parentElement;
      }
      return false;
    };
    return { total: nodes.length, visible: nodes.filter((n) => !hidden(n)).length };
  });
}

test("the demo and tour navigations never stack a second dashboard", async ({ page }) => {
  test.setTimeout(300_000);
  await resetAppStorage(page);
  await completeOnboarding(page);
  expect((await dashboards(page)).total, "baseline: straight to the dashboard").toBe(1);

  // Enter the sample account from Settings — the navigation that used to duplicate.
  await visible(page.getByLabel("Settings")).first().click();
  await visible(page.getByText("Explore sample data")).click();
  await dismissTourIfShowing(page);
  expect((await dashboards(page)).total, "entering a demo stacked another dashboard").toBe(1);

  // Leave it again.
  await visible(page.getByLabel("Settings")).first().click();
  await visible(page.getByText("Exit sample data")).click();
  await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
  expect((await dashboards(page)).total, "exiting a demo stacked another dashboard").toBe(1);

  // Replay the tour — this one carries a route param, so it exercises the object-href form.
  await visible(page.getByLabel("Settings")).first().click();
  await visible(page.getByText("Replay the tour")).click();
  await expect(visible(page.getByText("Step 1 of 4"))).toBeVisible();
  expect((await dashboards(page)).total, "replaying the tour stacked another dashboard").toBe(1);

  // ⛔ And the thing the count is really protecting: one tour, not one per mounted dashboard.
  await expect(
    page.getByTestId("tour-card"),
    "more than one tour overlay — a Modal portal escaped a covered route",
  ).toHaveCount(1);
});

/*
 * ⛔ **"Clear All Data" and "Restore from Backup" are NOT measured here, and the reason is worth
 * writing down because it first fooled the diagnostic that found the leak.**
 *
 * Both are gated behind a **native `Alert` confirm, which react-native-web does not render** — so
 * tapping the row does nothing at all in a browser. A first pass counted dashboards after that tap
 * and read `visible: 0`, which looked like "the data was cleared and the dashboard is gone". It was
 * **Settings still covering the dashboard**, with nothing cleared. ⚡ **The instrument reported the
 * state it had failed to reach**, which is the same shape as everything else this file guards.
 *
 * Their stack shape is therefore **unknown and unchanged**: they still call `replace("/onboarding")`,
 * and `dismissTo` would behave identically because that route is not in the stack. Both are device
 * rows, and the destructive-path Alerts are already on the TestFlight checklist.
 */

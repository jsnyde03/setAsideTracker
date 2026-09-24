import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, resetAppStorage, visible } from "./helpers";

/**
 * The guided dashboard tour (1.2.8).
 *
 * ⚠️ **What a browser can and cannot answer here.** It can answer the two things that actually
 * decide whether the tour works: **does it open at the right step**, and **did it measure its
 * anchor** — the latter because a failed measurement falls back to a centred card with **no
 * cut-out** while rendering exactly the same words, so a suite that checks only the copy passes
 * either way. It cannot answer motion (every animation in this app is native-only) or VoiceOver
 * order; those are owed to the device pass.
 *
 * ⛔ **`?tour=1` is the real replay path, not a test hatch.** Settings' "Replay the tour" row
 * navigates to exactly this URL — so driving it here exercises the shipping code rather than a
 * parallel entry point built for the tests.
 */

/** Enter the sample account from Settings — the route a real visitor takes into the tour. */
async function enterSampleData(page: Page): Promise<void> {
  await visible(page.getByLabel("Settings")).first().click();
  await visible(page.getByText("Explore sample data")).click();
}

/** Open the dashboard as a real onboarded user, then request the tour the way Settings does. */
async function openTour(page: Page): Promise<void> {
  await resetAppStorage(page);
  await completeOnboarding(page);
  await page.goto("/?tour=1");
  await expect(visible(page.getByText("Step 1 of 4"))).toBeVisible();
}

test.describe("the guided tour", () => {
  test("opens at the first stop, over the set-aside figure", async ({ page }) => {
    await openTour(page);
    await expect(visible(page.getByText("What to set aside"))).toBeVisible();
    await expect(visible(page.getByText("Skip", { exact: true }))).toBeVisible();
    await expect(visible(page.getByText("Next", { exact: true }))).toBeVisible();
  });

  /**
   * ⛔ **The assertion that distinguishes a working stop from a silently degraded one.** Three of
   * the four anchors start below the fold; if the scroll-then-measure fails, `hole` is null, no
   * spotlight renders, and the card centres itself — with identical copy. Asserting the cut-out
   * exists **and sits on the anchor** is the only check that can tell the two apart.
   */
  test("cuts the spotlight out over the anchor, not just anywhere", async ({ page }) => {
    await openTour(page);
    const spotlight = visible(page.getByTestId("tour-spotlight"));
    await expect(spotlight).toBeVisible();

    const hole = await spotlight.boundingBox();
    const anchor = await visible(page.getByText("Set aside for taxes")).first().boundingBox();
    expect(hole, "no cut-out — the anchor was never measured").not.toBeNull();
    expect(anchor).not.toBeNull();
    // The cut-out is the anchor's own box plus the padding, so it must CONTAIN the anchor.
    expect(hole!.x).toBeLessThanOrEqual(anchor!.x);
    expect(hole!.y).toBeLessThanOrEqual(anchor!.y);
    expect(hole!.x + hole!.width).toBeGreaterThanOrEqual(anchor!.x + anchor!.width);
  });

  test("walks all four stops and finishes on Done", async ({ page }) => {
    await openTour(page);
    for (const step of ["Step 1 of 4", "Step 2 of 4", "Step 3 of 4"]) {
      await expect(visible(page.getByText(step))).toBeVisible();
      await visible(page.getByText("Next", { exact: true })).click();
    }
    await expect(visible(page.getByText("Step 4 of 4"))).toBeVisible();
    // The last stop says Done, not Next — running off the end is what `nextStepIndex` prevents.
    await expect(visible(page.getByText("Done", { exact: true }))).toBeVisible();
    await visible(page.getByText("Done", { exact: true })).click();
    await expect(page.getByTestId("tour-card")).toBeHidden();
  });

  test("keeps the spotlight on every stop, including the ones below the fold", async ({ page }) => {
    await openTour(page);
    for (let i = 0; i < 4; i += 1) {
      await expect(
        visible(page.getByTestId("tour-spotlight")),
        `stop ${i + 1} lost its cut-out — its anchor was not brought on screen`,
      ).toBeVisible();
      if (i < 3) await visible(page.getByText("Next", { exact: true })).click();
    }
  });

  /**
   * ⛔ **This is [D29]'s ACTUAL trigger, and the first four tests never touch it** — they all enter
   * through the replay URL. Entering the sample account is how a real visitor meets the tour, so a
   * suite that only ever used `?tour=1` would have left the shipping path unexercised.
   *
   * ⚠️ **It also replaced a vacuous test.** The original asserted "skip survives a reload", and it
   * passed with `markDashboardTourSeen` planted as a no-op: `showTour` needs `isDemo`, that test
   * never entered a demo, so the tour stayed hidden for a reason unrelated to the flag. Going
   * through demo mode twice is what makes the persisted flag the only thing that can decide it.
   */
  test("appears on first demo entry, and a skip keeps it away on the next one", async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);

    await enterSampleData(page);
    await expect(
      visible(page.getByText("Step 1 of 4")),
      "the tour did not appear on the first demo entry — [D29]'s trigger",
    ).toBeVisible();

    await visible(page.getByText("Skip", { exact: true })).click();
    await expect(page.getByTestId("tour-card")).toBeHidden();

    // Out and back in. Demo state is in-memory, so this is a genuinely fresh demo session; the
    // only thing that can still remember the skip is the persisted flag.
    await visible(page.getByLabel("Settings")).first().click();
    await visible(page.getByText("Exit sample data")).click();
    await enterSampleData(page);

    await expect(visible(page.getByText("Set aside for taxes"))).toBeVisible();
    await expect(
      page.getByTestId("tour-card"),
      "the skip did not stick — the tour came back on the next demo entry",
    ).toBeHidden();
  });

  test("Settings offers a replay, and it brings the tour back after a skip", async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);
    await enterSampleData(page);
    await visible(page.getByText("Skip", { exact: true })).click();

    await visible(page.getByLabel("Settings")).first().click();
    await visible(page.getByText("Replay the tour")).click();
    await expect(visible(page.getByText("Step 1 of 4"))).toBeVisible();
  });
});

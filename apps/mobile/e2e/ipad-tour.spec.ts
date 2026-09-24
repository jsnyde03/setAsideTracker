import { expect, test, type Locator, type Page } from "@playwright/test";
import { completeOnboarding, resetAppStorage, visible } from "./helpers";

/**
 * The guided tour at iPad width, in both orientations (1.2.8.6).
 *
 * ⛔ **Why this file exists, when `guided-tour.spec.ts` already covers the tour.** That suite runs
 * in the `chromium` project only, and the iPad projects are scoped to `ipad-*.spec.ts` — so
 * everything known about the tour was learned at 1280×720. The config argues the iPad projects
 * check *appearance* rather than behaviour, and **a spotlight's position is exactly appearance**.
 *
 * ⚠️ **The dashboard is a different layout here.** At regular width it becomes a two-column band
 * ([D25]) — money left, insights right — so the anchors are in different places, different columns,
 * and mostly above the fold rather than below it. The tour measures at runtime, so it *should* just
 * work; that is a prediction, and this is the thing that checks it.
 *
 * What it asserts is the same discriminator as the chromium suite: a cut-out exists and **contains
 * its anchor**. A tour that fails to measure renders a centred card with identical copy, so
 * checking the words would pass either way.
 */

/** The element each stop is pointing at, in order. */
function anchorForStop(page: Page, stop: number): Locator {
  switch (stop) {
    case 1:
      return visible(page.getByText("Set aside for taxes")).first();
    case 2:
      return visible(page.getByText("This week", { exact: true })).first();
    case 3:
      return visible(page.getByText("Log Earnings", { exact: true })).first();
    default:
      return visible(page.getByLabel("Settings")).first();
  }
}

test("the spotlight lands on every anchor at iPad width", async ({ page }) => {
  test.setTimeout(180_000);
  await resetAppStorage(page);
  await completeOnboarding(page);
  await page.goto("/?tour=1");

  for (let stop = 1; stop <= 4; stop += 1) {
    await expect(visible(page.getByText(`Step ${stop} of 4`))).toBeVisible();

    const spotlight = visible(page.getByTestId("tour-spotlight"));
    await expect(
      spotlight,
      `stop ${stop} has no cut-out at this width — the anchor was not measured`,
    ).toBeVisible();

    const hole = await spotlight.boundingBox();
    const anchor = await anchorForStop(page, stop).boundingBox();
    expect(hole).not.toBeNull();
    expect(anchor).not.toBeNull();

    // The cut-out is the anchor's box plus padding, so it must contain the anchor on both axes.
    // ⚠️ Checked on BOTH axes here, unlike the chromium spec: the two-column band is where a
    // horizontal miss would actually happen — a rect measured against the wrong column.
    expect(hole!.x, `stop ${stop} cut-out starts right of its anchor`).toBeLessThanOrEqual(anchor!.x);
    expect(hole!.y, `stop ${stop} cut-out starts below its anchor`).toBeLessThanOrEqual(anchor!.y);
    expect(
      hole!.x + hole!.width,
      `stop ${stop} cut-out ends left of its anchor — likely the other column`,
    ).toBeGreaterThanOrEqual(anchor!.x + anchor!.width);
    expect(hole!.y + hole!.height).toBeGreaterThanOrEqual(anchor!.y + anchor!.height);

    if (stop < 4) await visible(page.getByText("Next", { exact: true })).click();
  }
});

test("the tour card stays within the viewport at iPad width", async ({ page }) => {
  test.setTimeout(180_000);
  await resetAppStorage(page);
  await completeOnboarding(page);
  await page.goto("/?tour=1");
  await expect(visible(page.getByText("Step 1 of 4"))).toBeVisible();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  for (let stop = 1; stop <= 4; stop += 1) {
    const card = await visible(page.getByTestId("tour-card")).first().boundingBox();
    expect(card, `stop ${stop} card not rendered`).not.toBeNull();
    // `placeTooltip` clamps into the safe band; this is that clamp observed at a width its unit
    // tests never used, where there is far more room above and below than on a phone.
    expect(card!.x, `stop ${stop} card off the left edge`).toBeGreaterThanOrEqual(0);
    expect(card!.y, `stop ${stop} card off the top edge`).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width, `stop ${stop} card off the right edge`).toBeLessThanOrEqual(
      viewport!.width,
    );
    expect(card!.y + card!.height, `stop ${stop} card off the bottom edge`).toBeLessThanOrEqual(
      viewport!.height,
    );
    if (stop < 4) await visible(page.getByText("Next", { exact: true })).click();
  }
});

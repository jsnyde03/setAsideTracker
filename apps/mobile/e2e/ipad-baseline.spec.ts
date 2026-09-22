import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * 1.2.7.1 — the baseline, captured BEFORE any adaptive work exists.
 *
 * The question this sub-step was written to answer is *"does the app survive being wide at all?"*,
 * and the before-scan found it was already half answered: the 66-test `chromium` project runs at
 * 1280×720, which is wider than an iPad in portrait. So these tests are not expected to discover a
 * crash. What they establish is the **measured** starting point that 1.2.7.2–.4 move:
 *
 *  - nothing overflows horizontally (a real break, and the one thing that would be a hard failure)
 *  - the dashboard's content currently spans the **full** viewport width at both iPad sizes
 *
 * That second measurement is the defect, stated as a number rather than an impression. It is
 * deliberately asserted here as *"content is full-bleed"* — so when 1.2.7.2 introduces the
 * size-class seam, this test goes red and has to be rewritten to the constrained expectation. ⚠️ A
 * baseline that silently keeps passing after the fix is not a baseline; it is a test of nothing.
 *
 * Screenshots land in `.results/` for the visual review that only a person can do.
 */
test.describe("iPad baseline — before the size-class seam", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);
  });

  test("renders the dashboard without horizontal overflow", async ({ page }, testInfo) => {
    await expect(page.getByText("Set aside for taxes")).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    // A page wider than its viewport is the unambiguous break — it means something has a fixed
    // width or a min-width that the layout cannot absorb.
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test("dashboard content is full-bleed today — the measurement 1.2.7.2 changes", async ({
    page,
  }, testInfo) => {
    const heading = page.getByText("Set aside for taxes");
    await expect(heading).toBeVisible();

    /**
     * ⚠️ Measure the CARD, not the heading. The first version of this test took the bounding box of
     * the text node and read **12%** of the viewport — the width of the words, not of the container
     * holding them — which looked like evidence that the layout was already constrained. The card
     * behind it is 1326px of a 1366px viewport.
     *
     * Selected structurally, by walking up to the nearest ancestor with a real border radius. The
     * class names react-native-web emits are content hashes (`css-view-g5y9jx r-borderRadius-…`)
     * and are not a contract.
     */
    const measured = await heading.evaluate((el) => {
      let node: Element | null = el;
      while (node) {
        const radius = parseFloat(getComputedStyle(node).borderTopLeftRadius || "0");
        if (radius > 0) {
          const r = node.getBoundingClientRect();
          return { width: r.width, x: r.x };
        }
        node = node.parentElement;
      }
      return null;
    });

    expect(measured, "no rounded card ancestor found — the instrument, not the app").not.toBeNull();

    const viewportWidth = page.viewportSize()!.width;
    const spanRatio = (measured!.x + measured!.width) / viewportWidth;

    // The card tracks the viewport rather than sitting in a readable column. Asserted as a
    // proportion so it states the shape of the defect, not one device's pixel count.
    expect(spanRatio).toBeGreaterThan(0.9);

    // The measured baseline is this test's real output — read it in the run log.
    console.log(
      `[${testInfo.project.name}] viewport ${viewportWidth}px · card ${Math.round(measured!.width)}px ` +
        `at x=${Math.round(measured!.x)} (${Math.round(spanRatio * 100)}% of width)`
    );
  });
});

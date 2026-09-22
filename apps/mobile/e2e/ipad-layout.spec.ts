import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * The size-class seam, measured ([D24]). Replaces `ipad-baseline.spec.ts`, which asserted the
 * *unconstrained* layout on purpose so that 1.2.7.2 would turn it red rather than quietly keep
 * passing. Its numbers are preserved in the log: a card **1326px wide on a 1366px window**.
 *
 * ⚠️ Measure the CARD, not the heading. The baseline's first version took the bounding box of the
 * text node and read 12% of the viewport — the width of the words, not of the container holding
 * them — which looked exactly like evidence the layout was already constrained. Selected
 * structurally here, by walking to the nearest ancestor with a real border radius, because
 * react-native-web's class names are content hashes and not a contract.
 */

const READABLE_CONTENT_MAX_WIDTH = 672;

/** The card behind a piece of on-screen text: nearest ancestor with a non-zero border radius. */
async function cardBox(page: import("@playwright/test").Page, text: string) {
  const heading = page.getByText(text);
  await expect(heading).toBeVisible();

  const box = await heading.evaluate((el) => {
    let node: Element | null = el;
    while (node) {
      if (parseFloat(getComputedStyle(node).borderTopLeftRadius || "0") > 0) {
        const r = node.getBoundingClientRect();
        return { width: r.width, x: r.x };
      }
      node = node.parentElement;
    }
    return null;
  });

  expect(box, "no rounded card ancestor found — the instrument, not the app").not.toBeNull();
  return box!;
}

test.describe("iPad layout — the size-class seam", () => {
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
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test("content is capped at the reading measure and centred", async ({ page }, testInfo) => {
    const viewportWidth = page.viewportSize()!.width;
    const box = await cardBox(page, "Set aside for taxes");

    // Capped: the card sits inside the content column, so it can never exceed it.
    expect(box.width).toBeLessThanOrEqual(READABLE_CONTENT_MAX_WIDTH);

    // Centred: equal gutters either side. Asserted as a comparison of the two margins rather than
    // an absolute x, so it holds at both iPad sizes and survives a padding change.
    const leftGutter = box.x;
    const rightGutter = viewportWidth - (box.x + box.width);
    expect(Math.abs(leftGutter - rightGutter)).toBeLessThanOrEqual(2);

    // And it genuinely moved: at these widths the old layout put the card within 20px of each edge.
    expect(leftGutter).toBeGreaterThan(20);

    console.log(
      `[${testInfo.project.name}] viewport ${viewportWidth}px · card ${Math.round(box.width)}px ` +
        `· gutters ${Math.round(leftGutter)}/${Math.round(rightGutter)}`
    );
  });

  test("a phone-width window is NOT constrained — the control", async ({ page }) => {
    /**
     * The regression this control exists for: a max width that applies at every size would
     * letterbox a phone, wasting the only screen the app actually ships on today. Same page, same
     * code — only the window changes, which is also a live resize, so it proves the seam reacts
     * rather than settling on mount.
     */
    await page.setViewportSize({ width: 393, height: 852 });
    const box = await cardBox(page, "Set aside for taxes");

    expect(box.x).toBeLessThanOrEqual(20);
    expect(box.width).toBeGreaterThan(393 - 60);
  });
});

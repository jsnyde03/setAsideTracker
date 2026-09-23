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

  test("the dashboard lays out in two columns once there is a second column to fill", async ({
    page,
  }, testInfo) => {
    /**
     * A brand-new user has none of the six insight cards — every one is conditional on data — so
     * the layout must earn its second column. Logging one entry turns on the safe-harbor card,
     * which is the cheapest way to cross that threshold.
     */
    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).first().click();
    await page.getByLabel("Gross pay", { exact: true }).first().fill("900");
    await page.getByText("Save Entry", { exact: true }).click();

    const money = await cardBox(page, "Total earnings logged (" + new Date().getFullYear() + ")");
    const insight = await cardBox(page, "Avoid the IRS penalty  ·  Premium");

    // Side by side, not stacked: the money column ends before the insight column begins.
    expect(money.x + money.width).toBeLessThanOrEqual(insight.x);

    // And they share a band rather than being a wrapped single column.
    expect(insight.x).toBeGreaterThan(page.viewportSize()!.width / 2 - 100);

    /**
     * ⚠️ The band must also be using the `width="full"` opt-out. Without this the columns would
     * still be side by side — just squeezed into the 672pt reading measure — and every assertion
     * above would still pass. This is the only check that the opt-out `Screen` gained at 1.2.7.2
     * is actually wired, and the dashboard is its first and only consumer.
     */
    const bandWidth = insight.x + insight.width - money.x;
    expect(bandWidth).toBeGreaterThan(READABLE_CONTENT_MAX_WIDTH);

    await page.screenshot({
      path: testInfo.outputPath(`dashboard-two-column-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test("the two-column band survives a LIVE resize in both directions (1.2.7.5)", async ({
    page,
  }) => {
    /**
     * Split View and Stage Manager resize the window **without remounting anything**, so a seam
     * that reads its width once at mount looks perfect in every screenshot and is wrong the moment
     * a user drags the divider. The control below already proves the seam reacts when a window
     * NARROWS; this proves the harder direction — that the second column *appears* on a widen,
     * which is where a mount-time snapshot would silently never come back.
     *
     * ⚠️ No `goto` and no reload anywhere in this test, deliberately. Reloading would re-mount the
     * tree and re-read the width, which is exactly the thing that must not be required — and a test
     * that reloads would pass against a seam that only works at mount.
     */
    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await page.getByText("DoorDash", { exact: true }).first().click();
    await page.getByLabel("Gross pay", { exact: true }).first().fill("900");
    await page.getByText("Save Entry", { exact: true }).click();

    const moneyCard = "Total earnings logged (" + new Date().getFullYear() + ")";
    const insightCard = "Avoid the IRS penalty  ·  Premium";

    /** Side by side (the money column ends before the insight column starts) rather than stacked. */
    async function sideBySide() {
      const money = await cardBox(page, moneyCard);
      const insight = await cardBox(page, insightCard);
      return money.x + money.width <= insight.x;
    }

    await expect.poll(sideBySide, { message: "two columns at the project's iPad width" }).toBe(true);

    await page.setViewportSize({ width: 393, height: 852 });
    await expect
      .poll(sideBySide, { message: "stacks when the window narrows to a phone, live" })
      .toBe(false);

    await page.setViewportSize({ width: 1024, height: 1366 });
    await expect
      .poll(sideBySide, { message: "columns come BACK when it widens again, live" })
      .toBe(true);
  });

  test("falls back to one centred column when there are no insight cards", async ({ page }) => {
    /**
     * The regression this prevents: a two-column band with an empty right half, which reads as a
     * rendering fault rather than as space. `beforeEach` leaves a freshly onboarded user with no
     * entries, so none of the six cards qualify — exactly the state a new iPad user opens the app in.
     */
    // ⚠️ The positive control comes FIRST. `toHaveCount(0)` is also true of a blank page, so an
    // absence asserted before anything is known to have rendered proves nothing.
    const money = await cardBox(page, "Total earnings logged (" + new Date().getFullYear() + ")");
    await expect(page.getByText("Avoid the IRS penalty  ·  Premium")).toHaveCount(0);

    const viewportWidth = page.viewportSize()!.width;

    expect(money.width).toBeLessThanOrEqual(READABLE_CONTENT_MAX_WIDTH);
    expect(Math.abs(money.x - (viewportWidth - (money.x + money.width)))).toBeLessThanOrEqual(2);
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

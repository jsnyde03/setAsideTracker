import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { completeOnboarding, grossPayField, platformChip, resetAppStorage, visible } from "./helpers";

/**
 * 1.2.7.4 — every screen at regular width, swept rather than eyeballed.
 *
 * Two things are checked per screen and they are deliberately different in kind:
 *  - **asserted:** nothing overflows the viewport horizontally. That is the unambiguous break, and
 *    it is the only part a machine can judge.
 *  - **captured:** a full-page screenshot into `.results/`, because "looks designed for an iPad"
 *    is a human judgement and the device build is scarce. The artifacts are the review.
 *
 * ⛔ Uses a real onboarded user, not the demo persona: demo mode's store is in memory, and each
 * `goto` here is a full reload, which would drop it entirely.
 */

/**
 * Routes read from `app/` at run time. ⚠️ **Derived, not transcribed** — a hand-built screen list
 * in this repo has come up short every time one was measured, and a route added later would simply
 * not be swept. `onboarding` is excluded because an onboarded user is deliberately redirected off
 * it (the reverse guard added at 1.2.0), so it is covered by `route-guards.spec.ts` instead.
 */
const ROUTES = readdirSync(join(__dirname, "..", "app"))
  .filter((f) => f.endsWith(".tsx") && !f.startsWith("_") && f !== "onboarding.tsx")
  .map((f) => (f === "index.tsx" ? "/" : `/${f.replace(/\.tsx$/, "")}`))
  .sort();

// If the router ever empties or the path is wrong, every test below would vacuously pass.
if (ROUTES.length < 10) throw new Error(`route sweep found only ${ROUTES.length} routes`);

test.describe("every screen at iPad width", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page, { hasW2Job: true });

    // One entry, so the money screens render their populated state rather than an empty one —
    // an empty screen is a weak layout test.
    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await platformChip(page, "DoorDash").click();
    await grossPayField(page).fill("1200");
    await page.getByText("Save Entry", { exact: true }).click();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
  });

  for (const route of ROUTES) {
    test(`${route} does not overflow horizontally`, async ({ page }, testInfo) => {
      await page.goto(route);

      // Something from the app must be on screen before any of this means anything — a blank page
      // overflows nothing and would pass silently.
      await expect(visible(page.locator("body")).first()).toBeVisible();
      await page.waitForTimeout(300);

      /**
       * ⛔ **Do NOT measure `document.documentElement.scrollWidth` here — it cannot fail.** Every
       * screen's content sits inside a react-native-web `ScrollView`, which has its own
       * `overflow`, so it absorbs any width its children take and the document never grows.
       * Measured: planting `minWidth: 2000` on a screen produced a 2000px div reaching x=2347 and
       * **27 elements wider than the viewport**, while `scrollWidth` sat at exactly 1366. Twelve
       * route tests passed against that plant.
       *
       * What actually detects content spilling off a tablet is the elements' own geometry.
       */
      const overflow = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        let worst = 0;
        let worstTag = "";
        let wider = 0;
        for (const el of Array.from(document.querySelectorAll("*"))) {
          const r = el.getBoundingClientRect();
          if (r.width > viewport + 1) wider++;
          if (r.right > worst) {
            worst = r.right;
            worstTag = el.tagName + (el.className ? `.${String(el.className).slice(0, 30)}` : "");
          }
        }
        return {
          viewport,
          maxRight: Math.round(worst),
          worstTag,
          wider,
          text: (document.body.innerText ?? "").trim().length,
        };
      });

      expect(overflow.text, `${route} rendered no text at all`).toBeGreaterThan(0);
      expect(
        overflow.wider,
        `${route}: ${overflow.wider} element(s) wider than the ${overflow.viewport}px viewport`
      ).toBe(0);
      expect(
        overflow.maxRight,
        `${route}: content reaches ${overflow.maxRight}px (${overflow.worstTag}) past a ${overflow.viewport}px viewport`
      ).toBeLessThanOrEqual(overflow.viewport + 1);

      await page.screenshot({
        path: testInfo.outputPath(`${route.replace(/\//g, "_") || "_root"}.png`),
        fullPage: true,
      });
    });
  }
});

test.describe("the sheets at iPad width", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);
  });

  test("a bottom sheet is capped and centred, not a full-width slab", async ({ page }, testInfo) => {
    /**
     * ⛔ The sheets are the one surface `Screen`'s content column cannot reach: a `Modal` renders
     * in its own view tree. Before this, the weekly sheet spanned the entire 1366px window with two
     * rounded corners at the top.
     */
    await page.getByLabel(/See set aside by week|Set aside for this week/).click();

    const sheet = page.getByText("Set aside by week", { exact: false }).first();
    await expect(sheet).toBeVisible();

    const box = await sheet.evaluate((el) => {
      // Walk up to the sheet container: the first ancestor with a rounded TOP corner and a real
      // width. The sheet's radius is top-only, which distinguishes it from the cards inside it.
      let node: Element | null = el;
      while (node) {
        const s = getComputedStyle(node);
        const topLeft = parseFloat(s.borderTopLeftRadius || "0");
        const bottomLeft = parseFloat(s.borderBottomLeftRadius || "0");
        if (topLeft > 0 && bottomLeft === 0) {
          const r = node.getBoundingClientRect();
          return { width: r.width, x: r.x };
        }
        node = node.parentElement;
      }
      return null;
    });

    expect(box, "no top-rounded sheet ancestor found — the instrument, not the app").not.toBeNull();

    const viewportWidth = page.viewportSize()!.width;
    expect(box!.width).toBeLessThanOrEqual(540);
    expect(Math.abs(box!.x - (viewportWidth - (box!.x + box!.width)))).toBeLessThanOrEqual(2);

    console.log(
      `[${testInfo.project.name}] sheet ${Math.round(box!.width)}px at x=${Math.round(box!.x)} of ${viewportWidth}`
    );

    await page.screenshot({
      path: testInfo.outputPath(`sheet-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  /**
   * A bottom sheet that letterboxed itself on a compact window would be a worse regression than
   * the defect being fixed, and the same code path produces both.
   *
   * ⚠️ **Both widths, and 744 is the one that does the work.** Planting "constrain at every width"
   * is INVISIBLE at 393px — a 540pt cap cannot bind on a 393pt window, so the sheet is full-bleed
   * either way and the control passed against a broken rule. 744 (iPad mini portrait) is compact by
   * our breakpoint but wider than the cap, so it is the only place the mistake actually shows.
   */
  for (const width of [393, 744]) {
    test(`a sheet stays full-bleed at ${width}px — the control`, async ({ page }) => {
      await page.setViewportSize({ width, height: 852 });
      await page.getByLabel(/See set aside by week|Set aside for this week/).click();
      await expect(page.getByText("Set aside by week", { exact: false }).first()).toBeVisible();

      const measured = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll("*"));
        const sheet = els.find((el) => {
          const s = getComputedStyle(el);
          return (
            parseFloat(s.borderTopLeftRadius || "0") > 0 &&
            parseFloat(s.borderBottomLeftRadius || "0") === 0 &&
            el.getBoundingClientRect().width > 200
          );
        });
        return sheet ? sheet.getBoundingClientRect().width : null;
      });

      expect(measured, "no sheet found — the instrument, not the app").not.toBeNull();
      expect(measured!).toBeGreaterThan(width - 2);
    });
  }
});

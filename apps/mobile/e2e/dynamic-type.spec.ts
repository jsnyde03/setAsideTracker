import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage, visible } from "./helpers";

/**
 * Dynamic Type, as far as a browser can honestly answer it (1.2.9.2).
 *
 * ⚠️ **What this is NOT.** It is not iOS Dynamic Type. react-native-web emits pixel font sizes and
 * a browser has no accessibility text-size setting to turn up, so this multiplies every element's
 * computed `font-size` and re-measures. That reproduces the *structural* question — does the layout
 * survive text that is much bigger — and says nothing about iOS fidelity. The real thing is owed to
 * the device pass at 1.2.12, and is written there.
 *
 * **What it does answer**, and what the before-scan could not: whether any text gets CLIPPED. The
 * static sweep found the two hazards it can see — nothing sets `allowFontScaling={false}`, and all
 * 28 fixed heights are icon buttons, grab handles, chart bars and dividers rather than text
 * containers — but "no fixed height on the container" does not prove the text fits. Only rendering
 * does.
 *
 * ⛔ **Clipping, not overflow.** A parent with `overflow: hidden` whose content is taller or wider
 * than its box is text the user cannot read, and it is invisible to the horizontal-overflow check
 * in `ipad-screens.spec.ts` — that one measures how far right content reaches, which a clipping
 * container absorbs completely.
 */

/** Derived from `app/`, for the same reason the iPad sweep derives its list: a hand-built screen
 * list in this repo has come up short every time one was measured. */
const ROUTES = readdirSync(join(__dirname, "..", "app"))
  .filter((f) => f.endsWith(".tsx") && !f.startsWith("_") && f !== "onboarding.tsx")
  .map((f) => (f === "index.tsx" ? "/" : `/${f.replace(/\.tsx$/, "")}`))
  .sort();

if (ROUTES.length < 10) throw new Error(`route sweep found only ${ROUTES.length} routes`);

/** The multiplier. iOS's accessibility sizes go far higher; this is the point at which a layout
 * that is merely tight becomes a layout that is broken. */
const SCALE = 1.5;

/** Scale every element's text, the way a larger Dynamic Type setting would. */
async function scaleText(page: import("@playwright/test").Page, factor: number) {
  await page.evaluate((f) => {
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const size = parseFloat(getComputedStyle(el).fontSize || "0");
      if (size > 0) (el as HTMLElement).style.fontSize = `${size * f}px`;
    }
  }, factor);
  await page.waitForTimeout(250);
}

/** Elements that are cutting off their own content. */
async function clipped(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const bad: { tag: string; text: string; overflowBy: number }[] = [];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const style = getComputedStyle(el);
      const text = (el as HTMLElement).innerText?.trim() ?? "";
      if (!text) continue;

      /**
       * ⛔ Measure ONLY the axis that is actually hidden, and only when it is hidden rather than
       * scrollable. A `ScrollView` is a box whose content is deliberately taller than it is — that
       * is the entire point — and react-native-web builds one by pairing `overflow-y: auto` with
       * `overflow-x: hidden`. The first version of this checked "is anything hidden?" and then
       * measured BOTH axes, so every scrolling screen reported its own scroll distance as clipped
       * text: 944px of Settings, flagged as a defect on a page that was working perfectly.
       */
      let overBy = 0;
      if (style.overflowY === "hidden") overBy = Math.max(overBy, el.scrollHeight - el.clientHeight);
      if (style.overflowX === "hidden") overBy = Math.max(overBy, el.scrollWidth - el.clientWidth);

      // A pixel or two of rounding is not a clipped sentence.
      if (overBy > 2) bad.push({ tag: el.tagName, text: text.slice(0, 60), overflowBy: overBy });
    }
    return bad;
  });
}

test.describe("Dynamic Type — the layout at larger text", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);
  });

  for (const route of ROUTES) {
    test(`${route} clips no text at ${SCALE}x`, async ({ page }) => {
      await page.goto(route);
      await expect(visible(page.locator("body")).first()).toBeVisible();
      await page.waitForTimeout(300);

      // ⛔ The control comes FIRST and it is not decoration: if the page clips something at normal
      // size, the assertion below would be reporting a pre-existing defect as a Dynamic Type one.
      const before = await clipped(page);
      expect(before, `${route} already clips text at 1x — not a Dynamic Type finding`).toEqual([]);

      await scaleText(page, SCALE);

      // And prove the scaling actually happened, or everything below passes vacuously.
      const grew = await page.evaluate(() => {
        const el = document.querySelector("body *");
        return el ? parseFloat(getComputedStyle(el).fontSize || "0") : 0;
      });
      expect(grew, "text did not actually scale — the instrument, not the app").toBeGreaterThan(0);

      expect(await clipped(page), `${route} clips text at ${SCALE}x`).toEqual([]);
    });
  }
});

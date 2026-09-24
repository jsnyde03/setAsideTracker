import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, resetAppStorage, visible } from "./helpers";

/**
 * WCAG AA contrast, measured on every route in both themes (1.2.9.3).
 *
 * ⛔ **Why this is a gate and not a review.** The audit that produced it found 52 failing text nodes
 * across the two themes — but they were not 52 defects, they were **five theme tokens**, each used
 * everywhere. A palette is exactly the kind of thing where one careless value ships app-wide, and
 * exactly the kind of thing no amount of looking reliably catches: `inkFaint` was 2.45:1 and had
 * been on every screen since the beginning.
 *
 * ⚠️ **Touch targets are deliberately NOT gated here.** react-native-web does not apply `hitSlop`,
 * so the browser measures a 22pt icon as 22pt when iOS gives it 44. A gate built on that would fail
 * on elements that are correct on the device — the one thing worse than no gate. The 1.2.9.3 audit
 * measured them by hand against the source instead, and the device pass confirms them.
 *
 * ⚠️ **Nor does this replace looking.** Contrast is a number and a screenshot is not; both were
 * done. See the log.
 */

/**
 * ⚠️ **WHAT THIS DOES NOT COVER, said out loud so its silence is not mistaken for evidence.**
 *
 * It sweeps ROUTES. Seven user-visible surfaces are not routes and are therefore unmeasured here:
 * the four bottom sheets (`BreakdownDetailSheet`, `ExpenseLineSheet`, `WeeklySetAsideSheet`,
 * `ShareEarningsModal`) and the three screens `AppGate` renders directly (`LockScreen`,
 * `RecoveryScreen`, onboarding). Each needs a path to open it rather than a URL to visit.
 *
 * ⛔ A green run here means "every route passes", not "the app passes". Filed to the backlog at
 * 1.2.9.6 rather than quietly widened, because opening each sheet is real work and half-doing it
 * would be worse than the honest gap.
 */

const ROUTES = readdirSync(join(__dirname, "..", "app"))
  .filter((f) => f.endsWith(".tsx") && !f.startsWith("_") && f !== "onboarding.tsx")
  .map((f) => (f === "index.tsx" ? "/" : `/${f.replace(/\.tsx$/, "")}`))
  .sort();

if (ROUTES.length < 10) throw new Error(`route sweep found only ${ROUTES.length} routes`);

/**
 * Runs in the page. Returns text that fails AA, plus a count of nodes skipped because a gradient
 * sits behind them.
 *
 * ⛔ The gradient exclusion is load-bearing, not a convenience. A `LinearGradient` paints through
 * `background-image`, so walking ancestors for a `background-color` sails straight past it and
 * reports the page's own white — which made the first version of this call white-on-dark-gradient
 * text a 1.06:1 failure. 27 such nodes, every one of them fine. Reporting them would have buried
 * the 25 that were real.
 */
const MEASURE = `(() => {
  function parse(c) {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lum({ r, g, b }) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function effectiveBg(el) {
    let node = el;
    while (node && node !== document.documentElement) {
      const st = getComputedStyle(node);
      if (st.backgroundImage && st.backgroundImage !== "none") return null;
      const c = parse(st.backgroundColor);
      if (c && c.a > 0.95) return c;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  const failures = [];
  let gradient = 0, checked = 0;
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length > 0) continue;
    const text = (el.innerText || '').trim();
    if (!text) continue;
    const st = getComputedStyle(el);
    const fg = parse(st.color);
    if (!fg || fg.a < 0.1) continue;
    const bg = effectiveBg(el);
    if (!bg) { gradient++; continue; }
    checked++;
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(st.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(st.fontWeight) >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      failures.push(Math.round(ratio * 100) / 100 + ":1 (needs " + need + ", " + Math.round(size) +
        "px) " + st.color + " — " + JSON.stringify(text.slice(0, 40)));
    }
  }
  return { failures, gradient, checked };
})()`;

async function chooseScheme(page: Page, label: "Light" | "Dark") {
  await page.getByLabel("Settings").click();
  await expect(page.getByText("Appearance")).toBeVisible();
  await page.getByText(label, { exact: true }).click();
  await page.getByLabel("Close").click();
  await expect(page.getByText("Set aside for taxes")).toBeVisible();
}

for (const scheme of ["Light", "Dark"] as const) {
  test(`every route meets WCAG AA in ${scheme} mode`, async ({ page }) => {
    test.setTimeout(240_000);
    await resetAppStorage(page);
    await completeOnboarding(page);
    await chooseScheme(page, scheme);

    const all: string[] = [];
    let checkedTotal = 0;

    for (const route of ROUTES) {
      await page.goto(route);
      await expect(visible(page.locator("body")).first()).toBeVisible();
      await page.waitForTimeout(250);
      const { failures, checked } = (await page.evaluate(MEASURE)) as {
        failures: string[];
        gradient: number;
        checked: number;
      };
      checkedTotal += checked;
      for (const f of failures) all.push(`${route}  ${f}`);
    }

    // ⛔ The instrument first. If the walk ever stops finding text — a selector change, a render
    // failure — every assertion below passes for the wrong reason, silently and forever.
    expect(checkedTotal, "measured no text at all — the instrument, not the app").toBeGreaterThan(100);

    expect([...new Set(all)].sort(), `${scheme} mode text below WCAG AA`).toEqual([]);
  });
}

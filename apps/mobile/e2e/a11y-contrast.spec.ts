import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { completeOnboarding, dismissTourIfShowing, resetAppStorage, visible } from "./helpers";

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
 * It sweeps **every route**, the **guided tour**, **onboarding**, and **all four bottom sheets**
 * (`WeeklySetAsideSheet`, `BreakdownDetailSheet`, `ShareEarningsModal`, `ExpenseLineSheet`).
 *
 * ⛔ **TWO surfaces are still unmeasured, and both for the same stated reason:** `LockScreen` and
 * `RecoveryScreen` need contrived state — app lock on; data the app cannot decrypt — and neither is
 * reachable by clicking. ⚠️ **They are likely honest DEVICE rows rather than browser ones**: a lock
 * screen whose biometric prompt does not exist on web is half a screen, and measuring the half that
 * renders would report a pass over a surface nobody has seen whole. **Decide per surface, and say
 * which here.**
 *
 * ⚠️ **The sheets are measured over a DEMO session**, because this test's user has no entries and
 * three of the four sheets would otherwise open empty. That also means a failure reported "with X
 * open" may belong to the screen BEHIND the sheet — which is how the DemoBanner defect below was
 * found, and why the labels say "with".
 *
 * ⚡ **Widening this gate found a real defect on its first working run.** `DemoBanner` rendered
 * `colors.primary` on `primarySoft` at **3.88:1** in dark mode — on **all thirteen screens** of any
 * demo session. It had never been measured because the route sweep runs as a NON-demo user, so the
 * one component guaranteed to be everywhere was in none of the samples.
 *
 * ⛔ A green run means "every route, the tour, onboarding and three sheets pass" — not "the app
 * passes".
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
  let gradient = 0, checked = 0, icon = 0;
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
    // ⛔ An icon is not text. @expo/vector-icons renders glyphs from the "ionicons" FONT, so they
    // arrive here looking like 18px text whose content is a private-use codepoint — and applying
    // the 4.5:1 TEXT threshold to them produced nine failures at 1.2.18.1 that were all correct
    // chevrons. WCAG governs non-text content at 3:1 (SC 1.4.11), which is the threshold they are
    // measured against here rather than being skipped: excluding them would lose real coverage of
    // every icon in the app.
    const isIcon = /ionicons/i.test(st.fontFamily);
    if (isIcon) icon++;
    const large = size >= 24 || (size >= 18.66 && parseInt(st.fontWeight) >= 700);
    const need = isIcon || large ? 3 : 4.5;
    if (ratio < need) {
      const what = isIcon ? "icon" : Math.round(size) + "px";
      failures.push(Math.round(ratio * 100) / 100 + ":1 (needs " + need + ", " + what +
        ") " + st.color + " — " + JSON.stringify(text.slice(0, 40)));
    }
  }
  return { failures, gradient, checked, icon };
})()`;

interface Measured {
  failures: string[];
  gradient: number;
  checked: number;
  /** Icon-font glyphs, measured at the 3:1 non-text threshold rather than 4.5:1. */
  icon: number;
}

/**
 * Open a non-route surface, measure it, close it (1.2.18.1).
 *
 * ⛔ **`opened` is asserted before anything is measured, and that is the whole guard.** A surface
 * that fails to open measures the screen behind it, finds nothing wrong, and reports a pass — which
 * is precisely the shape this gate exists to not have. The per-surface `checked` count is returned
 * so the caller can insist it actually saw text.
 */
async function measureSurface(
  page: Page,
  opened: Locator,
  open: () => Promise<void>,
  close: () => Promise<void>,
): Promise<Measured> {
  await open();
  await expect(opened, "the surface never opened — anything measured now is the screen behind it")
    .toBeVisible();
  await page.waitForTimeout(250);
  const result = (await page.evaluate(MEASURE)) as Measured;
  await close();
  return result;
}

async function chooseScheme(page: Page, label: "Light" | "Dark") {
  await page.getByLabel("Settings").click();
  await expect(page.getByText("Appearance")).toBeVisible();
  await page.getByText(label, { exact: true }).click();
  await page.getByLabel("Close").click();
  await expect(page.getByText("Set aside for taxes")).toBeVisible();
}

for (const scheme of ["Light", "Dark"] as const) {
  test(`every route meets WCAG AA in ${scheme} mode`, async ({ page }) => {
    test.setTimeout(420_000);
    await resetAppStorage(page);

    /**
     * Onboarding (1.2.18.1) — measured FIRST, because it is the one surface that stops existing
     * once you leave it. `ROUTES` excludes `onboarding.tsx` for exactly that reason: visiting the
     * URL after a profile exists just redirects away.
     *
     * ⚠️ **The theme comes from the OS here, not from Settings** — Settings is on the other side of
     * onboarding. With no stored preference the app follows "system", so emulating the media query
     * is the only way to see this screen in dark mode at all.
     */
    await page.emulateMedia({ colorScheme: scheme === "Dark" ? "dark" : "light" });
    await page.reload();
    await expect(visible(page.getByText("Welcome")).first()).toBeVisible();
    await page.waitForTimeout(250);
    const onboarding = (await page.evaluate(MEASURE)) as Measured;
    // Back to the real preference mechanism; `chooseScheme` stores an explicit choice below, which
    // outranks the media query, but leaving an emulated one set would muddy what is being proven.
    await page.emulateMedia({ colorScheme: null });

    await completeOnboarding(page);
    await chooseScheme(page, scheme);

    const all: string[] = [];
    let checkedTotal = onboarding.checked;
    for (const f of onboarding.failures) all.push(`/onboarding  ${f}`);

    for (const route of ROUTES) {
      await page.goto(route);
      await expect(visible(page.locator("body")).first()).toBeVisible();
      await page.waitForTimeout(250);
      const { failures, checked } = (await page.evaluate(MEASURE)) as Measured;
      checkedTotal += checked;
      for (const f of failures) all.push(`${route}  ${f}`);
    }

    // The guided tour (1.2.8.5). An overlay, not a route, so the sweep above cannot reach it —
    // every stop is walked because the last one swaps "Next" for "Done" on the filled button,
    // which is the highest-risk pairing on the card.
    await page.goto("/?tour=1");
    await expect(visible(page.getByTestId("tour-card")).first()).toBeVisible();
    let tourChecked = 0;
    for (let stop = 1; stop <= 4; stop += 1) {
      await expect(visible(page.getByText(`Step ${stop} of 4`))).toBeVisible();
      const { failures, checked } = (await page.evaluate(MEASURE)) as Measured;
      tourChecked += checked;
      for (const f of failures) all.push(`/?tour=1 stop ${stop}  ${f}`);
      if (stop < 4) await visible(page.getByText("Next", { exact: true })).click();
    }
    checkedTotal += tourChecked;

    // ⛔ Close it. The loop above stops ON the last stop rather than past it, so the overlay is
    // still up — and its dim bands intercept pointer events, which is what made the next click
    // hang until the test timed out rather than fail with anything legible.
    await visible(page.getByText("Done", { exact: true })).click();
    await expect(page.getByTestId("tour-card")).toBeHidden();

    /**
     * The four bottom sheets (1.2.18.1), over DEMO data.
     *
     * ⚠️ **Demo, not the freshly-onboarded account, and it is not laziness.** This test's user has
     * no entries, so three of the four sheets would open essentially empty — a weekly breakdown of
     * nothing, a share card reading $0 — and measuring an empty sheet proves almost nothing about
     * the one a user sees. ⛔ **Safe for the theme**: `buildDemoSeed` deliberately omits
     * `colorScheme` (`demoSeed.ts:300`), so entering a demo cannot flip the scheme this test just
     * chose. That was checked, not assumed.
     */
    await visible(page.getByLabel("Settings")).first().click();
    await visible(page.getByText("Explore sample data")).click();
    await dismissTourIfShowing(page);
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();

    /**
     * ⛔ **Each sheet is detected by its BACKDROP, not by its title, and that is load-bearing.**
     * `BreakdownDetailSheet`'s heading is `detail.title` — the string *"Self-employment tax"*,
     * which is **the same text as the dashboard row that opens it**. An "is it open?" check on the
     * title would therefore pass while the sheet stayed shut, measuring the dashboard and calling
     * it a sheet. Each backdrop's `accessibilityLabel` exists only while its sheet is open, so it
     * answers the question actually being asked — and doubles as the close affordance.
     * ⚠️ Every one of these labels was read out of the component; three of four first guesses were
     * wrong.
     */
    let sheetChecked = 0;
    const sheets: [string, string, () => Promise<void>][] = [
      [
        "WeeklySetAsideSheet",
        "Dismiss weekly set-aside",
        async () =>
          void (await visible(page.getByLabel(/Set aside for this week|See set aside by week/))
            .first()
            .click()),
      ],
      [
        "BreakdownDetailSheet",
        "Dismiss details",
        async () => void (await visible(page.getByText("Self-employment tax")).first().click()),
      ],
      [
        "ShareEarningsModal",
        "Dismiss share",
        async () => void (await visible(page.getByLabel("Share earnings")).first().click()),
      ],
    ];
    for (const [name, dismissLabel, open] of sheets) {
      const backdrop = visible(page.getByLabel(dismissLabel)).first();
      const m = await measureSurface(page, backdrop, open, async () => {
        // ⚠️ A CORNER, not the centre. The backdrop covers the whole window, so its centre is
        // underneath the sheet it dims — Playwright aims there by default and the click is
        // intercepted by the card, retrying until the test times out with nothing legible to
        // read. (5, 5) is above any bottom sheet and outside a centred modal.
        await backdrop.click({ position: { x: 5, y: 5 } });
        await expect(backdrop).toBeHidden();
      });
      sheetChecked += m.checked;
      // ⚠️ "with X open", not "X" — `MEASURE` walks the whole document, so a failure found here may
      // belong to the screen BEHIND the sheet. The first run of this sweep reported nine failures
      // against two sheets that were entirely the DemoBanner on the dashboard underneath. The
      // finding was real; the attribution would have sent the next reader to the wrong file.
      for (const f of m.failures) all.push(`with ${name} open  ${f}`);
    }

    /**
     * `ExpenseLineSheet` — the fourth sheet, and the only one NOT on the dashboard (1.2.18.4). It
     * lives on the premium expense-breakdown screen, which a demo can preview ([D5]).
     *
     * ⛔ Measured AFTER the three above, because opening them requires still being on the dashboard.
     * An earlier draft navigated here first and would have made all three unopenable.
     * ⚠️ **Its backdrop reuses "Dismiss details" — the same label `BreakdownDetailSheet` uses.** Safe
     * only because the two cannot be mounted at once; worth knowing before either is reused.
     */
    // ⛔ Navigated IN-APP, not with `page.goto`. The demo store is **in memory**, so a real page load
    // drops the demo entirely — the premium preview goes with it and this screen renders its locked
    // state instead, where "By Schedule C line" does not exist. That is the standing caveat in this
    // repo and it cost this sweep one run.
    await visible(page.getByText(/Expense breakdown/)).first().click();
    await expect(visible(page.getByText("By Schedule C line")).first()).toBeVisible();
    const lineBackdrop = visible(page.getByLabel("Dismiss details")).first();
    const lineSheet = await measureSurface(
      page,
      lineBackdrop,
      async () =>
        void (await visible(page.getByLabel(/^Line \d+ .*Tap to see which entries/))
          .first()
          .click()),
      async () => {
        await lineBackdrop.click({ position: { x: 5, y: 5 } });
        await expect(lineBackdrop).toBeHidden();
      },
    );
    sheetChecked += lineSheet.checked;
    for (const f of lineSheet.failures) all.push(`with ExpenseLineSheet open  ${f}`);

    checkedTotal += sheetChecked;

    // ⛔ The instrument first. If the walk ever stops finding text — a selector change, a render
    // failure — every assertion below passes for the wrong reason, silently and forever.
    expect(checkedTotal, "measured no text at all — the instrument, not the app").toBeGreaterThan(100);
    // ⛔ And each non-route surface separately, because `checkedTotal` is dominated by the routes:
    // any one of these could render nothing at all and the total above would barely move. A
    // surface-level count is the only thing that distinguishes "measured and clean" from
    // "never opened".
    expect(tourChecked, "measured no tour text — the opener, not the tour").toBeGreaterThan(20);
    expect(onboarding.checked, "measured no onboarding text — the opener, not the screen")
      .toBeGreaterThan(10);
    expect(sheetChecked, "measured no sheet text — the openers, not the sheets").toBeGreaterThan(20);

    expect([...new Set(all)].sort(), `${scheme} mode text below WCAG AA`).toEqual([]);
  });
}

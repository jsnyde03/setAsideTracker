import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, resetAppStorage } from "./helpers";

/**
 * Pins the behaviour 1.2.0.2 moved: the light/dark preference used to be state in `App`, lifted above
 * `ThemeProvider` and prop-drilled down. It now lives inside `ThemeProvider`, which loads and persists
 * it itself, so any route can change the theme.
 *
 * There was no test over this before — all 17 specs passed against the move without exercising it
 * once, which is exactly why it needed one. Assertions are on properties (the surface changes; the
 * choice survives a reload; a theme write doesn't clobber a neighbouring setting) rather than on any
 * specific colour, so a palette change doesn't make this fight the next honest edit.
 */
test.describe("theme preference", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page);
  });

  /** The app paints every screen from the theme, so the rendered pixels are the honest read. */
  async function surface(page: Page): Promise<string> {
    return (await page.screenshot({ fullPage: false })).toString("base64");
  }

  async function chooseScheme(page: Page, label: "Light" | "Dark") {
    await page.getByLabel("Settings").click();
    await expect(page.getByText("Appearance")).toBeVisible();
    await page.getByText(label, { exact: true }).click();
    await page.getByLabel("Close").click();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
  }

  test("choosing Dark changes the surface, and the choice survives a reload", async ({ page }) => {
    await chooseScheme(page, "Light");
    const light = await surface(page);

    await chooseScheme(page, "Dark");
    const dark = await surface(page);

    expect(dark).not.toBe(light);

    // Persistence is the half that used to live in App.tsx. After a reload the preference comes back
    // through ThemeProvider's own loader, not through any prop.
    //
    // Asserted on the persisted PREFERENCE rather than on pixels: comparing screenshots across a
    // reload proved flaky (it passed only on retry), and an exact-image assertion is over-specified
    // anyway — it would fight the next legitimate palette or layout change. The property that
    // actually matters is that the choice came back.
    //
    // Note the reload lands on the DASHBOARD, not Settings: while the app is still mounted as a
    // single route (1.2.0.1's strangler-fig stage), screen position is React state. 1.2.0.4 is what
    // makes routes survive a reload — when it lands, revisit this.
    await page.reload();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();
    await page.getByLabel("Settings").click();
    await expect(page.getByText("Appearance")).toBeVisible();

    // Read the selection off the rendered chip rather than the a11y tree. `Chip` does set
    // accessibilityState={{ selected }}, but RN-Web drops it for role="button" (ARIA doesn't allow
    // aria-selected there), so the tree exposes a bare button with no selected state — a real
    // accessibility bug, filed to 1.2.5 rather than worked around in the component from here.
    const bg = (name: string) =>
      page
        .getByRole("button", { name, exact: true })
        .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await bg("Dark")).not.toBe(await bg("Light"));
  });

  test("a theme change does not clobber the reminders setting", async ({ page }) => {
    // Reminders default on. Turn them OFF, then change the theme. Settings used to be saved by
    // rewriting the whole object from the writer's own state, so a theme write would have silently
    // restored this to on. `updateAppSettings` merges instead — this is that regression.
    await page.getByLabel("Settings").click();
    await expect(page.getByText("Appearance")).toBeVisible();

    const reminders = page.getByRole("switch").last();
    await expect(reminders).toBeChecked();
    await reminders.click();
    await expect(reminders).not.toBeChecked();

    await page.getByText("Dark", { exact: true }).click();
    await page.getByLabel("Close").click();
    await page.reload();

    await expect(page.getByText("Set aside for taxes")).toBeVisible();
    await page.getByLabel("Settings").click();
    await expect(page.getByText("Appearance")).toBeVisible();
    await expect(page.getByRole("switch").last()).not.toBeChecked();
  });
});

import { expect, test } from "@playwright/test";
import { completeOnboarding, grossPayField, platformChip, resetAppStorage, visible } from "./helpers";

/**
 * 1.2.6.4 — best days to work ([D20]).
 *
 * ⚠️ **The soft gate is the thing most worth testing here**, because the flat "~30 entries" gate it
 * replaced would have hidden this feature from the very demo that is supposed to sell it. These
 * assert both directions: a fresh user with one shift sees no card, and the persona does.
 */
test.describe("Best days to work", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
  });

  test("the card stays hidden until several weekdays have enough shifts", async ({ page }) => {
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    await page.getByText("Log Earnings", { exact: true }).click();
    await expect(page.getByText("Platform")).toBeVisible();
    await platformChip(page, "DoorDash").click();
    await grossPayField(page).fill("400");
    await page.getByText("Save Entry", { exact: true }).click();

    // The control: the dashboard rendered and has other insight cards on it, so the absence below
    // is about the gate rather than about an empty page.
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
    await expect(page.getByText(/Best days to work/)).toHaveCount(0);
  });

  test("the persona clears the gate and the days are ranked by hourly rate", async ({ page }) => {
    await visible(page.getByText("Explore with sample data")).first().click();
    await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();

    await visible(page.getByText(/Best days to work/)).first().click();

    // Measured before building this: the seed's fixed day-offsets always yield 4 weekdays with >=3
    // shifts and 2 with none, whatever date the demo is opened on. So the ranked list is 4 long and
    // the "no shifts logged" note is always present — both are stable assertions, not lucky ones.
    await expect(visible(page.getByText(/ranked by what you actually kept per hour/)).first()).toBeVisible();
    await expect(visible(page.getByText(/· best/)).first()).toBeVisible();
    await expect(visible(page.getByText(/No shifts logged on /)).first()).toBeVisible();

    // Rate, not total. Asserted as a shape — the seed's figures move whenever the tax maths does.
    await expect(visible(page.getByText(/\$[\d,]+(\.\d\d)?\/hr/)).first()).toBeVisible();
    await expect(visible(page.getByText(/kept/)).first()).toBeVisible();
  });

  test("it does not restate the free platform comparison", async ({ page }) => {
    // ⛔ The spec for this feature included platform-by-hourly-rate, which already ships FREE on
    // "Compare platforms". Putting it here would have taken something away from free, and this is
    // the assertion that keeps it out.
    await visible(page.getByText("Explore with sample data")).first().click();
    await visible(page.getByText(/Best days to work/)).first().click();

    await expect(visible(page.getByText(/ranked by what you actually kept per hour/)).first()).toBeVisible();
    // ⚠️ Visibility-scoped, not a bare count. The dashboard stays MOUNTED under a pushed route on
    // web, so its entry rows would match every platform name here and this would fail while the
    // screen was perfectly correct — which is exactly what it did first time.
    for (const platform of ["DoorDash", "Uber", "Instacart", "Amazon Flex"]) {
      await expect(visible(page.getByText(platform, { exact: true }))).toHaveCount(0);
    }
  });

  test("a free user gets the locked card and the paywall", async ({ page }) => {
    // Demo mode is a premium *preview* ([D5]), so it cannot show the locked state. A real free user
    // with enough history can only be reached by logging the shifts, which is what this does — three
    // on one weekday and three on another, seven days apart, to clear the per-weekday gate.
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });

    const today = new Date();
    for (let week = 0; week < 3; week++) {
      for (const dayOffset of [0, 1]) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7 + dayOffset));
        const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        await page.getByText("Log Earnings", { exact: true }).click();
        await expect(page.getByText("Platform")).toBeVisible();
        await platformChip(page, "DoorDash").click();
        await grossPayField(page).fill("300");
        await visible(page.getByLabel("Date")).first().fill(iso);
        await visible(page.getByLabel("Hours worked (optional)")).first().fill("8");
        await page.getByText("Save Entry", { exact: true }).click();
        await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
      }
    }

    const card = page.getByText(/Best days to work\s+·\s+Premium/);
    await expect(visible(card).first()).toBeVisible();
    await visible(card).first().click();
    await expect(visible(page.getByText("SetAside Premium")).first()).toBeVisible();
  });
});

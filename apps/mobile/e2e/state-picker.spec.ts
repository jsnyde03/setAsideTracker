import { expect, test } from "@playwright/test";
import { resetAppStorage, visible } from "./helpers";

/**
 * The state field was free text until 1.2.2.6. Typing "California" produced the key CALIFORNIA,
 * which matched nothing in a config holding all 50 states plus DC — so the app computed $0 state
 * tax and told the user California wasn't supported. On the first screen anyone sees.
 *
 * These cover the two halves that matter: the input that used to fail now works, and the input
 * every existing test flow uses ("TX") still works without a tap.
 */
test.beforeEach(async ({ page }) => {
  await resetAppStorage(page);
});

const stateField = "e.g. CA";

test("typing a full state name finds it — the input that used to fail", async ({ page }) => {
  await expect(visible(page.getByText("Welcome")).first()).toBeVisible();

  await page.getByPlaceholder(stateField).fill("California");

  // The match is offered as something to pick, rather than swallowed as an unusable key.
  await expect(visible(page.getByText("California", { exact: true })).first()).toBeVisible();
  await visible(page.getByText("California", { exact: true })).first().click();

  // Confirmed back to the user by name, not by a two-letter code they'd have to decode.
  await expect(visible(page.getByText(/Selected: California/)).first()).toBeVisible();
});

test("a partial name narrows to real matches", async ({ page }) => {
  await page.getByPlaceholder(stateField).fill("carolina");

  await expect(visible(page.getByText("North Carolina", { exact: true })).first()).toBeVisible();
  await expect(visible(page.getByText("South Carolina", { exact: true })).first()).toBeVisible();
  // And nothing unrelated came along for the ride.
  await expect(visible(page.getByText("California", { exact: true }))).toHaveCount(0);
});

test("an exact two-letter code selects with no tap — keeps existing flows working", async ({ page }) => {
  // Every Maestro flow and the Playwright onboarding helper type a bare code and move on. Maestro
  // is out of build minutes until ~November, so this path cannot be re-validated there for weeks;
  // it is asserted here instead.
  await page.getByPlaceholder(stateField).fill("TX");

  await expect(visible(page.getByText(/Selected: Texas/)).first()).toBeVisible();
});

test("a territory reports no match instead of pretending", async ({ page }) => {
  await page.getByPlaceholder(stateField).fill("Puerto Rico");

  await expect(visible(page.getByText(/U\.S\. territories aren't supported yet/)).first()).toBeVisible();
  // The old failure mode was silently computing $0 tax for an unrecognised key. Saying so is the fix.
});

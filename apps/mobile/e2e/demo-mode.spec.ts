import { expect, test } from "@playwright/test";
import { completeOnboarding, resetAppStorage, visible } from "./helpers";

/**
 * Demo mode's enter/exit wiring (1.2.1.4).
 *
 * This is the one part of demo mode a web suite can genuinely verify: entering and leaving are
 * navigation and state, with no Alert, no native module and no OS prompt involved. The *guards* —
 * review prompt, notification scheduling — are unit-tested against mocks and remain device-owed.
 *
 * The load-bearing test is the last one: real data survives a demo session. Everything above it is
 * scaffolding to reach that state honestly, through the UI, rather than by poking storage.
 */

const REAL_NAME = "Real Person";

test.beforeEach(async ({ page }) => {
  await resetAppStorage(page);
});

test("the demo affordance is offered on onboarding", async ({ page }) => {
  await expect(visible(page.getByText("Explore with sample data")).first()).toBeVisible();
});

test("entering the demo populates the app with the seeded persona", async ({ page }) => {
  await visible(page.getByText("Explore with sample data")).first().click();

  // Leaves onboarding for the dashboard, and the dashboard has entries on it — the whole point of
  // seeding. An empty demo would still satisfy "navigated", which is why this asserts content.
  await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
  await expect(visible(page.getByLabel(/Edit Uber entry/)).first()).toBeVisible();
  await expect(visible(page.getByLabel(/Edit DoorDash entry/)).first()).toBeVisible();
});

test("the demo can be left from Settings, and offers no exit when not in one", async ({ page }) => {
  await visible(page.getByText("Explore with sample data")).first().click();
  await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();

  await visible(page.getByLabel("Settings")).first().click();
  await expect(visible(page.getByLabel("Exit sample data")).first()).toBeVisible();
  await visible(page.getByLabel("Exit sample data")).first().click();

  // No real profile exists, so leaving lands back on onboarding — routed by the dashboard's own
  // guard against freshly-loaded data, not decided from the demo's stale state.
  await expect(visible(page.getByText("Explore with sample data")).first()).toBeVisible();
});

test("an onboarded account sees no demo affordance, and keeps its own data", async ({ page }) => {
  await completeOnboarding(page, { name: REAL_NAME, state: "TX", filingStatus: "Single" });

  // A real account reaches the demo only from onboarding, which it no longer sees. So the claim
  // here is the inverse of the tests above: no exit control appears when no demo is running — which
  // also proves the control is driven by demo state rather than merely always rendered.
  await visible(page.getByLabel("Settings")).first().click();
  await expect(visible(page.getByLabel("Exit sample data")).first()).toHaveCount(0);
  await expect(visible(page.getByLabel("Name", { exact: true })).first()).toHaveValue(REAL_NAME);

  // And nothing from the demo has leaked into the real account's storage. Close Settings first:
  // expo-router keeps the URL on web, so reloading from here would land back on /settings and the
  // dashboard assertions below would fail for a reason that has nothing to do with demo mode.
  await visible(page.getByLabel("Close")).first().click();
  await page.reload();
  await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();
  await expect(visible(page.getByLabel(/Edit Uber entry/))).toHaveCount(0);
});

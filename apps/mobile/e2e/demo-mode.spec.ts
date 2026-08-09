import { expect, test } from "@playwright/test";
import { completeOnboarding, grossPayField, resetAppStorage, visible } from "./helpers";

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

test("every screen is marked while the demo runs, and unmarked when it isn't", async ({ page }) => {
  const banner = () => visible(page.getByLabel(/Sample data\. This is an example account/));

  await expect(banner()).toHaveCount(0);
  await visible(page.getByText("Explore with sample data")).first().click();

  // The dashboard, and then a screen that isn't it — the claim is about the shared wrapper covering
  // every screen, not about one of them remembering to render a marker.
  await expect(banner().first()).toBeVisible();
  await visible(page.getByLabel("Settings")).first().click();
  await expect(banner().first()).toBeVisible();
  await visible(page.getByLabel("Close")).first().click();
  await visible(page.getByText("Log Earnings", { exact: true })).first().click();
  await expect(banner().first()).toBeVisible();
});

test("the banner is itself the way out", async ({ page }) => {
  await visible(page.getByText("Explore with sample data")).first().click();
  await expect(visible(page.getByText("Sample data — not your account")).first()).toBeVisible();

  await visible(page.getByLabel(/Sample data\. This is an example account/)).first().click();

  // Back to onboarding (no real profile exists), and the marker is gone with the demo.
  await expect(visible(page.getByText("Explore with sample data")).first()).toBeVisible();
  await expect(visible(page.getByLabel(/Sample data\. This is an example account/))).toHaveCount(0);
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

test("an onboarded account is offered the demo, not an exit from one", async ({ page }) => {
  await completeOnboarding(page, { name: REAL_NAME, state: "TX", filingStatus: "Single" });

  await visible(page.getByLabel("Settings")).first().click();
  // The same row, in its other state — which proves it is driven by demo state rather than always
  // rendered with one label.
  await expect(visible(page.getByLabel("Explore sample data")).first()).toBeVisible();
  await expect(visible(page.getByLabel("Exit sample data"))).toHaveCount(0);
  await expect(visible(page.getByLabel("Name", { exact: true })).first()).toHaveValue(REAL_NAME);
});

/**
 * The item's exit line, end to end and through the UI only: enter a demo from a real account, change
 * things inside it, leave, and find the real account exactly as it was. Nothing here reaches into
 * storage to set up or to assert — that is the point. Only possible at all since [D6] gave an
 * onboarded account a way in.
 */
test("a demo session leaves the real account provably untouched", async ({ page }) => {
  await completeOnboarding(page, { name: REAL_NAME, state: "TX", filingStatus: "Single" });

  // A real entry of the user's own, so there is something specific to lose.
  await visible(page.getByText("Log Earnings", { exact: true })).first().click();
  await visible(page.getByText("Spark", { exact: true })).first().click();
  await grossPayField(page).fill("77");
  await visible(page.getByText("Save Entry", { exact: true })).first().click();
  await expect(visible(page.getByLabel(/Edit Spark entry/)).first()).toBeVisible();

  // Into the demo, from Settings.
  await visible(page.getByLabel("Settings")).first().click();
  await visible(page.getByLabel("Explore sample data")).first().click();

  // The demo's world: its entries are here, the real one is not.
  await expect(visible(page.getByLabel(/Edit Uber entry/)).first()).toBeVisible();
  await expect(visible(page.getByLabel(/Edit Spark entry/))).toHaveCount(0);

  // Scribble on the demo — this is what must not survive.
  await visible(page.getByText("Log Earnings", { exact: true })).first().click();
  await visible(page.getByText("DoorDash", { exact: true })).first().click();
  await grossPayField(page).fill("999");
  await visible(page.getByText("Save Entry", { exact: true })).first().click();
  await expect(visible(page.getByText(/\$999/)).first()).toBeVisible();

  // Back out.
  await visible(page.getByLabel("Settings")).first().click();
  await visible(page.getByLabel("Exit sample data")).first().click();

  // The real account, unchanged: its entry is back, and nothing from the demo came with it.
  await expect(visible(page.getByLabel(/Edit Spark entry/)).first()).toBeVisible();
  await expect(visible(page.getByLabel(/Edit Uber entry/))).toHaveCount(0);
  await expect(visible(page.getByText(/\$999/))).toHaveCount(0);

  // And it survives a reload, so this is the persisted state rather than a lucky in-memory render.
  await page.reload();
  await expect(visible(page.getByLabel(/Edit Spark entry/)).first()).toBeVisible();
  await expect(visible(page.getByText(/\$999/))).toHaveCount(0);
});

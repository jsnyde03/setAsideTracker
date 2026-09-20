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

/**
 * Premium preview inside a demo (1.2.1.6, per [D5]).
 *
 * ⭐ These are also the FIRST end-to-end coverage the four premium screens have ever had. The suite
 * has no way to grant a real entitlement — every other premium spec asserts only the *locked* path —
 * so until demo mode existed, nothing could open W-4 optimizer, safe harbor, year-over-year or
 * expense breakdown in a browser at all.
 *
 * The pair matters more than either half: the preview test alone would pass just as happily if the
 * cards had always been unlocked, so the free-account control runs the same four cards and asserts
 * the paywall. And the last test is [D5]'s actual guarantee — the entitlement stays honest, so the
 * things that spend money or write a real file still refuse.
 */
const PREVIEWABLE_CARDS = [
  { card: "Open the W-4 withholding optimizer", locked: "W-4 withholding optimizer (Premium)", screen: "W-4 optimizer" },
  { card: "Open the safe-harbor calculator", locked: "Safe-harbor calculator (Premium)", screen: "Safe harbor" },
  { card: "Open the expense breakdown", locked: "Expense breakdown (Premium)", screen: "Expense breakdown" },
];

/**
 * ⚠️ Year-over-year is deliberately NOT in that list, and this test is why.
 *
 * Every premium card carries a *data* precondition on top of the premium gate, and year-over-year's
 * is `yearsTracked >= 2` (`DashboardScreen.tsx:516`). The persona seeds exactly one tax year — on
 * purpose: `buildDemoSeed` compresses rather than spills, because `entriesForYear` would silently
 * drop anything landing in the previous year. So the card never renders in a demo, and the fourth
 * premium screen cannot be previewed at all.
 *
 * That is arguably correct — a real one-year user doesn't see it either, and the gate is about data,
 * not about paying. It is asserted here rather than left as a silent hole, so that whichever way the
 * persona question is settled, this test has to be looked at.
 */
test("year-over-year cannot be previewed: the persona has only one year", async ({ page }) => {
  await visible(page.getByText("Explore with sample data")).first().click();
  await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();

  await expect(visible(page.getByLabel("Open year-over-year insights"))).toHaveCount(0);
  await expect(visible(page.getByLabel("Year-over-year insights (Premium)"))).toHaveCount(0);
});

test("the premium cards open their real screens inside a demo", async ({ page }) => {
  await visible(page.getByText("Explore with sample data")).first().click();
  await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();

  for (const { card, screen } of PREVIEWABLE_CARDS) {
    await visible(page.getByLabel(card)).first().click();
    // The screen itself, not the paywall — and asserted by its own title rather than by the absence
    // of the paywall, because "no paywall" is also true of a blank page.
    await expect(visible(page.getByText(screen, { exact: true })).first()).toBeVisible();
    await expect(visible(page.getByText("SetAside Premium"))).toHaveCount(0);
    await visible(page.getByLabel("Close")).first().click();
  }
});

test("CONTROL: the same cards send a free account to the paywall", async ({ page }) => {
  // Without this the test above proves nothing — unlocked-for-everyone would pass it identically.
  await completeOnboarding(page, { name: REAL_NAME, state: "TX", filingStatus: "Single" });
  await visible(page.getByText("Log Earnings", { exact: true })).first().click();
  await visible(page.getByText("DoorDash", { exact: true })).first().click();
  await grossPayField(page).fill("4000");
  await visible(page.getByText("Save Entry", { exact: true })).first().click();
  await expect(visible(page.getByText("Set aside for taxes")).first()).toBeVisible();

  for (const { locked, screen } of PREVIEWABLE_CARDS) {
    const lockedCard = visible(page.getByLabel(locked)).first();
    if ((await lockedCard.count()) === 0) continue; // a card whose own precondition isn't met
    await lockedCard.click();
    await expect(visible(page.getByText("SetAside Premium")).first()).toBeVisible();
    await expect(visible(page.getByText(screen, { exact: true }))).toHaveCount(0);
    await visible(page.getByLabel("Close")).first().click();
  }
});

test("[D5]: the demo previews premium WITHOUT claiming the entitlement", async ({ page }) => {
  await visible(page.getByText("Explore with sample data")).first().click();
  await visible(page.getByLabel("Settings")).first().click();

  // Settings still reports the account as unsubscribed, because it is. A demo may lie about the
  // data on screen; it may never lie about the user's own billing.
  await expect(visible(page.getByText("Premium active"))).toHaveCount(0);

  // And PDF export — which writes a real file to a real device — still routes to the paywall even
  // though every viewing surface around it is previewing.
  await visible(page.getByLabel("Export tax summary as PDF")).first().click();
  await expect(visible(page.getByText("SetAside Premium")).first()).toBeVisible();
});

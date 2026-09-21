import { expect, test, type Page } from "@playwright/test";
import { completeOnboarding, grossPayField, resetAppStorage, visible } from "./helpers";

/**
 * That the set-aside rate is actually WRITTEN when a user logs an entry (1.2.4.2, [D7]).
 *
 * ⚠️ **This is the assertion the unit tests structurally cannot make.** `computeSetAsideRate` has
 * its own tests and they pass whether or not anything calls it — a correct, covered helper that
 * nothing invokes is a defect with a green suite over it, which has bitten this portfolio more than
 * once. The only way to pin the call is to drive the real save path, so this logs an entry through
 * the UI and reads what landed in storage.
 *
 * Storage is readable here because web has no keystore, so entries are stored as plain JSON.
 */
const ENTRIES_KEY = "gigTaxTracker:entries";

async function storedEntries(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as { id: string; grossPay: number; setAsideRate?: number }[]);
  }, ENTRIES_KEY);
}

async function logEntry(page: Page, grossPay: string) {
  await page.getByText("Log Earnings", { exact: true }).click();
  await expect(page.getByText("Platform")).toBeVisible();
  await page.getByText("DoorDash", { exact: true }).click();
  await grossPayField(page).fill(grossPay);
  await page.getByText("Save Entry", { exact: true }).click();
  await expect(page.getByText("Set aside for taxes")).toBeVisible();
}

test.describe("the set-aside rate is frozen at log time", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppStorage(page);
    await completeOnboarding(page, { name: "E2E Tester", state: "TX", filingStatus: "Single" });
  });

  test("a newly logged entry is stored with a rate", async ({ page }) => {
    await logEntry(page, "400");

    const entries = await storedEntries(page);
    expect(entries).toHaveLength(1);
    expect(
      typeof entries?.[0].setAsideRate,
      "the provider did not freeze a rate onto the saved entry"
    ).toBe("number");
    // A plausible self-employment set-aside: real, and not some accidental 0 or 1.
    expect(entries?.[0].setAsideRate as number).toBeGreaterThan(0);
    expect(entries?.[0].setAsideRate as number).toBeLessThan(0.6);
  });

  test("editing an entry leaves its frozen rate alone", async ({ page }) => {
    await logEntry(page, "400");
    const before = (await storedEntries(page))?.[0].setAsideRate;

    await visible(page.getByLabel(/Edit DoorDash entry/)).first().click();
    await grossPayField(page).fill("900");
    // "Save Changes" in edit mode, not "Save Entry" -- the button is labelled by `isEditing`.
    await page.getByText("Save Changes", { exact: true }).click();
    await expect(page.getByText("Set aside for taxes")).toBeVisible();

    const after = await storedEntries(page);
    expect(after?.[0].grossPay, "the edit did not take").toBe(900);
    // ⭐ [D7]: an edit changes the dollars, never the rate. Re-rating here would re-price the entry
    // at today's brackets, which is the retroactive movement the frozen field exists to prevent.
    expect(after?.[0].setAsideRate).toBe(before);
  });
});

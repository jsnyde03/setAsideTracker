import { expect, type Page } from "@playwright/test";

/**
 * Wipe all on-device state the app persists in the browser (AsyncStorage is backed by
 * localStorage/IndexedDB on web), so each test starts from a clean first-run state and lands on
 * onboarding deterministically rather than inheriting a previous test's profile.
 */
export async function resetAppStorage(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    if (typeof indexedDB !== "undefined" && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map((db) => (db.name ? new Promise<void>((res) => {
          const req = indexedDB.deleteDatabase(db.name!);
          req.onsuccess = req.onerror = req.onblocked = () => res();
        }) : Promise.resolve()))
      );
    }
  });
  await page.reload();
}

export interface OnboardingInput {
  name?: string;
  state?: string;
  filingStatus?: "Single" | "Married Filing Jointly" | "Head of Household" | "Married Filing Separately";
  dependents?: string;
}

/**
 * Drive the onboarding form to completion and land on the dashboard. Covers only the no-W2,
 * no-local-county happy path — the validation Alert dialogs are native-only and verified in Maestro.
 */
export async function completeOnboarding(page: Page, input: OnboardingInput = {}): Promise<void> {
  const { name = "E2E Tester", state = "TX", filingStatus = "Single", dependents } = input;

  await expect(page.getByText("Welcome")).toBeVisible();
  await page.getByPlaceholder("Your name").fill(name);
  await page.getByText(filingStatus, { exact: true }).click();
  if (dependents !== undefined) {
    await page.getByPlaceholder("0").first().fill(dependents);
  }
  await page.getByPlaceholder("e.g. CA").fill(state);
  // Disclaimer checkbox (aria-label from the Pressable's accessibilityLabel).
  await page.getByLabel("I understand this app provides estimates, not tax advice").click();
  await page.getByText("Continue", { exact: true }).click();

  await expect(page.getByText("Set aside for taxes")).toBeVisible();
}

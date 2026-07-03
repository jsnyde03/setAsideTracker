import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the Expo-web build of the mobile app.
 *
 * This drives the same React Native code react-native-web renders in a browser — it catches
 * UI-logic regressions (onboarding → dashboard → entry flows, tax-breakdown rendering) that the
 * Vitest unit suite can't. It deliberately does NOT cover native-only paths (Alert dialogs, the
 * native date picker, biometrics, share sheets) — those are Maestro's job (see ../.maestro).
 *
 * Local run (this machine needs the system CA for Expo's TLS — see project notes):
 *   1. NODE_OPTIONS=--use-system-ca npm run web      # in apps/mobile, leave running
 *   2. npm run e2e                                    # Playwright reuses the running server
 *
 * CI run: Playwright starts the web server itself via `webServer` below (no system-CA needed).
 */
const PORT = Number(process.env.E2E_PORT ?? 8081);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  outputDir: "./.results",
  // Expo web's first compile is slow; give navigations and the whole suite generous headroom.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run web",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});

import * as Sentry from "@sentry/react-native";

/**
 * Crash reporting via Sentry. LIVE in release builds: the DSN is set as EXPO_PUBLIC_SENTRY_DSN in
 * codemagic.yaml (Expo's convention for client-readable env vars — safe to be public since a DSN is
 * a write-only ingestion endpoint, not a secret) and the `@sentry/react-native/expo` config plugin
 * (org/project/auth token) is wired in app.json for source-map upload during the Codemagic build.
 * When the DSN is unset (local dev, unit tests, CI without the var) this no-ops entirely, so nothing
 * here can throw or "phone home" in those environments.
 *
 * Privacy note: what this transmits (crash/error diagnostics + reportError context, no PII) is
 * disclosed in the app's privacy policy and must stay reflected in the App Store Connect App Privacy
 * labels. See docs/privacy.html and STORE_LISTING.md.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
let initialized = false;

export function initErrorReporting(): void {
  if (!dsn) return;
  Sentry.init({ dsn, tracesSampleRate: 0.2 });
  initialized = true;
}

/**
 * Reports a caught error. Always logs to the console too (not just when uninitialized) since
 * console output is still useful in dev even with real crash reporting configured.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  console.error("[errorReporting]", error, context);
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

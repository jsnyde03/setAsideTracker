import * as Sentry from "@sentry/react-native";

/**
 * Crash reporting, scaffolded but not yet live — there's no real Sentry project/DSN for this app
 * yet. Reads the DSN from EXPO_PUBLIC_SENTRY_DSN (Expo's convention for client-readable env vars,
 * safe to be public since a DSN is a write-only ingestion endpoint, not a secret) and no-ops
 * entirely when it's unset, so nothing here can throw or "phone home" anywhere in dev/test/CI.
 * Once a real Sentry project exists: set EXPO_PUBLIC_SENTRY_DSN, and separately add the
 * `@sentry/react-native/expo` config plugin (org/project/auth token) to app.json for source-map
 * upload during the Codemagic build — deliberately not added yet, since misconfiguring it with
 * placeholder credentials could break the existing working CI build.
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

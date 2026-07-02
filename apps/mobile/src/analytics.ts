/**
 * Vendor-agnostic analytics facade. Call sites import only this file and call `trackEvent`; the
 * real backend (PostHog) is attached at runtime by analyticsClient.ts via `setAnalyticsSink`. This
 * keeps the facade import-light so it (and the modules that call it) stay unit-testable without
 * pulling the native SDK into the Vitest/node environment — the same pure-logic-vs-native split as
 * appReviewPolicy.ts vs appReview.ts. With no sink attached it logs to the console in dev and
 * no-ops everywhere else, so nothing leaves the device before/without a configured backend.
 *
 * Privacy note: in release builds a PostHog sink IS attached (see analyticsClient.ts), so these
 * events transmit. They carry no PII — only low-cardinality context (state code, platform label,
 * plan) — which is disclosed in docs/privacy.html and the App Store Connect App Privacy labels.
 */

/**
 * Canonical event names, in one place so the call sites and the paywall agree on spelling. The
 * premium-funnel events are fired by the PaywallScreen (screens/PaywallScreen.tsx).
 */
export const ANALYTICS_EVENTS = {
  onboardingCompleted: "onboarding_completed",
  entryLogged: "entry_logged",
  entryUpdated: "entry_updated",
  // Premium funnel — fired by the paywall (screens/PaywallScreen.tsx).
  paywallViewed: "paywall_viewed",
  purchaseStarted: "purchase_started",
  purchaseCompleted: "purchase_completed",
  restoreCompleted: "restore_completed",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * The minimal surface the real vendor client must implement. Decouples this module from the
 * PostHog SDK's full API and makes the dispatch logic trivially mockable in tests.
 */
export interface AnalyticsSink {
  capture(event: string, properties?: Record<string, unknown>): void;
}

let sink: AnalyticsSink | null = null;

/** Attach the real analytics backend (or detach with `null`). Called once at startup. */
export function setAnalyticsSink(next: AnalyticsSink | null): void {
  sink = next;
}

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (sink) {
    sink.capture(name, properties);
    return;
  }
  // `typeof` guard so reading the React Native `__DEV__` global can't throw in a plain-node test.
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log("[analytics]", name, properties ?? {});
  }
}

/**
 * Basic analytics instrumentation, scaffolded but not yet wired to a real destination — no
 * vendor has been chosen yet (PostHog/Amplitude/etc. are all reasonable options with Expo
 * support). This exists so call sites that want to track a meaningful event can do so now,
 * without needing to change when a real vendor is picked later — only this file's
 * implementation needs to change. Currently just logs to the console in dev and no-ops in
 * production, so it can't leak any data anywhere before a real backend is chosen.
 */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (__DEV__) {
    console.log("[analytics]", name, properties ?? {});
  }
}

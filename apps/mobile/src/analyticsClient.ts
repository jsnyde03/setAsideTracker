import PostHog from "posthog-react-native";

import { setAnalyticsSink } from "./analytics";

/**
 * Wires the real PostHog backend into the analytics facade. Kept separate from analytics.ts (which
 * stays import-light/testable) because importing the SDK pulls in React Native modules that can't
 * load in the Vitest/node test environment — same reason appReview.ts is split from
 * appReviewPolicy.ts.
 *
 * Reads the project key + host from EXPO_PUBLIC_ env vars. A PostHog *project API key* is a
 * write-only client key (not a secret) — safe to ship in the bundle, same rationale as the Sentry
 * DSN — so it lives in codemagic.yaml, set only for CI/TestFlight builds. With no key set (local
 * dev, tests, CI without the var) this leaves the sink unattached, so analytics no-ops exactly as
 * before a vendor was chosen.
 */
let client: PostHog | null = null;

export function initAnalytics(): void {
  if (client) return; // already initialized
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return; // no backend configured → facade stays a no-op
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  client = new PostHog(apiKey, { host });
  setAnalyticsSink({
    capture: (event, properties) => {
      // The facade accepts arbitrary serializable props (Record<string, unknown>); PostHog types
      // its properties as JsonType. Cast at this single boundary rather than constraining callers.
      client?.capture(event, properties as Parameters<PostHog["capture"]>[1]);
    },
  });
}

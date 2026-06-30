import { afterEach, describe, expect, it, vi } from "vitest";

import { ANALYTICS_EVENTS, setAnalyticsSink, trackEvent } from "./analytics";

afterEach(() => {
  setAnalyticsSink(null); // reset module-level sink between tests
});

describe("trackEvent", () => {
  it("forwards the event name and properties to the attached sink", () => {
    const capture = vi.fn();
    setAnalyticsSink({ capture });

    trackEvent(ANALYTICS_EVENTS.entryLogged, { platform: "uber" });

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith("entry_logged", { platform: "uber" });
  });

  it("passes undefined properties through unchanged", () => {
    const capture = vi.fn();
    setAnalyticsSink({ capture });

    trackEvent(ANALYTICS_EVENTS.paywallViewed);

    expect(capture).toHaveBeenCalledWith("paywall_viewed", undefined);
  });

  it("no-ops without throwing when no sink is attached", () => {
    // No sink attached: must not throw even with the RN `__DEV__` global absent in node.
    expect(() => trackEvent(ANALYTICS_EVENTS.onboardingCompleted, { state: "CA" })).not.toThrow();
  });

  it("stops forwarding once the sink is detached", () => {
    const capture = vi.fn();
    setAnalyticsSink({ capture });
    setAnalyticsSink(null);

    trackEvent(ANALYTICS_EVENTS.purchaseCompleted);

    expect(capture).not.toHaveBeenCalled();
  });
});

describe("ANALYTICS_EVENTS", () => {
  it("includes the premium-funnel events the paywall will fire", () => {
    expect(ANALYTICS_EVENTS).toMatchObject({
      paywallViewed: "paywall_viewed",
      purchaseStarted: "purchase_started",
      purchaseCompleted: "purchase_completed",
      restoreCompleted: "restore_completed",
    });
  });
});

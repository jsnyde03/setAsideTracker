import { afterEach, describe, expect, it, vi } from "vitest";
import { setAnalyticsSink, trackEvent } from "../analytics";
import { startDemoStore, stopDemoStore } from "../demo/demoMode";

/**
 * The three things that persist or act **outside** `repository.ts`, and therefore outside demo
 * mode's storage isolation. Each is guarded at its own choke point; these are the tests that make
 * those guards load-bearing rather than decorative.
 *
 * Two of the three (the review prompt and reminder scheduling) reach native modules, so they are
 * exercised through mocks here — and the mocks are asserted on for *absence*, which is the whole
 * claim. Neither can be proven on device from a unit test; that is 1.2.9's job.
 */

afterEach(() => {
  stopDemoStore();
  setAnalyticsSink(null);
  vi.clearAllMocks();
  vi.resetModules();
});

describe("analytics", () => {
  it("sends events when demo mode is off", () => {
    const capture = vi.fn();
    setAnalyticsSink({ capture });
    trackEvent("paywall_viewed", { plan: "annual" });
    expect(capture).toHaveBeenCalledWith("paywall_viewed", { plan: "annual" });
  });

  it("drops events entirely in demo mode — tagging would leave them in the funnel", () => {
    const capture = vi.fn();
    setAnalyticsSink({ capture });
    startDemoStore();
    trackEvent("paywall_viewed", { plan: "annual" });
    trackEvent("entry_logged");
    expect(capture).not.toHaveBeenCalled();
  });

  it("resumes sending once demo mode ends", () => {
    const capture = vi.fn();
    setAnalyticsSink({ capture });
    startDemoStore();
    trackEvent("entry_logged");
    stopDemoStore();
    trackEvent("entry_logged");
    expect(capture).toHaveBeenCalledTimes(1);
  });
});

describe("the App Store review prompt", () => {
  /**
   * Loads appReview with the native bits mocked, fresh each time so module state can't carry over.
   *
   * ⚠️ `demoMode` is returned from the SAME fresh module graph. `vi.resetModules()` gives each
   * dynamic import its own copy, so toggling the demo flag on a statically-imported `demoMode` would
   * be toggling a different instance than the one under test — and every guard would read `false`.
   */
  async function loadAppReview(platform: "ios" | "web" = "ios") {
    const requestReview = vi.fn(async () => {});
    const setItem = vi.fn(async () => {});
    vi.doMock("react-native", () => ({ Platform: { OS: platform } }));
    vi.doMock("expo-store-review", () => ({
      isAvailableAsync: async () => true,
      requestReview,
    }));
    vi.doMock("@react-native-async-storage/async-storage", () => ({
      default: { getItem: async () => null, setItem },
    }));
    const module = await import("../appReview");
    const demoMode = await import("../demo/demoMode");
    return { module, demoMode, requestReview, setItem };
  }

  it("asks once the threshold is met when demo mode is off", async () => {
    const { module, requestReview, setItem } = await loadAppReview();
    await expect(module.maybeRequestReview({ entryCount: 20, catchUpMet: false })).resolves.toBe(true);
    expect(requestReview).toHaveBeenCalled();
    expect(setItem).toHaveBeenCalled();
  });

  it("never prompts in demo mode, and never burns the one-shot flag", async () => {
    const { module, demoMode, requestReview, setItem } = await loadAppReview();
    // The demo seeds 20 entries against a threshold of 5 — without the guard this fires immediately.
    demoMode.startDemoStore();
    await expect(module.maybeRequestReview({ entryCount: 20, catchUpMet: true })).resolves.toBe(false);
    expect(requestReview).not.toHaveBeenCalled();
    // The irreversible half: the flag must be untouched, or the real user loses their one request.
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("quarterly reminders", () => {
  async function loadReminders() {
    const requestPermissionsAsync = vi.fn(async () => ({ status: "granted" }));
    const cancelAllScheduledNotificationsAsync = vi.fn(async () => {});
    const scheduleNotificationAsync = vi.fn(async () => "id");
    vi.doMock("react-native", () => ({ Platform: { OS: "ios" } }));
    vi.doMock("expo-notifications", () => ({
      requestPermissionsAsync,
      cancelAllScheduledNotificationsAsync,
      scheduleNotificationAsync,
      setNotificationChannelAsync: vi.fn(async () => {}),
      AndroidImportance: { DEFAULT: 3 },
      SchedulableTriggerInputTypes: { DATE: "date" },
    }));
    const module = await import("../notifications/scheduleReminders");
    // Same fresh-graph rule as loadAppReview above — see the note there.
    const demoMode = await import("../demo/demoMode");
    return { module, demoMode, requestPermissionsAsync, cancelAllScheduledNotificationsAsync, scheduleNotificationAsync };
  }

  it("schedules when demo mode is off", async () => {
    const { module, scheduleNotificationAsync } = await loadReminders();
    const result = await module.scheduleQuarterlyReminders();
    expect(result.scheduled).toBe(true);
    expect(scheduleNotificationAsync).toHaveBeenCalled();
  });

  it("schedules nothing in demo mode, and never raises the permission prompt", async () => {
    const { module, demoMode, requestPermissionsAsync, scheduleNotificationAsync } = await loadReminders();
    demoMode.startDemoStore();
    const result = await module.scheduleQuarterlyReminders();
    expect(result).toEqual({ scheduled: false, reason: "demo mode" });
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    // The permission dialog is a one-shot system prompt; the real app asks on its own terms.
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("does NOT cancel the real user's reminders when demo toggles them off", async () => {
    const { module, demoMode, cancelAllScheduledNotificationsAsync } = await loadReminders();
    demoMode.startDemoStore();
    await module.cancelQuarterlyReminders();
    // cancelAll wipes every scheduled notification on the device, demo's or not — this is the
    // data-loss path, and it looks like a harmless no-op from the toggle's point of view.
    expect(cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it("still cancels normally when demo mode is off", async () => {
    const { module, cancelAllScheduledNotificationsAsync } = await loadReminders();
    await module.cancelQuarterlyReminders();
    expect(cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });
});

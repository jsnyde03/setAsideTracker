import { afterEach, describe, expect, it, vi } from "vitest";
import { setAnalyticsSink, trackEvent } from "../analytics";
import { startDemoStore, stopDemoStore } from "../demo/demoMode";

/**
 * The things that persist or act **outside** `repository.ts`, and therefore outside demo mode's
 * storage isolation.
 *
 * ⚠️ **It was three until 1.2.5 quietly added a fourth.** The trip tracker writes raw AsyncStorage
 * and its author guarded the WRITE — but not the remove or the read, and those are the dangerous
 * directions: the key belongs to the real user, so stopping a demo trip DELETED a trip their phone
 * was holding. Found at the 1.2.8 handoff, from a backlog note that had been orphaned by a
 * renumber ("filed to 1.2.8, the lint item" — the lint item is now 1.2.11). Each is guarded at its own choke point; these are the tests that make
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

describe("the mileage trip tracker", () => {
  /**
   * Loads tripTracker with the native bits mocked, fresh each time. Same reason as the review
   * prompt: `demoMode` must come from the SAME module graph, or the guard reads a different flag
   * than the test sets.
   */
  async function loadTracker() {
    const removeItem = vi.fn(async () => {});
    const getItem = vi.fn(async () => JSON.stringify({ metres: 9999, startedAt: 1 }));
    vi.doMock("@react-native-async-storage/async-storage", () => ({
      default: { getItem, setItem: vi.fn(async () => {}), removeItem },
    }));
    vi.doMock("expo-location", () => ({
      stopLocationUpdatesAsync: vi.fn(async () => {}),
      startLocationUpdatesAsync: vi.fn(async () => {}),
      Accuracy: { Balanced: 3 },
    }));
    vi.doMock("expo-task-manager", () => ({
      isTaskRegisteredAsync: vi.fn(async () => true),
      defineTask: vi.fn(),
    }));
    const module = await import("../mileage/tripTracker");
    const demoMode = await import("../demo/demoMode");
    return { module, demoMode, removeItem, getItem };
  }

  it("clears the persisted trip when demo mode is off", async () => {
    const { module, removeItem } = await loadTracker();
    await module.stopTripTracking();
    expect(removeItem).toHaveBeenCalled();
  });

  /**
   * ⛔ The one that matters. [D6] lets an onboarded user open a demo from Settings, so a person with
   * a trip actually running can reach this — and the key is theirs, not the persona's.
   */
  it("never deletes the real user's trip from inside a demo", async () => {
    const { module, demoMode, removeItem } = await loadTracker();
    demoMode.startDemoStore();
    await module.stopTripTracking();
    expect(removeItem, "a demo stopped a real trip's persistence").not.toHaveBeenCalled();
  });

  it("does not restore the real user's trip into a demo session", async () => {
    const { module, demoMode, getItem } = await loadTracker();
    demoMode.startDemoStore();
    await module.resumeTripIfRunning();
    expect(getItem, "a demo read the real user's trip back").not.toHaveBeenCalled();
  });
});

/**
 * The fifth thing outside `repository.ts` (1.2.8.4) — and the first where crossing the boundary is
 * the **intent** rather than the bug.
 *
 * ⛔ **These tests assert the OPPOSITE of the trip tracker's, on purpose.** The tour runs over demo
 * data ([D29]), so a flag inside the demo store would reset on every entry — a fresh `Map` each
 * time — and the tour could never be skipped for good. Sharing is what makes "skip stays skipped"
 * true.
 *
 * ⚠️ **They exist so nobody `fixes` this into isolation.** Every other raw-AsyncStorage user in this
 * app is guarded against demo mode, so this one reads as an oversight at a glance; without a test
 * saying "shared, deliberately", the next sweep for unguarded keys would helpfully break it. All
 * three directions are pinned, which is the lesson the trip tracker paid for — it guarded the write
 * and left the read and the remove open.
 */
describe("the guided tour's seen flag", () => {
  async function loadFlag() {
    const store = new Map<string, string>();
    const setItem = vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    });
    const getItem = vi.fn(async (k: string) => store.get(k) ?? null);
    const removeItem = vi.fn(async (k: string) => {
      store.delete(k);
    });
    vi.doMock("@react-native-async-storage/async-storage", () => ({
      default: { getItem, setItem, removeItem },
    }));
    const module = await import("../tourFlag");
    const demoMode = await import("../demo/demoMode");
    return { module, demoMode, setItem, getItem, removeItem };
  }

  it("writes the flag from inside a demo — that is where the tour runs", async () => {
    const { module, demoMode, setItem } = await loadFlag();
    demoMode.startDemoStore();
    await module.markDashboardTourSeen();
    expect(
      setItem,
      "the tour only runs in demo, so a guarded write would never fire at all",
    ).toHaveBeenCalledWith("gigTaxTracker:dashboardTourSeen", "true");
  });

  it("a skip inside a demo still stays skipped after the demo ends", async () => {
    const { module, demoMode } = await loadFlag();
    demoMode.startDemoStore();
    await module.markDashboardTourSeen();
    demoMode.stopDemoStore();
    expect(
      await module.hasSeenDashboardTour(),
      "the flag did not survive leaving the demo — the tour would replay forever",
    ).toBe(true);
  });

  it("reports unseen before anything has been written", async () => {
    const { module } = await loadFlag();
    expect(await module.hasSeenDashboardTour()).toBe(false);
  });

  it("resets so the Settings replay row can run the tour again", async () => {
    const { module, removeItem } = await loadFlag();
    await module.markDashboardTourSeen();
    await module.resetDashboardTour();
    expect(removeItem).toHaveBeenCalledWith("gigTaxTracker:dashboardTourSeen");
    expect(await module.hasSeenDashboardTour()).toBe(false);
  });

  it("touches only its own key, so it can never reach the user's entries or profile", async () => {
    const { module, setItem, getItem, removeItem } = await loadFlag();
    await module.markDashboardTourSeen();
    await module.hasSeenDashboardTour();
    await module.resetDashboardTour();
    const keys = [...setItem.mock.calls, ...getItem.mock.calls, ...removeItem.mock.calls].map(
      (call) => call[0],
    );
    expect(new Set(keys)).toEqual(new Set(["gigTaxTracker:dashboardTourSeen"]));
  });
});

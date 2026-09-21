import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `refreshQuarterlyReminders` — the once-per-launch rebuild.
 *
 * Every test here asserts on `requestPermissionsAsync` **not** being called as well as on the
 * scheduling outcome. That is the whole design constraint: a refresh that runs on every cold start
 * must never be what raises the one-shot system dialog, and "it didn't schedule" would be true of a
 * version that prompted and was refused.
 */
async function loadReminders(permission: string) {
  vi.resetModules();
  const requestPermissionsAsync = vi.fn(async () => ({ status: "granted" }));
  const getPermissionsAsync = vi.fn(async () => ({ status: permission }));
  const cancelAllScheduledNotificationsAsync = vi.fn(async () => {});
  const scheduleNotificationAsync = vi.fn(async () => "id");
  vi.doMock("react-native", () => ({ Platform: { OS: "ios" } }));
  vi.doMock("expo-notifications", () => ({
    requestPermissionsAsync,
    getPermissionsAsync,
    cancelAllScheduledNotificationsAsync,
    scheduleNotificationAsync,
    setNotificationChannelAsync: vi.fn(async () => {}),
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DATE: "date" },
  }));
  const module = await import("../notifications/scheduleReminders");
  const demoMode = await import("../demo/demoMode");
  return { module, demoMode, requestPermissionsAsync, getPermissionsAsync, scheduleNotificationAsync };
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("react-native");
  vi.doUnmock("expo-notifications");
});

describe("refreshQuarterlyReminders", () => {
  it("rebuilds the queue when reminders are on and permission is already granted", async () => {
    const { module, scheduleNotificationAsync, requestPermissionsAsync } = await loadReminders("granted");

    const result = await module.refreshQuarterlyReminders(true);

    expect(result.scheduled).toBe(true);
    expect(scheduleNotificationAsync).toHaveBeenCalled();
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("schedules NOTHING when the user turned reminders off, even with permission still granted", async () => {
    // The regression this exists for: turning the switch off cancels the notifications but cannot
    // revoke the OS permission, so a refresh gated on permission alone would silently re-create
    // every reminder the user had deliberately switched off, on their very next launch.
    const { module, scheduleNotificationAsync, getPermissionsAsync } = await loadReminders("granted");

    const result = await module.refreshQuarterlyReminders(false);

    expect(result).toEqual({ scheduled: false, reason: "reminders disabled" });
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    // Checked before the permission is even queried — there is nothing to ask about.
    expect(getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("does nothing and never prompts when permission has not been granted", async () => {
    const { module, scheduleNotificationAsync, requestPermissionsAsync } = await loadReminders("undetermined");

    const result = await module.refreshQuarterlyReminders(true);

    expect(result).toEqual({ scheduled: false, reason: "permission not granted" });
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("does nothing in demo mode, and never raises the prompt", async () => {
    const { module, demoMode, scheduleNotificationAsync, requestPermissionsAsync, getPermissionsAsync } =
      await loadReminders("granted");
    demoMode.startDemoStore();

    const result = await module.refreshQuarterlyReminders(true);

    expect(result).toEqual({ scheduled: false, reason: "demo mode" });
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
    expect(getPermissionsAsync).not.toHaveBeenCalled();
  });
});

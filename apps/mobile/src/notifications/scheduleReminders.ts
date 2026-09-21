import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { isDemoModeActive } from "../demo/demoMode";
import { getUpcomingQuarterlyDueDates } from "./quarterlyDueDates";

const ANDROID_CHANNEL_ID = "tax-reminders";
const HEADS_UP_LEAD_DAYS = 7;
/** Only schedule the next few due dates — no need to queue years of notifications at once. */
const MAX_UPCOMING_DUE_DATES = 4;

export interface ScheduleResult {
  scheduled: boolean;
  reason?: string;
  notificationCount?: number;
}

function atNineAm(date: Date): Date {
  const result = new Date(date);
  result.setHours(9, 0, 0, 0);
  return result;
}

/**
 * Schedules local reminders for upcoming quarterly estimated-tax due dates: one "heads up"
 * notification 7 days before each due date, and one on the due date itself. Idempotent — clears
 * any previously scheduled reminders first, so calling this again (as the launch-time refresh does)
 * doesn't pile up duplicates.
 *
 * No-op on web: expo-notifications doesn't support reliable scheduled local notifications in a
 * browser tab, so this returns early there rather than silently failing or throwing. Real
 * scheduling needs to be verified on an actual device/Expo Go — this can't be confirmed by
 * automated testing alone since it depends on OS-level notification delivery at a future time.
 */
export async function scheduleQuarterlyReminders(): Promise<ScheduleResult> {
  if (Platform.OS === "web") {
    return { scheduled: false, reason: "not supported on web" };
  }

  // Demo mode schedules nothing. Reminders are real OS notifications that outlive the demo session
  // by months, computed from a persona's tax situation rather than the user's — so a demo that
  // scheduled them would put wrong dates on someone's real phone. This sits ABOVE the permission
  // request deliberately: a demo shouldn't even raise the notifications permission prompt, which is
  // a one-shot system dialog the real app wants to ask for on its own terms.
  if (isDemoModeActive()) {
    return { scheduled: false, reason: "demo mode" };
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    return { scheduled: false, reason: "permission not granted" };
  }

  return scheduleGrantedReminders();
}

/**
 * The scheduling itself, with **no permission step of its own** — each caller does its own, and they
 * deliberately differ: a user action may raise the prompt, a launch-time refresh may only read it.
 *
 * ⚠️ Extracted because `refreshQuarterlyReminders` originally delegated to the whole of
 * `scheduleQuarterlyReminders`, which meant it reached `requestPermissionsAsync` after all. That is
 * harmless while iOS resolves an already-granted request without a dialog — and that is the problem:
 * it made "the refresh never prompts" a property of the OS rather than of this file. A test asserting
 * the call count is what surfaced it.
 */
async function scheduleGrantedReminders(): Promise<ScheduleResult> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Tax reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const upcoming = getUpcomingQuarterlyDueDates(now).slice(0, MAX_UPCOMING_DUE_DATES);

  let notificationCount = 0;

  for (const { label, dueDate } of upcoming) {
    const dueAtNine = atNineAm(dueDate);
    const headsUpDate = new Date(dueAtNine);
    headsUpDate.setDate(headsUpDate.getDate() - HEADS_UP_LEAD_DAYS);

    if (headsUpDate.getTime() > now.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${label} due in ${HEADS_UP_LEAD_DAYS} days`,
          body: "Check your dashboard for how much to set aside.",
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: headsUpDate },
      });
      notificationCount++;
    }

    if (dueAtNine.getTime() > now.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${label} is due today`,
          body: "Make your estimated tax payment today to avoid a penalty.",
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueAtNine },
      });
      notificationCount++;
    }
  }

  return { scheduled: true, notificationCount };
}

/**
 * Rebuilds the scheduled reminders on app start, **without ever raising the permission prompt**.
 *
 * ## The two bugs this closes, both of which were invisible
 *
 * `scheduleQuarterlyReminders` is called from exactly two places — finishing onboarding, and the
 * Settings toggle. Nothing else, ever. That means:
 *
 * 1. **A queue that drains.** Only `MAX_UPCOMING_DUE_DATES` are scheduled, about a year's worth. A
 *    user who onboarded and never touched the toggle runs out of reminders after ~12 months and the
 *    feature stops, silently, with the switch still showing "on".
 * 2. **A fix that never arrives.** Notification content is frozen when it is scheduled, so an
 *    existing user upgrading into the corrected due dates keeps the old wrong ones until they think
 *    to toggle reminders off and on again. Shipping a deadline fix that reaches nobody already
 *    installed is not shipping it.
 *
 * ⚠️ **It asks `getPermissionsAsync`, not `requestPermissionsAsync`.** The scheduler deliberately
 * lets the *user's own action* raise the one-shot system dialog, on the app's terms; a refresh that
 * happens on every cold start must not be what triggers it. Not yet granted → do nothing, and the
 * next real toggle will ask properly.
 */
export async function refreshQuarterlyReminders(remindersEnabled: boolean): Promise<ScheduleResult> {
  if (Platform.OS === "web") return { scheduled: false, reason: "not supported on web" };
  if (isDemoModeActive()) return { scheduled: false, reason: "demo mode" };

  // ⚠️ Taken as an argument rather than read here, and it is not optional. The OS permission can
  // still be granted long after the user switched reminders OFF in Settings — that switch cancels
  // the notifications, it cannot revoke the permission. Refreshing on permission alone would
  // quietly re-create every reminder the user had deliberately turned off, on their next launch.
  if (!remindersEnabled) return { scheduled: false, reason: "reminders disabled" };

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return { scheduled: false, reason: "permission not granted" };

  return scheduleGrantedReminders();
}

/** Cancels any previously scheduled quarterly reminders — used when the user turns reminders off
 * in Settings. No-op on web for the same reason scheduleQuarterlyReminders is. */
export async function cancelQuarterlyReminders(): Promise<void> {
  if (Platform.OS === "web") return;

  // ⚠️ Guarded for the OPPOSITE reason to the scheduler, and it is the easier one to miss. This
  // cancels *all* scheduled notifications, so a visitor flicking the reminders toggle inside the
  // demo would silently delete the real user's genuine quarterly reminders — data-loss dressed as a
  // no-op. Demo mode has nothing scheduled of its own to cancel, so returning early loses nothing.
  if (isDemoModeActive()) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
}

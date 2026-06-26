import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
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
 * any previously scheduled reminders first, so calling this again (e.g. on every dashboard mount)
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

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    return { scheduled: false, reason: "permission not granted" };
  }

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

/** Cancels any previously scheduled quarterly reminders — used when the user turns reminders off
 * in Settings. No-op on web for the same reason scheduleQuarterlyReminders is. */
export async function cancelQuarterlyReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

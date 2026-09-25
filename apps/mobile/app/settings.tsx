import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { ColorSchemePreference } from "../src/ThemeContext";
import type { LocalUserProfile, TaxProfile } from "../src/types";
import { RequireTaxProfile } from "../src/components/RequireTaxProfile";
import { useDemo } from "../src/demo/DemoContext";
import { useGoBack } from "../src/hooks/useGoBack";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { SettingsScreen } from "../src/screens/SettingsScreen";
import { useAppData } from "../src/state/AppDataContext";
import { useTheme } from "../src/ThemeContext";
import {
  cancelQuarterlyReminders,
  scheduleQuarterlyReminders,
} from "../src/notifications/scheduleReminders";
import { reportError } from "../src/errorReporting";
import { resetDashboardTour } from "../src/tourFlag";

const SAVE_FAILED = "An unexpected error occurred. Please try again.";

export default function SettingsRoute() {
  const router = useRouter();
  const goBack = useGoBack();
  const { scheme, setScheme } = useTheme();
  const { isDemo, enterDemo, exitDemo } = useDemo();
  const {
    entries,
    localUserProfile,
    taxProfile,
    appLockEnabled,
    remindersEnabled,
    saveProfile,
    setAppLockEnabled,
    setRemindersEnabled,
    clearAllData,
    restoreBackup,
  } = useAppData();

  function alertFailure(title: string, error: unknown, where: string) {
    reportError(error, { where });
    Alert.alert(title, error instanceof Error ? error.message : SAVE_FAILED);
  }

  async function handleSaveProfile(profile: LocalUserProfile) {
    try {
      await saveProfile(profile);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (error) {
      alertFailure("Couldn't save your profile", error, "handleSaveProfile");
    }
  }

  async function handleToggleAppLock(enabled: boolean) {
    // Persists immediately, but deliberately doesn't lock right now even if turned on — that would
    // lock the user out of the Settings screen they're sitting in. It takes effect the next time the
    // app backgrounds or cold-starts, same as any other security setting.
    try {
      await setAppLockEnabled(enabled);
    } catch (error) {
      alertFailure("Couldn't save this setting", error, "handleToggleAppLock");
    }
  }

  async function handleChangeColorScheme(next: ColorSchemePreference) {
    try {
      await setScheme(next);
    } catch (error) {
      alertFailure("Couldn't save this setting", error, "handleChangeColorScheme");
    }
  }

  async function handleToggleReminders(enabled: boolean) {
    try {
      await setRemindersEnabled(enabled);
      if (enabled) {
        await scheduleQuarterlyReminders();
      } else {
        await cancelQuarterlyReminders();
      }
    } catch (error) {
      alertFailure("Couldn't save this setting", error, "handleToggleReminders");
    }
  }

  async function handleClearAllData() {
    try {
      await clearAllData();
      // `replace`, not `push` — the data this stack was built on no longer exists, so there is
      // nothing behind here worth going back to.
      router.replace("/onboarding");
    } catch (error) {
      alertFailure("Couldn't clear your data", error, "handleClearAllData");
    }
  }

  async function handleRestoreBackup(json: string) {
    // Throws on a malformed file — let SettingsScreen's caller show the error. The provider applies
    // the restored data and settings; what's left here is the parts it deliberately doesn't own: the
    // theme (ThemeProvider's), the notification schedule, and navigation.
    const restored = await restoreBackup(json);

    const restoredReminders = restored.appSettings.remindersEnabled ?? true;
    if (restored.appSettings.colorScheme) {
      // Re-persists the value the restore just wrote, which is a no-op against storage; the point is
      // bringing the live theme into line with it.
      await setScheme(restored.appSettings.colorScheme);
    }
    try {
      if (restoredReminders) {
        await scheduleQuarterlyReminders();
      } else {
        await cancelQuarterlyReminders();
      }
    } catch (error) {
      // A reminder-scheduling failure must not make a successful data restore look like a failure.
      reportError(error, { where: "handleRestoreBackup/reminders" });
    }

    router.replace(restored.localUserProfile && restored.taxProfile ? "/" : "/onboarding");
  }

  async function handleEnterDemo() {
    try {
      await enterDemo();
      // Straight to the dashboard. Staying on Settings would leave the visitor looking at a screen
      // whose profile name has quietly changed to someone else's, which reads as a bug rather than
      // as "you are now in a demo" — the populated dashboard is the thing worth showing.
      //
      // ⛔ **`dismissTo`, not `replace` (1.2.19).** `replace("/")` while a dashboard is already below
      // in the stack mounts a SECOND one and never unmounts the first — measured cumulatively at
      // 1 → 2 → 3 → 4 across three of these navigations. `dismissTo` pops back to the existing route
      // when there is one and falls back to replacing when there is not, which is exactly the two
      // cases here: Settings sits above a dashboard, onboarding does not.
      router.dismissTo("/");
    } catch (error) {
      reportError(error, { where: "handleEnterDemo" });
      Alert.alert("Couldn't start the demo", error instanceof Error ? error.message : SAVE_FAILED);
    }
  }

  async function handleExitDemo() {
    try {
      await exitDemo();
      // Always to "/", never conditionally to "/onboarding" like the restore above. The values in
      // this closure are the DEMO's, so they can't answer "does the real account have a profile?" —
      // and the dashboard route already derives that redirect from freshly-loaded data. Deciding it
      // here would mean deciding it from stale state.
      // `dismissTo` for the same reason as entering — see the note there.
      router.dismissTo("/");
    } catch (error) {
      reportError(error, { where: "handleExitDemo" });
      Alert.alert("Couldn't exit the demo", error instanceof Error ? error.message : SAVE_FAILED);
    }
  }

  /**
   * Replay: clear the one-shot, make sure we are in the sample account, and land on the dashboard
   * with the tour requested.
   *
   * ⚠️ **The request is a route param, not a second flag.** Clearing `dashboardTourSeen` alone would
   * not re-open the tour for somebody *already* in a demo — the dashboard only consults the flag
   * when demo mode changes, and it has not. The param says "show it now" regardless, which also
   * makes the tour reachable from a URL and therefore testable in the browser suite.
   */
  async function handleReplayTour() {
    try {
      await resetDashboardTour();
      if (!isDemo) await enterDemo();
      router.dismissTo({ pathname: "/", params: { tour: "1" } });
    } catch (error) {
      reportError(error, { where: "handleReplayTour" });
      Alert.alert("Couldn't start the tour", error instanceof Error ? error.message : SAVE_FAILED);
    }
  }

  return (
    <RequireTaxProfile>
      <ScreenFrame>
      <SettingsScreen
        localUserProfile={localUserProfile as LocalUserProfile}
        onSaveProfile={handleSaveProfile}
        taxProfile={taxProfile as TaxProfile}
        onEditTaxProfile={() => router.push("/tax-profile")}
        onOpenPaywall={() => router.push("/paywall")}
        entries={entries}
        appLockEnabled={appLockEnabled}
        onToggleAppLock={handleToggleAppLock}
        colorScheme={scheme}
        onChangeColorScheme={handleChangeColorScheme}
        remindersEnabled={remindersEnabled}
        onToggleReminders={handleToggleReminders}
        onClearAllData={handleClearAllData}
        onRestoreBackup={handleRestoreBackup}
        onClose={goBack}
        isDemo={isDemo}
        onEnterDemo={handleEnterDemo}
        onExitDemo={handleExitDemo}
        onReplayTour={handleReplayTour}
      />
      </ScreenFrame>
    </RequireTaxProfile>
  );
}

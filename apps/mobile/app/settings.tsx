import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { ColorSchemePreference } from "../src/ThemeContext";
import type { LocalUserProfile, TaxProfile } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { SettingsScreen } from "../src/screens/SettingsScreen";
import { useAppData } from "../src/state/AppDataContext";
import { useTheme } from "../src/ThemeContext";
import {
  cancelQuarterlyReminders,
  scheduleQuarterlyReminders,
} from "../src/notifications/scheduleReminders";
import { reportError } from "../src/errorReporting";

const SAVE_FAILED = "An unexpected error occurred. Please try again.";

export default function SettingsRoute() {
  const router = useRouter();
  const { scheme, setScheme } = useTheme();
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
    Alert.alert("Restored", "Your data has been restored from the backup file.");
  }

  return (
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
        onClose={() => router.back()}
      />
    </ScreenFrame>
  );
}

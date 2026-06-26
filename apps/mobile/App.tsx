import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Alert, AppState, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Entry, LocalUserProfile, TaxProfile } from "./src/types";
import {
  addEntry,
  clearAllLocalData,
  deleteEntry,
  getAppSettings,
  getEntries,
  getLocalUserProfile,
  getTaxProfile,
  restoreBackupSnapshot,
  saveAppSettings,
  saveLocalUserProfile,
  saveTaxProfile,
  updateEntry,
} from "./src/storage/repository";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { AddEntryScreen } from "./src/screens/AddEntryScreen";
import { EditTaxProfileScreen } from "./src/screens/EditTaxProfileScreen";
import { LockScreen } from "./src/screens/LockScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { isAppLockAvailable, unlockWithDeviceAuth } from "./src/security/appLock";
import { scheduleQuarterlyReminders } from "./src/notifications/scheduleReminders";
import { trackEvent } from "./src/analytics";
import { initErrorReporting, reportError } from "./src/errorReporting";
import { colors } from "./src/theme";

initErrorReporting();

type Screen = "loading" | "onboarding" | "dashboard" | "addEntry" | "settings" | "editTaxProfile";

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [localUserProfile, setLocalUserProfile] = useState<LocalUserProfile | null>(null);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  // Non-null means AddEntryScreen is showing in edit mode for this entry.
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // null = still checking whether a lock can be enforced on this device.
  const [lockAvailable, setLockAvailable] = useState<boolean | null>(null);
  // Whether the user has opted into app lock — defaults to off, even on devices that support it.
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showRetryHint, setShowRetryHint] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedProfile, storedTaxProfile, storedEntries, lockIsAvailable, storedAppSettings] =
          await Promise.all([
            getLocalUserProfile(),
            getTaxProfile(),
            getEntries(),
            isAppLockAvailable(),
            getAppSettings(),
          ]);

        setEntries(storedEntries);
        setLockAvailable(lockIsAvailable);
        setAppLockEnabled(storedAppSettings.appLockEnabled);
        setIsLocked(lockIsAvailable && storedAppSettings.appLockEnabled);

        if (storedProfile && storedTaxProfile) {
          setLocalUserProfile(storedProfile);
          setTaxProfile(storedTaxProfile);
          setScreen("dashboard");
          scheduleQuarterlyReminders();
        } else {
          setScreen("onboarding");
        }
      } catch (error) {
        // Without this, a failed load here leaves the app stuck on the loading spinner forever
        // with no feedback at all. Fall back to a safe, unlocked state so the user isn't stuck.
        setLockAvailable(false);
        setScreen("onboarding");
        Alert.alert(
          "Couldn't load your data",
          error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
        );
      }
    })();
  }, []);

  // Re-lock whenever the app returns from the background, so leaving and reopening the app
  // always requires unlocking again (not just on cold start).
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!lockAvailable || !appLockEnabled) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      // Only "background" means the user actually left the app. "inactive" is a noisy,
      // momentary state that also fires for things like the Face ID prompt itself or any
      // Alert.alert being shown — treating it the same as background caused the app to
      // immediately re-lock right after a successful unlock.
      if (appState.current === "background" && nextState === "active") {
        setIsLocked(true);
        setShowRetryHint(false);
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [lockAvailable, appLockEnabled]);

  async function handleUnlock() {
    const success = await unlockWithDeviceAuth();
    if (success) {
      setIsLocked(false);
      setShowRetryHint(false);
    } else {
      setShowRetryHint(true);
    }
  }

  async function handleOnboardingComplete(profile: LocalUserProfile, newTaxProfile: TaxProfile) {
    try {
      await saveLocalUserProfile(profile);
      await saveTaxProfile(newTaxProfile);
      setLocalUserProfile(profile);
      setTaxProfile(newTaxProfile);
      setScreen("dashboard");
      scheduleQuarterlyReminders();
      trackEvent("onboarding_completed", {
        state: newTaxProfile.state,
        hasW2Job: newTaxProfile.hasW2Job,
      });
    } catch (error) {
      // Without this, a failed save here silently leaves the user stuck on the onboarding
      // screen with no feedback at all — "Continue does nothing" with no error in sight.
      reportError(error, { where: "handleOnboardingComplete" });
      Alert.alert(
        "Couldn't save your info",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleSaveEntry(entry: Entry) {
    const isEditing = editingEntry !== null;
    try {
      const updated = isEditing ? await updateEntry(entry) : await addEntry(entry);
      setEntries(updated);
      setEditingEntry(null);
      setScreen("dashboard");
      trackEvent(isEditing ? "entry_updated" : "entry_logged", { platform: entry.platform });
    } catch (error) {
      reportError(error, { where: "handleSaveEntry" });
      Alert.alert(
        "Couldn't save this entry",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  function handleEditEntry(entry: Entry) {
    setEditingEntry(entry);
    setScreen("addEntry");
  }

  async function handleDeleteEntry(entryId: string) {
    try {
      const updated = await deleteEntry(entryId);
      setEntries(updated);
      setEditingEntry(null);
      setScreen("dashboard");
    } catch (error) {
      reportError(error, { where: "handleDeleteEntry" });
      Alert.alert(
        "Couldn't delete this entry",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  function handleCancelEntry() {
    setEditingEntry(null);
    setScreen("dashboard");
  }

  async function handleToggleAppLock(enabled: boolean) {
    // Persists immediately, but deliberately doesn't lock the app right now even if turned on —
    // that would lock the user out of the Settings screen they're sitting in. It takes effect
    // next time the app backgrounds/returns or cold-starts, same as any other security setting.
    setAppLockEnabled(enabled);
    try {
      await saveAppSettings({ appLockEnabled: enabled });
    } catch (error) {
      reportError(error, { where: "handleToggleAppLock" });
      Alert.alert(
        "Couldn't save this setting",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleSaveProfile(profile: LocalUserProfile) {
    try {
      await saveLocalUserProfile(profile);
      setLocalUserProfile(profile);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (error) {
      reportError(error, { where: "handleSaveProfile" });
      Alert.alert(
        "Couldn't save your profile",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleSaveTaxProfile(newTaxProfile: TaxProfile) {
    try {
      await saveTaxProfile(newTaxProfile);
      setTaxProfile(newTaxProfile);
      setScreen("settings");
    } catch (error) {
      reportError(error, { where: "handleSaveTaxProfile" });
      Alert.alert(
        "Couldn't save your tax profile",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleUpdateAmountSetAside(year: number, amount: number) {
    if (!taxProfile) return;
    const updated: TaxProfile = {
      ...taxProfile,
      amountSetAsideByYear: { ...taxProfile.amountSetAsideByYear, [year]: amount },
    };
    try {
      await saveTaxProfile(updated);
      setTaxProfile(updated);
    } catch (error) {
      reportError(error, { where: "handleUpdateAmountSetAside" });
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleClearAllData() {
    try {
      await clearAllLocalData();
      setEntries([]);
      setLocalUserProfile(null);
      setTaxProfile(null);
      setAppLockEnabled(false);
      setScreen("onboarding");
    } catch (error) {
      reportError(error, { where: "handleClearAllData" });
      Alert.alert(
        "Couldn't clear your data",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleRestoreBackup(json: string) {
    const restored = await restoreBackupSnapshot(json); // throws on a malformed file — let SettingsScreen's caller show the error
    setEntries(restored.entries);
    setLocalUserProfile(restored.localUserProfile);
    setTaxProfile(restored.taxProfile);
    setAppLockEnabled(restored.appSettings.appLockEnabled);
    setScreen(restored.localUserProfile && restored.taxProfile ? "dashboard" : "onboarding");
    Alert.alert("Restored", "Your data has been restored from the backup file.");
  }

  if (screen === "loading" || lockAvailable === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={styles.container}>
        <LockScreen onUnlock={handleUnlock} showRetryHint={showRetryHint} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (screen === "onboarding") {
    return (
      <View style={styles.container}>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (screen === "addEntry") {
    return (
      <View style={styles.container}>
        <AddEntryScreen
          entry={editingEntry ?? undefined}
          onSave={handleSaveEntry}
          onCancel={handleCancelEntry}
          onDelete={handleDeleteEntry}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (screen === "settings") {
    return (
      <View style={styles.container}>
        <SettingsScreen
          localUserProfile={localUserProfile as LocalUserProfile}
          onSaveProfile={handleSaveProfile}
          taxProfile={taxProfile as TaxProfile}
          onEditTaxProfile={() => setScreen("editTaxProfile")}
          entries={entries}
          appLockEnabled={appLockEnabled}
          onToggleAppLock={handleToggleAppLock}
          onClearAllData={handleClearAllData}
          onRestoreBackup={handleRestoreBackup}
          onClose={() => setScreen("dashboard")}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (screen === "editTaxProfile") {
    return (
      <View style={styles.container}>
        <EditTaxProfileScreen
          taxProfile={taxProfile as TaxProfile}
          onSave={handleSaveTaxProfile}
          onCancel={() => setScreen("settings")}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  // screen === "dashboard" — taxProfile is guaranteed set by this point
  return (
    <View style={styles.container}>
      <DashboardScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onAddEntry={() => setScreen("addEntry")}
        onEditEntry={handleEditEntry}
        onOpenSettings={() => setScreen("settings")}
        onUpdateAmountSetAside={handleUpdateAmountSetAside}
      />
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});

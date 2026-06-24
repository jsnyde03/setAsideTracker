import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Entry, LocalUserProfile, TaxProfile } from "./src/types";
import {
  addEntry,
  deleteEntry,
  getEntries,
  getLocalUserProfile,
  getTaxProfile,
  saveLocalUserProfile,
  saveTaxProfile,
  updateEntry,
} from "./src/storage/repository";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { AddEntryScreen } from "./src/screens/AddEntryScreen";
import { LockScreen } from "./src/screens/LockScreen";
import { isAppLockAvailable, unlockWithDeviceAuth } from "./src/security/appLock";
import { scheduleQuarterlyReminders } from "./src/notifications/scheduleReminders";
import { colors } from "./src/theme";

type Screen = "loading" | "onboarding" | "dashboard" | "addEntry";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
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
  const [isLocked, setIsLocked] = useState(false);
  const [showRetryHint, setShowRetryHint] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedProfile, storedTaxProfile, storedEntries, lockIsAvailable] = await Promise.all([
        getLocalUserProfile(),
        getTaxProfile(),
        getEntries(),
        isAppLockAvailable(),
      ]);

      setEntries(storedEntries);
      setLockAvailable(lockIsAvailable);
      setIsLocked(lockIsAvailable);

      if (storedProfile && storedTaxProfile) {
        setLocalUserProfile(storedProfile);
        setTaxProfile(storedTaxProfile);
        setScreen("dashboard");
        scheduleQuarterlyReminders();
      } else {
        setScreen("onboarding");
      }
    })();
  }, []);

  // Re-lock whenever the app returns from the background, so leaving and reopening the app
  // always requires unlocking again (not just on cold start).
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!lockAvailable) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        setIsLocked(true);
        setShowRetryHint(false);
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [lockAvailable]);

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
    await saveLocalUserProfile(profile);
    await saveTaxProfile(newTaxProfile);
    setLocalUserProfile(profile);
    setTaxProfile(newTaxProfile);
    setScreen("dashboard");
    scheduleQuarterlyReminders();
  }

  async function handleSaveEntry(entry: Entry) {
    const updated = editingEntry ? await updateEntry(entry) : await addEntry(entry);
    setEntries(updated);
    setEditingEntry(null);
    setScreen("dashboard");
  }

  function handleEditEntry(entry: Entry) {
    setEditingEntry(entry);
    setScreen("addEntry");
  }

  async function handleDeleteEntry(entryId: string) {
    const updated = await deleteEntry(entryId);
    setEntries(updated);
    setEditingEntry(null);
    setScreen("dashboard");
  }

  function handleCancelEntry() {
    setEditingEntry(null);
    setScreen("dashboard");
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

  // screen === "dashboard" — taxProfile is guaranteed set by this point
  return (
    <View style={styles.container}>
      <DashboardScreen
        entries={entries}
        taxProfile={taxProfile as TaxProfile}
        onAddEntry={() => setScreen("addEntry")}
        onEditEntry={handleEditEntry}
      />
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});

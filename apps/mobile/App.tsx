import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Alert, AppState, StyleSheet, View } from "react-native";
import type { Entry, FiledYearTax, LocalUserProfile, TaxProfile } from "./src/types";
// No storage imports left: as of 1.2.0.3 every read and write goes through AppDataProvider, so this
// component talks to data through one hook instead of to the persistence layer directly. That is what
// lets demo mode (1.2.1) redirect storage underneath without this file knowing.
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { AddEntryScreen } from "./src/screens/AddEntryScreen";
import { WhatIfScreen } from "./src/screens/WhatIfScreen";
import { W4OptimizerScreen } from "./src/screens/W4OptimizerScreen";
import { SafeHarborScreen } from "./src/screens/SafeHarborScreen";
import { YearOverYearScreen } from "./src/screens/YearOverYearScreen";
import { ExpenseBreakdownScreen } from "./src/screens/ExpenseBreakdownScreen";
import { PlatformComparisonScreen } from "./src/screens/PlatformComparisonScreen";
import { EditTaxProfileScreen } from "./src/screens/EditTaxProfileScreen";
import { PaywallScreen } from "./src/screens/PaywallScreen";
import { LockScreen } from "./src/screens/LockScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { isAppLockAvailable, unlockWithDeviceAuth } from "./src/security/appLock";
import { cancelQuarterlyReminders, scheduleQuarterlyReminders } from "./src/notifications/scheduleReminders";
import { trackEvent, ANALYTICS_EVENTS } from "./src/analytics";
import { maybeRequestReview } from "./src/appReview";
import { reportError } from "./src/errorReporting";
import { useAppData } from "./src/state/AppDataContext";
import { useTheme, type ColorSchemePreference } from "./src/ThemeContext";

// initErrorReporting/initAnalytics/initPurchases used to run here at module scope. They moved to
// `app/_layout.tsx` in 1.2.0.2 — leaving them in both places would double-initialise all three.

type Screen =
  | "loading"
  | "onboarding"
  | "dashboard"
  | "addEntry"
  | "settings"
  | "editTaxProfile"
  | "whatIf"
  | "w4Optimizer"
  | "safeHarbor"
  | "yearOverYear"
  | "expenseBreakdown"
  | "platformComparison"
  | "paywall";

/**
 * The app's screen machine. It is no longer the root: `app/_layout.tsx` owns the provider stack and
 * mounts this as a route (1.2.0.2), and the theme preference it used to lift now lives in
 * `ThemeProvider` itself. 1.2.0.4 dissolves the `useState<Screen>` dispatch below into real routes.
 */
export default function AppContent() {
  const { colors, isDark, scheme: colorScheme, setScheme } = useTheme();
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    loadingContainer: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  });
  // App data and the two non-theme settings live in AppDataProvider, above the router (1.2.0.3), so
  // every future route reads one copy. What's left here is navigation and lock state — navigation
  // dissolves into real routes at 1.2.0.4, and lock moves with the route guards at 1.2.0.5.
  const {
    ready,
    loadError,
    localUserProfile,
    taxProfile,
    entries,
    appLockEnabled,
    remindersEnabled,
    completeOnboarding,
    saveEntry,
    removeEntry,
    saveProfile,
    saveTaxProfile,
    updateAmountSetAside,
    updateFiledTax,
    setAppLockEnabled,
    setRemindersEnabled,
    clearAllData,
    restoreBackup,
  } = useAppData();

  // null = still checking whether a lock can be enforced on this device.
  const [lockAvailable, setLockAvailable] = useState<boolean | null>(null);
  // Tracks the UNLOCK, not the lock. Locked is the resting state whenever the setting is on, so
  // deriving it means the lock can't be left stale by a settings change — turning the lock off
  // releases the screen immediately, and clearing all data (which turns it off) can't strand the user
  // behind a lock on an app with no data in it.
  const [unlocked, setUnlocked] = useState(false);
  const isLocked = lockAvailable === true && appLockEnabled && !unlocked;
  const [showRetryHint, setShowRetryHint] = useState(false);

  // Navigation is DERIVED from the data, with an explicit override for user navigation. Storing the
  // boot decision in an effect instead meant "which screen opens" was a side effect of loading, which
  // is what made the loading state stick when anything failed. `navScreen` is only ever set by the
  // user going somewhere; before they do, where the app opens follows from whether a profile exists.
  const [navScreen, setNavScreen] = useState<Screen | null>(null);
  const bootSettled = ready && lockAvailable !== null;
  const screen: Screen =
    navScreen ?? (!bootSettled ? "loading" : localUserProfile && taxProfile ? "dashboard" : "onboarding");
  const setScreen = setNavScreen;
  // Non-null means AddEntryScreen is showing in edit mode for this entry.
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  // Where the paywall returns to when closed — the paywall is reachable from more than one screen
  // (Settings' PDF export, the entry form's locked mileage log), so it remembers its origin.
  const [paywallOrigin, setPaywallOrigin] = useState<Screen>("settings");

  // Whether the DEVICE can enforce a lock. A capability query, not app data, so it stays here rather
  // than in AppDataProvider.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const available = await isAppLockAvailable();
        if (!cancelled) setLockAvailable(available);
      } catch {
        // Treat an unanswerable capability query as "can't lock" — the safe direction is letting the
        // user in, not locking them out of their own data.
        if (!cancelled) setLockAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Surface a failed initial load. AppDataProvider records it rather than alerting, because it isn't
  // a UI layer; this is where the user actually hears about it, and `ready` still flips either way so
  // the app can never hang on the spinner.
  useEffect(() => {
    if (!loadError) return;
    Alert.alert(
      "Couldn't load your data",
      loadError instanceof Error ? loadError.message : "An unexpected error occurred. Please try again."
    );
  }, [loadError]);

  // Schedule reminders once, on the first settled boot with a complete profile. Guarded by a ref
  // rather than an empty dep array so it waits for the data without re-firing every time it changes.
  const bootRemindersScheduled = useRef(false);
  useEffect(() => {
    if (!ready || bootRemindersScheduled.current) return;
    bootRemindersScheduled.current = true;
    if (localUserProfile && taxProfile && remindersEnabled) {
      scheduleQuarterlyReminders().catch((error) => reportError(error, { where: "bootReminders" }));
    }
  }, [ready, localUserProfile, taxProfile, remindersEnabled]);

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
        setUnlocked(false);
        setShowRetryHint(false);
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [lockAvailable, appLockEnabled]);

  async function handleUnlock() {
    const success = await unlockWithDeviceAuth();
    if (success) {
      setUnlocked(true);
      setShowRetryHint(false);
    } else {
      setShowRetryHint(true);
    }
  }

  async function handleOnboardingComplete(profile: LocalUserProfile, newTaxProfile: TaxProfile) {
    try {
      await completeOnboarding(profile, newTaxProfile);
      setScreen("dashboard");
      if (remindersEnabled) scheduleQuarterlyReminders();
      trackEvent(ANALYTICS_EVENTS.onboardingCompleted, {
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
      const updated = await saveEntry(entry, isEditing);
      setEditingEntry(null);
      setScreen("dashboard");
      trackEvent(isEditing ? ANALYTICS_EVENTS.entryUpdated : ANALYTICS_EVENTS.entryLogged, {
        platform: entry.platform,
      });
      // After logging (not editing) a new entry, see if the user has hit the rating-prompt
      // milestone. Fire-and-forget: a failed/declined prompt must never block returning to the
      // dashboard. catchUpMet is left to the dashboard's own trigger (this is the 5th-entry path).
      if (!isEditing) {
        maybeRequestReview({ entryCount: updated.length, catchUpMet: false }).catch((error) =>
          reportError(error, { where: "maybeRequestReview" })
        );
      }
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
      await removeEntry(entryId);
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
    try {
      await setAppLockEnabled(enabled);
    } catch (error) {
      reportError(error, { where: "handleToggleAppLock" });
      Alert.alert(
        "Couldn't save this setting",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleChangeColorScheme(scheme: ColorSchemePreference) {
    try {
      await setScheme(scheme);
    } catch (error) {
      reportError(error, { where: "handleChangeColorScheme" });
      Alert.alert(
        "Couldn't save this setting",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
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
      reportError(error, { where: "handleToggleReminders" });
      Alert.alert(
        "Couldn't save this setting",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleSaveProfile(profile: LocalUserProfile) {
    try {
      await saveProfile(profile);
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
    try {
      await updateAmountSetAside(year, amount);
    } catch (error) {
      reportError(error, { where: "handleUpdateAmountSetAside" });
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleUpdateFiledTax(year: number, filed: FiledYearTax) {
    try {
      await updateFiledTax(year, filed);
    } catch (error) {
      reportError(error, { where: "handleUpdateFiledTax" });
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  async function handleClearAllData() {
    try {
      await clearAllData();
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
    // Throws on a malformed file — let SettingsScreen's caller show the error. The provider applies
    // the restored data and settings to state; what's left here is the parts it deliberately doesn't
    // own: the theme (ThemeProvider's), the notification schedule, and navigation.
    const restored = await restoreBackup(json);

    const restoredReminders = restored.appSettings.remindersEnabled ?? true;
    if (restored.appSettings.colorScheme) {
      // Re-persists the same value the restore just wrote, which is a no-op against storage; the
      // point is bringing the live theme into line with it.
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

    setScreen(restored.localUserProfile && restored.taxProfile ? "dashboard" : "onboarding");
    Alert.alert("Restored", "Your data has been restored from the backup file.");
  }

  if (screen === "loading" || lockAvailable === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={styles.container}>
        <LockScreen onUnlock={handleUnlock} showRetryHint={showRetryHint} />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (screen === "onboarding") {
    return (
      <View style={styles.container}>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style={isDark ? "light" : "dark"} />
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
          onOpenPaywall={() => {
            setPaywallOrigin("addEntry");
            setScreen("paywall");
          }}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (screen === "whatIf") {
    return (
      <View style={styles.container}>
        <WhatIfScreen
          entries={entries}
          taxProfile={taxProfile as TaxProfile}
          onClose={() => setScreen("dashboard")}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (screen === "w4Optimizer") {
    return (
      <View style={styles.container}>
        <W4OptimizerScreen
          entries={entries}
          taxProfile={taxProfile as TaxProfile}
          onClose={() => setScreen("dashboard")}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (screen === "safeHarbor") {
    return (
      <View style={styles.container}>
        <SafeHarborScreen
          entries={entries}
          taxProfile={taxProfile as TaxProfile}
          onClose={() => setScreen("dashboard")}
          onUpdateFiledTax={handleUpdateFiledTax}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (screen === "yearOverYear") {
    return (
      <View style={styles.container}>
        <YearOverYearScreen
          entries={entries}
          taxProfile={taxProfile as TaxProfile}
          onClose={() => setScreen("dashboard")}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (screen === "expenseBreakdown") {
    return (
      <View style={styles.container}>
        <ExpenseBreakdownScreen
          entries={entries}
          taxProfile={taxProfile as TaxProfile}
          onClose={() => setScreen("dashboard")}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (screen === "platformComparison") {
    return (
      <View style={styles.container}>
        <PlatformComparisonScreen entries={entries} onClose={() => setScreen("dashboard")} />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (screen === "paywall") {
    return (
      <View style={styles.container}>
        <PaywallScreen onClose={() => setScreen(paywallOrigin)} />
        <StatusBar style={isDark ? "light" : "dark"} />
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
          onOpenPaywall={() => {
            setPaywallOrigin("settings");
            setScreen("paywall");
          }}
          entries={entries}
          appLockEnabled={appLockEnabled}
          onToggleAppLock={handleToggleAppLock}
          colorScheme={colorScheme}
          onChangeColorScheme={handleChangeColorScheme}
          remindersEnabled={remindersEnabled}
          onToggleReminders={handleToggleReminders}
          onClearAllData={handleClearAllData}
          onRestoreBackup={handleRestoreBackup}
          onClose={() => setScreen("dashboard")}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
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
        <StatusBar style={isDark ? "light" : "dark"} />
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
        onOpenWhatIf={() => setScreen("whatIf")}
        onOpenPlatforms={() => setScreen("platformComparison")}
        onOpenW4Optimizer={() => setScreen("w4Optimizer")}
        onOpenSafeHarbor={() => setScreen("safeHarbor")}
        onOpenYearOverYear={() => setScreen("yearOverYear")}
        onOpenExpenseBreakdown={() => setScreen("expenseBreakdown")}
        onOpenPaywall={() => {
          setPaywallOrigin("dashboard");
          setScreen("paywall");
        }}
        onUpdateAmountSetAside={handleUpdateAmountSetAside}
      />
      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  );
}

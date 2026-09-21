import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, AppState, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { isAppLockAvailable, unlockWithDeviceAuth } from "../security/appLock";
import { useAppData } from "../state/AppDataContext";
import { useTheme } from "../ThemeContext";
import { LockScreen } from "../screens/LockScreen";
import { RecoveryScreen } from "../screens/RecoveryScreen";
import { pickBackupFile } from "../backupFile";
import { reportError } from "../errorReporting";

/**
 * Sits between the providers and the router: nothing routes until the app has loaded and, if the user
 * turned the lock on, until they've unlocked.
 *
 * This lived in `App.tsx`'s dispatch, above the thirteen screen branches. It had to move here at
 * 1.2.0.4 — a gate that wraps every screen can't live inside one of them once they're separate routes.
 * 1.2.0.5 hardens the guards on top of this (admitting the demo's not-yet-onboarded audience); this
 * step only relocates the behaviour, unchanged.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const { colors, isDark } = useTheme();
  const { ready, appLockEnabled, loadError, retryLoad, recoverFromBackupFile, eraseAndStartOver } =
    useAppData();

  // null = still checking whether a lock can be enforced on this device.
  const [lockAvailable, setLockAvailable] = useState<boolean | null>(null);
  // Tracks the UNLOCK, not the lock. Locked is the resting state whenever the setting is on, so
  // deriving it means the lock can't be left stale by a settings change — turning the lock off
  // releases the screen immediately, and clearing all data (which turns it off) can't strand the user
  // behind a lock on an app with no data in it.
  const [unlocked, setUnlocked] = useState(false);
  const [showRetryHint, setShowRetryHint] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const isLocked = lockAvailable === true && appLockEnabled && !unlocked;

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

  // Re-lock whenever the app returns from the background, so leaving and reopening always requires
  // unlocking again — not just on cold start.
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!lockAvailable || !appLockEnabled) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      // Only "background" means the user actually left. "inactive" is a noisy, momentary state that
      // also fires for the Face ID prompt itself and for any Alert being shown — treating it as
      // background made the app re-lock immediately after a successful unlock.
      if (appState.current === "background" && nextState === "active") {
        setUnlocked(false);
        setShowRetryHint(false);
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [lockAvailable, appLockEnabled]);

  // ─── Recovery ([D12]) ──────────────────────────────────────────────────────────────────────────

  async function handleRetry() {
    setRecovering(true);
    try {
      const recovered = await retryLoad();
      setRetryFailed(!recovered);
    } finally {
      setRecovering(false);
    }
  }

  async function handleRestore() {
    setRecovering(true);
    try {
      const json = await pickBackupFile();
      if (json === null) return; // the user cancelled the picker
      await recoverFromBackupFile(json);
    } catch (error) {
      reportError(error, { where: "AppGate/recoverFromBackup" });
      Alert.alert(
        "Couldn't restore that file",
        // Said plainly because the reassurance is the point: the parse happens before anything is
        // erased, so a bad file costs the user nothing.
        `${error instanceof Error ? error.message : "That file couldn't be read."}\n\nYour data on this device hasn't been changed.`
      );
    } finally {
      setRecovering(false);
    }
  }

  function handleErase() {
    Alert.alert(
      "Erase everything and start over?",
      "This permanently deletes the earnings and tax information on this device. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Erase",
          style: "destructive",
          onPress: () => {
            setRecovering(true);
            eraseAndStartOver()
              .catch((error: unknown) => {
                reportError(error, { where: "AppGate/eraseAndStartOver" });
                Alert.alert("Couldn't erase", "Something went wrong. Please try again.");
              })
              .finally(() => setRecovering(false));
          },
        },
      ]
    );
  }

  async function handleUnlock() {
    const success = await unlockWithDeviceAuth();
    setUnlocked(success);
    setShowRetryHint(!success);
  }

  if (!ready || lockAvailable === null) {
    return (
      <View style={[styles.centred, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  // ⚠️ Before the lock, deliberately. The app-lock setting is itself one of the values that could
  // not be read, so it defaults to off here — meaning the lock cannot be trusted to be *on* either.
  // Nothing on the recovery screen reveals data, and erasing is a thing an attacker could achieve by
  // deleting the app anyway.
  if (loadError !== null) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.bg }]}>
        <RecoveryScreen
          onRetry={handleRetry}
          onRestore={handleRestore}
          onErase={handleErase}
          busy={recovering}
          retryFailed={retryFailed}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.bg }]}>
        <LockScreen onUnlock={handleUnlock} showRetryHint={showRetryHint} />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centred: { flex: 1, alignItems: "center", justifyContent: "center" },
});

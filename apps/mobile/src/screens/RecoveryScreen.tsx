import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { radius, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface RecoveryScreenProps {
  onRetry: () => void;
  onRestore: () => void;
  onErase: () => void;
  /** Disables every action while one is in flight — all three are destructive or slow. */
  busy: boolean;
  /** Shown after a retry that did not help, so the screen doesn't look like it ignored the tap. */
  retryFailed: boolean;
}

/**
 * What a user sees when their data is on the device but cannot be opened.
 *
 * ⛔ **Before this existed the answer was the onboarding screen.** `loadError` was recorded by
 * `AppDataProvider` and read by nobody, so a failed load left a null profile, and the dashboard's
 * guard redirected on exactly that — greeting someone whose two years of earnings were still on the
 * disk with "welcome, let's get you set up". Onboarding then *wrote over* the profile.
 *
 * The three routes are [D12], and the order is deliberate:
 *
 * - **Try again** first, because the most likely cause is not damage at all. `expo-secure-store`
 *   defaults to `WHEN_UNLOCKED`, so a read before the device's first unlock after a reboot comes
 *   back empty and everything is fine a moment later. A screen that only offered destruction would
 *   be offering it for a transient condition.
 * - **Restore from a backup** second — the only genuine recovery the app has, and unreachable from
 *   here otherwise, since it lives in a Settings screen behind the router this gate sits above.
 * - **Erase** last and visually quietest, confirmed by its caller.
 *
 * ⚠️ It renders from theme **defaults**, never from stored settings: the settings are part of what
 * could not be read.
 */
export function RecoveryScreen({ onRetry, onRestore, onErase, busy, retryFailed }: RecoveryScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed-outline" size={30} color={colors.primary} />
        </View>

        <Text style={styles.title}>We couldn&apos;t open your data</Text>
        <Text style={styles.subtitle}>
          Your information is still on this device, but this app can&apos;t read it right now. If your
          phone restarted recently, trying again usually fixes it.
        </Text>
        {retryFailed && (
          <Text style={styles.retryHint} accessibilityLiveRegion="polite">
            Still no luck. If you have a backup file, restoring it will bring your data back.
          </Text>
        )}

        <View style={styles.actions}>
          <PrimaryButton label="Try again" onPress={onRetry} loading={busy} />
          <View style={styles.spacer} />
          <PrimaryButton label="Restore from a backup" onPress={onRestore} variant="secondary" disabled={busy} />
        </View>

        <Text style={styles.eraseIntro}>
          Nothing here deletes anything on its own. Erasing is permanent and can&apos;t be undone.
        </Text>
        <Text
          accessibilityRole="button"
          accessibilityLabel="Erase and start over"
          accessibilityState={{ disabled: busy }}
          style={[styles.erase, busy && styles.eraseDisabled]}
          onPress={busy ? undefined : onErase}
        >
          Erase and start over
        </Text>
      </View>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.bg },
    content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    title: { ...type.title, color: colors.ink, textAlign: "center" },
    subtitle: {
      ...type.body,
      color: colors.inkSubtle,
      textAlign: "center",
      marginTop: 10,
      maxWidth: 320,
    },
    retryHint: { ...type.body, color: colors.ink, textAlign: "center", marginTop: 14, maxWidth: 320 },
    actions: { alignSelf: "stretch", marginTop: 28 },
    spacer: { height: 12 },
    eraseIntro: {
      ...type.caption,
      color: colors.inkSubtle,
      textAlign: "center",
      marginTop: 28,
      maxWidth: 320,
    },
    erase: { ...type.body, color: colors.danger, textAlign: "center", marginTop: 12, padding: 12 },
    eraseDisabled: { opacity: 0.5 },
  });
}

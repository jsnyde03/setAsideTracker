import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { isAppLockAvailable } from "../security/appLock";
import { colors, radius, spacing, type } from "../theme";

interface SettingsScreenProps {
  appLockEnabled: boolean;
  onToggleAppLock: (enabled: boolean) => void;
  onClose: () => void;
}

export function SettingsScreen({ appLockEnabled, onToggleAppLock, onClose }: SettingsScreenProps) {
  // null = still checking device capability.
  const [lockAvailable, setLockAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    isAppLockAvailable().then(setLockAvailable);
  }, []);

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          style={styles.headerButton}
          hitSlop={8}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>App Lock</Text>
            <Text style={styles.rowHint}>
              {lockAvailable === false
                ? "Set up a passcode or Face ID/Touch ID on your device to use this."
                : "Require Face ID, Touch ID, or your device passcode to open the app."}
            </Text>
          </View>
          <Switch
            value={appLockEnabled}
            onValueChange={onToggleAppLock}
            disabled={lockAvailable !== true}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...type.subtitle, fontSize: 17, color: colors.ink },
  content: { padding: spacing.xl },
  sectionLabel: { ...type.title, fontSize: 17, color: colors.ink, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowText: { flex: 1 },
  rowLabel: { ...type.subtitle, color: colors.ink },
  rowHint: { ...type.micro, color: colors.inkSubtle, marginTop: 4, lineHeight: 15 },
});

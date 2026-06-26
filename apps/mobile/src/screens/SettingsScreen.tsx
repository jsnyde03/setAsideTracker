import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { Entry, LocalUserProfile, TaxProfile } from "../types";
import { buildBackupSnapshot } from "../backup";
import { pickBackupFile, saveBackupFile } from "../backupFile";
import { Chip } from "../components/Chip";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { exportEntriesAsCsv } from "../exportEntriesAsCsv";
import { reportError } from "../errorReporting";
import { isAppLockAvailable } from "../security/appLock";
import { radius, spacing, type, type Colors } from "../theme";
import { useTheme, type ColorSchemePreference } from "../ThemeContext";

interface SettingsScreenProps {
  localUserProfile: LocalUserProfile;
  onSaveProfile: (profile: LocalUserProfile) => void;
  taxProfile: TaxProfile;
  onEditTaxProfile: () => void;
  entries: Entry[];
  appLockEnabled: boolean;
  onToggleAppLock: (enabled: boolean) => void;
  colorScheme: ColorSchemePreference;
  onChangeColorScheme: (scheme: ColorSchemePreference) => void;
  onClearAllData: () => void;
  onRestoreBackup: (json: string) => Promise<void>;
  onClose: () => void;
}

const FILING_STATUS_LABELS: Record<TaxProfile["filingStatus"], string> = {
  single: "Single",
  marriedFilingJointly: "Married Filing Jointly",
};

const COLOR_SCHEME_OPTIONS: { label: string; value: ColorSchemePreference }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export function SettingsScreen({
  localUserProfile,
  onSaveProfile,
  taxProfile,
  onEditTaxProfile,
  entries,
  appLockEnabled,
  onToggleAppLock,
  colorScheme,
  onChangeColorScheme,
  onClearAllData,
  onRestoreBackup,
  onClose,
}: SettingsScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // null = still checking device capability.
  const [lockAvailable, setLockAvailable] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState(localUserProfile.displayName);
  const [email, setEmail] = useState(localUserProfile.email);
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    isAppLockAvailable().then(setLockAvailable);
  }, []);

  function handleSaveProfile() {
    if (displayName.trim().length === 0) {
      Alert.alert("Name required", "Enter a name so we know who this is for.");
      return;
    }
    onSaveProfile({ ...localUserProfile, displayName: displayName.trim(), email: email.trim() });
  }

  async function handleExportCsv() {
    if (entries.length === 0) {
      Alert.alert("No entries yet", "Log at least one entry before exporting.");
      return;
    }
    setExporting(true);
    try {
      await exportEntriesAsCsv(entries, `entries-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      reportError(error, { where: "handleExportCsv" });
      Alert.alert(
        "Couldn't export",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      const json = JSON.stringify(
        buildBackupSnapshot({ localUserProfile, taxProfile, entries, appSettings: { appLockEnabled } })
      );
      await saveBackupFile(json, `setasidetracker-backup-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (error) {
      reportError(error, { where: "handleBackup" });
      Alert.alert(
        "Couldn't create backup",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestore() {
    Alert.alert(
      "Restore from backup?",
      "This replaces everything currently stored on this device — your profile, tax profile, and every entry — with what's in the backup file. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Choose File & Restore",
          style: "destructive",
          onPress: async () => {
            setRestoring(true);
            try {
              const json = await pickBackupFile();
              if (json === null) return; // user canceled the file picker
              await onRestoreBackup(json);
            } catch (error) {
              reportError(error, { where: "handleRestore" });
              Alert.alert(
                "Couldn't restore backup",
                error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
              );
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  }

  function handleClearAllData() {
    Alert.alert(
      "Clear all data?",
      "This permanently deletes every entry, your profile, and your tax profile from this device. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear Everything", style: "destructive", onPress: onClearAllData },
      ]
    );
  }

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

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Profile</Text>
        <View style={styles.card}>
          <TextField label="Name" value={displayName} onChangeText={setDisplayName} />
          <TextField
            label="Email (optional)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <PrimaryButton label="Save Profile" onPress={handleSaveProfile} />
        </View>

        <Text style={styles.sectionLabel}>Tax Profile</Text>
        <Pressable
          onPress={onEditTaxProfile}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Edit tax profile"
        >
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{FILING_STATUS_LABELS[taxProfile.filingStatus]}</Text>
            <Text style={styles.rowHint}>
              {taxProfile.state}
              {taxProfile.county ? ` · ${taxProfile.county}` : ""}
              {taxProfile.hasW2Job ? " · Has W2 job" : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </Pressable>

        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.optionRow}>
          {COLOR_SCHEME_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={colorScheme === option.value}
              onPress={() => onChangeColorScheme(option.value)}
              flex
            />
          ))}
        </View>

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

        <Text style={styles.sectionLabel}>Data</Text>
        <Pressable
          onPress={handleExportCsv}
          disabled={exporting}
          style={({ pressed }) => [
            styles.row,
            styles.rowSpaced,
            pressed && styles.rowPressed,
            exporting && styles.rowDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Export data as CSV"
          accessibilityState={{ disabled: exporting, busy: exporting }}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Export Data (CSV)</Text>
            <Text style={styles.rowHint}>Download every logged entry as a spreadsheet file.</Text>
          </View>
          <Ionicons name="download-outline" size={18} color={colors.inkSubtle} />
        </Pressable>

        <Text style={styles.sectionLabel}>Backup & Restore</Text>
        <Pressable
          onPress={handleBackup}
          disabled={backingUp}
          style={({ pressed }) => [
            styles.row,
            styles.rowSpaced,
            pressed && styles.rowPressed,
            backingUp && styles.rowDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Create backup file"
          accessibilityState={{ disabled: backingUp, busy: backingUp }}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Create Backup File</Text>
            <Text style={styles.rowHint}>
              Save everything on this device to a file — move it to a new device, or keep it
              somewhere safe in case this one is lost.
            </Text>
          </View>
          <Ionicons name="cloud-download-outline" size={18} color={colors.inkSubtle} />
        </Pressable>
        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={({ pressed }) => [
            styles.row,
            pressed && styles.rowPressed,
            restoring && styles.rowDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Restore from backup file"
          accessibilityState={{ disabled: restoring, busy: restoring }}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Restore from Backup</Text>
            <Text style={styles.rowHint}>Replace everything on this device with a backup file.</Text>
          </View>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.inkSubtle} />
        </Pressable>

        <Text style={styles.sectionLabel}>Danger Zone</Text>
        <Pressable
          onPress={handleClearAllData}
          style={({ pressed }) => [styles.dangerButton, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Clear all data"
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.dangerLabel}>Clear All Data</Text>
        </Pressable>
        <Text style={styles.dangerHint}>
          Permanently deletes everything stored on this device — entries, profile, and tax profile.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
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
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  sectionLabel: { ...type.title, fontSize: 17, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.md },
  optionRow: { flexDirection: "row", gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowPressed: { opacity: 0.7 },
  rowDisabled: { opacity: 0.5 },
  rowSpaced: { marginBottom: spacing.sm },
  rowText: { flex: 1 },
  rowLabel: { ...type.subtitle, color: colors.ink },
  rowHint: { ...type.micro, color: colors.inkSubtle, marginTop: 4, lineHeight: 15 },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.danger,
    paddingVertical: 14,
  },
  dangerLabel: { ...type.subtitle, fontSize: 16, color: colors.danger },
  dangerHint: { ...type.micro, color: colors.inkFaint, marginTop: spacing.sm, lineHeight: 15 },
  });
}

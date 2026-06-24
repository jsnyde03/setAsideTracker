import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Entry, GigPlatform } from "../types";
import { Chip } from "../components/Chip";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { colors, spacing, type } from "../theme";

interface AddEntryScreenProps {
  onSave: (entry: Entry) => void;
  onCancel: () => void;
  /** Entry being edited, if any. Omitted (or undefined) means "log a new entry." */
  entry?: Entry;
  /** Only relevant in edit mode — deletes the entry being edited. */
  onDelete?: (entryId: string) => void;
}

const PLATFORM_OPTIONS: { label: string; value: GigPlatform }[] = [
  { label: "Amazon Flex", value: "amazonFlex" },
  { label: "Spark", value: "spark" },
  { label: "DoorDash", value: "doordash" },
  { label: "Uber", value: "uber" },
  { label: "Instacart", value: "instacart" },
  { label: "Other", value: "other" },
];

/**
 * Local "today" as YYYY-MM-DD. Deliberately not `new Date().toISOString().slice(0, 10)` — that's
 * always UTC, and every U.S. timezone is behind UTC, so it silently rolls over to tomorrow's date
 * during evening hours (exactly when a lot of gig shifts happen).
 */
function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function AddEntryScreen({ onSave, onCancel, entry, onDelete }: AddEntryScreenProps) {
  const isEditing = entry !== undefined;

  const [platform, setPlatform] = useState<GigPlatform>(entry?.platform ?? "amazonFlex");
  const [date, setDate] = useState(entry?.date ?? todayIsoDate());
  const [grossPay, setGrossPay] = useState(entry ? String(entry.grossPay) : "");
  const [tips, setTips] = useState(entry ? String(entry.tips) : "");
  const [mileage, setMileage] = useState(entry ? String(entry.mileage) : "");
  const [showExpenses, setShowExpenses] = useState(
    entry ? Object.values(entry.expenses).some((amount) => amount > 0) : false
  );
  const [parking, setParking] = useState(entry ? String(entry.expenses.parking) : "");
  const [tolls, setTolls] = useState(entry ? String(entry.expenses.tolls) : "");
  const [supplies, setSupplies] = useState(entry ? String(entry.expenses.supplies) : "");
  const [phone, setPhone] = useState(entry ? String(entry.expenses.phone) : "");

  function handleSave() {
    const grossPayValue = parseFloat(grossPay);
    if (Number.isNaN(grossPayValue) || grossPayValue < 0) {
      Alert.alert("Check gross pay", "Enter a valid gross pay amount.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Check date", "Enter the date as YYYY-MM-DD.");
      return;
    }

    const savedEntry: Entry = {
      id: entry?.id ?? `entry-${Date.now()}`,
      platform,
      date,
      grossPay: grossPayValue,
      tips: Math.max(0, parseFloat(tips) || 0),
      mileage: Math.max(0, parseFloat(mileage) || 0),
      expenses: {
        parking: Math.max(0, parseFloat(parking) || 0),
        tolls: Math.max(0, parseFloat(tolls) || 0),
        supplies: Math.max(0, parseFloat(supplies) || 0),
        phone: Math.max(0, parseFloat(phone) || 0),
      },
      createdAt: entry?.createdAt ?? new Date().toISOString(),
    };

    onSave(savedEntry);
  }

  function handleDelete() {
    if (!entry || !onDelete) return;
    Alert.alert("Delete entry?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(entry.id) },
    ]);
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
            style={styles.headerButton}
            hitSlop={8}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{isEditing ? "Edit Entry" : "Log Earnings"}</Text>
          {isEditing ? (
            <Pressable
              onPress={handleDelete}
              style={styles.headerButton}
              hitSlop={8}
              accessibilityLabel="Delete entry"
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Platform</Text>
          <View style={styles.optionGrid}>
            {PLATFORM_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={platform === option.value}
                onPress={() => setPlatform(option.value)}
              />
            ))}
          </View>

          <TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <TextField
            label="Gross pay"
            value={grossPay}
            onChangeText={setGrossPay}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          <TextField
            label="Tips"
            value={tips}
            onChangeText={setTips}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          <TextField
            label="Mileage (business miles driven)"
            value={mileage}
            onChangeText={setMileage}
            placeholder="0"
            keyboardType="decimal-pad"
          />

          <Pressable style={styles.expensesToggle} onPress={() => setShowExpenses(!showExpenses)}>
            <Ionicons
              name={showExpenses ? "chevron-up" : "add-circle-outline"}
              size={16}
              color={colors.primary}
            />
            <Text style={styles.expensesToggleText}>
              {showExpenses ? "Hide expenses" : "Add expenses (parking, tolls, supplies, phone)"}
            </Text>
          </Pressable>

          {showExpenses && (
            <>
              <TextField label="Parking" value={parking} onChangeText={setParking} placeholder="0.00" keyboardType="decimal-pad" />
              <TextField label="Tolls" value={tolls} onChangeText={setTolls} placeholder="0.00" keyboardType="decimal-pad" />
              <TextField label="Supplies" value={supplies} onChangeText={setSupplies} placeholder="0.00" keyboardType="decimal-pad" />
              <TextField label="Phone (business-use portion)" value={phone} onChangeText={setPhone} placeholder="0.00" keyboardType="decimal-pad" />
            </>
          )}

          <View style={styles.buttonGroup}>
            <PrimaryButton label={isEditing ? "Save Changes" : "Save Entry"} onPress={handleSave} />
            <PrimaryButton label="Cancel" onPress={onCancel} variant="ghost" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  fieldLabel: { ...type.label, color: colors.ink, marginTop: spacing.sm, marginBottom: 6 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  expensesToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  expensesToggleText: { color: colors.primary, ...type.label },
  buttonGroup: { marginTop: spacing.xl, gap: spacing.sm },
});

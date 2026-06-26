import { useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, type } from "../theme";
import { parseIsoDateLocal, toIsoDateLocal } from "../dateUtils";

interface DateFieldProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChangeValue: (value: string) => void;
}

function formatDisplay(iso: string): string {
  return parseIsoDateLocal(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Native (iOS/Android) date field — opens the system date picker instead of free-typed text, so
 * an invalid calendar date (Feb 30, a future date) can't be entered in the first place rather
 * than being caught after the fact. See DateField.web.tsx for the web equivalent — the native
 * picker library has no web support at all, so Metro picks whichever file matches the platform.
 */
export function DateField({ label, value, onChangeValue }: DateFieldProps) {
  const [show, setShow] = useState(false);

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    // Android's dialog auto-dismisses on selection or cancel; iOS's inline picker stays open
    // until the user taps elsewhere, so only Android needs an explicit hide here.
    if (Platform.OS === "android") setShow(false);
    if (event.type === "set" && selectedDate) {
      onChangeValue(toIsoDateLocal(selectedDate));
    }
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.input}
        onPress={() => setShow(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDisplay(value)}`}
      >
        <Text style={styles.valueText}>{formatDisplay(value)}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={parseIsoDateLocal(value)}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 14 },
  label: { ...type.label, color: colors.ink, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  valueText: { fontSize: 15, color: colors.ink },
});

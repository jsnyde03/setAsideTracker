import { StyleSheet, Text, View } from "react-native";
import { radius, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";
import { todayIsoDate } from "../dateUtils";

interface DateFieldProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChangeValue: (value: string) => void;
}

/**
 * Web equivalent of DateField.tsx — @react-native-community/datetimepicker has no web support at
 * all (confirmed against its docs), so this uses the browser's own native `<input type="date">`
 * instead. Metro resolves this file automatically for web builds in place of DateField.tsx.
 */
export function DateField({ label, value, onChangeValue }: DateFieldProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="date"
        value={value}
        max={todayIsoDate()}
        onChange={(event) => onChangeValue(event.target.value)}
        style={webInputStyle(colors)}
        aria-label={label}
      />
    </View>
  );
}

// The browser's own calendar popup is OS/browser-rendered chrome and can't be restyled from
// here — only the visible input box itself follows the theme.
function webInputStyle(colors: Colors): React.CSSProperties {
  return {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "solid",
    borderRadius: radius.md,
    paddingTop: 11,
    paddingBottom: 11,
    paddingLeft: 14,
    paddingRight: 14,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  };
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrapper: { marginTop: 14 },
    label: { ...type.label, color: colors.ink, marginBottom: 6 },
  });
}

import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { radius, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
}

export function TextField({ label, hint, style, ...inputProps }: TextFieldProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.inkFaint}
        {...inputProps}
      />
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrapper: { marginTop: 14 },
    label: { ...type.label, color: colors.ink, marginBottom: 6 },
    hint: { ...type.micro, color: colors.inkSubtle, marginBottom: 6, lineHeight: 15 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.ink,
      backgroundColor: colors.surface,
    },
  });
}

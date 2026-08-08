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
      {/*
        The visible label and hint are hidden from assistive tech because the input below now carries
        them as its own accessible name and description. Left exposed they'd be announced twice, and
        they'd also put a second element with the same text in the hierarchy — which is what forced
        tests to target these fields by placeholder-and-index rather than by name.
      */}
      {label && (
        <Text style={styles.label} accessibilityElementsHidden importantForAccessibility="no">
          {label}
        </Text>
      )}
      {hint && (
        <Text style={styles.hint} accessibilityElementsHidden importantForAccessibility="no">
          {hint}
        </Text>
      )}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.inkFaint}
        {...inputProps}
        // After the spread so it can't be lost, but deferring to an explicit one where a caller has
        // said something more specific. Without this every field in the app is an unnamed text box to
        // a screen reader — the visible label was never associated with the input.
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        accessibilityHint={inputProps.accessibilityHint ?? hint}
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

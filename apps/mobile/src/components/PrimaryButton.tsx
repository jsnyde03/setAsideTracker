import * as Haptics from "expo-haptics";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadowSm, type } from "../theme";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
}: PrimaryButtonProps) {
  function handlePress() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        pressed && !disabled && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === "primary" ? "#fff" : colors.primary} />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.label,
                variant === "primary" && styles.labelPrimary,
                variant === "secondary" && styles.labelSecondary,
                variant === "ghost" && styles.labelGhost,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary, ...shadowSm },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  ghost: { backgroundColor: "transparent", paddingVertical: 12 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { ...type.subtitle, fontSize: 16 },
  labelPrimary: { color: "#fff" },
  labelSecondary: { color: colors.ink },
  labelGhost: { color: colors.primary },
});

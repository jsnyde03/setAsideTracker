import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { radius, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  flex?: boolean;
}

export function Chip({ label, selected, onPress, flex }: ChipProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  function handlePress() {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        flex && styles.flex,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    chip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.surface,
      alignItems: "center",
    },
    flex: { flex: 1 },
    selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    pressed: { opacity: 0.7 },
    label: { ...type.label, color: colors.inkSubtle, fontWeight: "600" },
    labelSelected: { color: colors.primaryDark },
  });
}

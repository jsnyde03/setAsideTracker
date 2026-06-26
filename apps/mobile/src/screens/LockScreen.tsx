import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { radius, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface LockScreenProps {
  onUnlock: () => void;
  /** True if the previous unlock attempt failed, to show a retry hint. */
  showRetryHint: boolean;
}

export function LockScreen({ onUnlock, showRetryHint }: LockScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>Locked</Text>
        <Text style={styles.subtitle}>Unlock to view your earnings and tax info.</Text>
        {showRetryHint && <Text style={styles.retryHint}>That didn't work — try again.</Text>}
        <View style={styles.buttonWrap}>
          <PrimaryButton label="Unlock" onPress={onUnlock} />
        </View>
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
    title: { ...type.title, color: colors.ink, marginBottom: 8 },
    subtitle: { ...type.body, color: colors.inkSubtle, marginBottom: 24, textAlign: "center" },
    retryHint: { ...type.caption, color: colors.danger, marginBottom: 16 },
    buttonWrap: { width: "100%", maxWidth: 280 },
  });
}

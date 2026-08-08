import type { ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../ThemeContext";

/**
 * The themed background + status-bar pairing that every screen sits in.
 *
 * It was repeated verbatim in all thirteen branches of `App.tsx`'s screen dispatch. Extracting it at
 * 1.2.0.4 is what let each route file be thin — and it keeps the rendered output byte-identical, which
 * matters because the Playwright and Maestro suites match on what's on screen.
 */
export function ScreenFrame({ children }: { children: ReactNode }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {children}
      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

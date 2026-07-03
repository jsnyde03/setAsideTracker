import { forwardRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { radius, spacing, type } from "../theme";

export interface ShareCardData {
  year: number;
  totalEarnings: number;
  setAside: number;
  /** After-tax effective hourly rate, when hours have been logged. */
  hourlyRate?: number;
  /** Top-earning platform label, when one stands out. */
  topPlatformLabel?: string;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * The visual summary that gets captured (via react-native-view-shot) into a shareable image. Kept
 * as a standalone, self-contained branded card — fixed colors (not theme-dependent) so the exported
 * image looks identical in light and dark mode — and ref-forwarded so the share handler can snapshot
 * exactly this view.
 */
export const ShareCard = forwardRef<View, ShareCardData>(function ShareCard(
  { year, totalEarnings, setAside, hourlyRate, topPlatformLabel },
  ref
) {
  return (
    <View ref={ref} collapsable={false} style={styles.wrap}>
      <LinearGradient colors={["#1F2937", "#111827"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.brandRow}>
          <Ionicons name="shield-checkmark" size={16} color="#F5C451" />
          <Text style={styles.brand}>SetAsideTracker</Text>
        </View>

        <Text style={styles.label}>My {year} gig earnings</Text>
        <Text style={styles.earnings}>{formatCurrency(totalEarnings)}</Text>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Set aside for taxes</Text>
          <Text style={styles.statValue}>{formatCurrency(setAside)}</Text>
        </View>
        {hourlyRate !== undefined && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Effective hourly rate</Text>
            <Text style={styles.statValue}>{formatCurrency(hourlyRate)}/hr</Text>
          </View>
        )}
        {topPlatformLabel && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Top platform</Text>
            <Text style={styles.statValue}>{topPlatformLabel}</Text>
          </View>
        )}

        <Text style={styles.footer}>Tracked with SetAsideTracker</Text>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: "stretch" },
  card: { borderRadius: radius.xl, padding: spacing.xl },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg },
  brand: { ...type.label, color: "#E5E7EB", fontWeight: "700" },
  label: { ...type.caption, color: "#9CA3AF" },
  earnings: { fontSize: 40, fontWeight: "800", color: "#fff", letterSpacing: -1, marginTop: 4 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: spacing.lg },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  statLabel: { ...type.caption, color: "#D1D5DB" },
  statValue: { ...type.caption, color: "#fff", fontWeight: "700" },
  footer: { ...type.micro, color: "#6B7280", marginTop: spacing.md, textAlign: "center" },
});

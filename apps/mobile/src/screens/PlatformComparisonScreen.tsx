import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import type { Entry } from "../types";
import { comparePlatforms } from "../calculations";
import { PLATFORM_ICONS, PLATFORM_LABELS } from "../platforms";
import { Screen } from "../components/Screen";
import { radius, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface PlatformComparisonScreenProps {
  entries: Entry[];
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * Platform earnings comparison: ranks the year's gig platforms by total earnings and surfaces each
 * platform's effective hourly rate and entry count, so the user can see which platform actually
 * pays better per hour. Pure read-only aggregation (comparePlatforms) over logged entries.
 */
export function PlatformComparisonScreen({ entries, onClose }: PlatformComparisonScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const year = new Date().getFullYear();

  const stats = useMemo(() => comparePlatforms(entries, year), [entries, year]);
  const maxEarnings = stats.length > 0 ? Math.max(...stats.map((s) => s.totalEarnings)) : 0;
  // The best hourly rate among platforms that actually have hours logged — used to tag the winner.
  const bestHourlyRate = useMemo(() => {
    const rates = stats.map((s) => s.hourlyRate).filter((r): r is number => r !== undefined);
    return rates.length > 0 ? Math.max(...rates) : undefined;
  }, [stats]);

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Compare platforms</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Your {year} earnings by platform. The hourly rate is after expenses (before taxes) and only
          shows for platforms where you've logged hours.
        </Text>

        {stats.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={36} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No entries logged for {year} yet.</Text>
          </View>
        ) : (
          stats.map((stat) => {
            const isBestRate =
              stat.hourlyRate !== undefined && bestHourlyRate !== undefined && stat.hourlyRate === bestHourlyRate;
            return (
              <View key={stat.platform} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={PLATFORM_ICONS[stat.platform]} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.platformLabel}>{PLATFORM_LABELS[stat.platform]}</Text>
                    <Text style={styles.entryCount}>
                      {stat.entryCount} {stat.entryCount === 1 ? "entry" : "entries"}
                      {stat.totalHours > 0 ? ` · ${stat.totalHours.toLocaleString("en-US")} hrs` : ""}
                    </Text>
                  </View>
                  <View style={styles.cardValues}>
                    <Text style={styles.earnings}>{formatCurrency(stat.totalEarnings)}</Text>
                    {stat.hourlyRate !== undefined && (
                      <Text style={[styles.hourly, isBestRate && styles.hourlyBest]}>
                        {formatCurrency(stat.hourlyRate)}/hr{isBestRate ? " · best" : ""}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${maxEarnings > 0 ? (stat.totalEarnings / maxEarnings) * 100 : 0}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.disclaimer}>Based on your logged entries — hourly rates need hours logged to show.</Text>
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    headerTitle: { ...type.title, fontSize: 18, color: colors.ink },
    content: { padding: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
    intro: { ...type.caption, color: colors.inkSubtle, lineHeight: 18, marginBottom: spacing.lg },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...shadowSm,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardInfo: { flex: 1 },
    platformLabel: { ...type.subtitle, color: colors.ink },
    entryCount: { ...type.caption, color: colors.inkFaint, marginTop: 1 },
    cardValues: { alignItems: "flex-end" },
    earnings: { ...type.subtitle, color: colors.ink },
    hourly: { ...type.caption, color: colors.inkSubtle, marginTop: 1 },
    hourlyBest: { color: colors.accent, fontWeight: "700" },
    barTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      marginTop: spacing.sm,
      overflow: "hidden",
    },
    barFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
    emptyState: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
    emptyText: { ...type.body, color: colors.inkFaint, textAlign: "center" },
    disclaimer: { ...type.micro, color: colors.inkFaint, textAlign: "center", marginTop: spacing.md },
  });
}

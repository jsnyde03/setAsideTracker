import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import type { Entry } from "../types";
import { MIN_ENTRIES_PER_WEEKDAY, summarizeWeekdayEarnings } from "../weekdayEarnings";
import { Screen } from "../components/Screen";
import { radius, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface BestDaysScreenProps {
  entries: Entry[];
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * Which days of the week pay best, from the user's own logged shifts (Premium, [D20]).
 *
 * ⚠️ **Ranked by hourly rate, not by total earned** — see `weekdayEarnings.ts`. Total earnings rank
 * the days already worked most, which the user knows and cannot act on.
 *
 * ⛔ **This screen does not compare platforms.** That already exists, for free, on
 * `PlatformComparisonScreen`, and moving it here would remove something free.
 */
export function BestDaysScreen({ entries, onClose }: BestDaysScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const year = new Date().getFullYear();

  const summary = useMemo(() => summarizeWeekdayEarnings(entries, year), [entries, year]);
  const bestRate = summary.ranked[0]?.hourlyRate;

  // Thin and empty days are listed rather than hidden: "we don't know about Tuesday yet" is useful
  // and true, and a screen showing only four days silently implies the other three are bad.
  const thin = summary.weekdays.filter(
    (day) => !summary.ranked.includes(day) && day.entryCount > 0
  );
  const empty = summary.weekdays.filter((day) => day.entryCount === 0);

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Best days to work</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Your {year} shifts grouped by day of the week, ranked by what you actually kept per hour —
          earnings after expenses, before taxes.
        </Text>

        {!summary.hasEnoughData ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={36} color={colors.inkFaint} />
            <Text style={styles.emptyText}>
              Not enough logged yet to compare days. A day needs {MIN_ENTRIES_PER_WEEKDAY} shifts with
              hours recorded before it means anything, and this needs at least two such days to
              compare.
            </Text>
          </View>
        ) : (
          <>
            {summary.ranked.map((day) => {
              const isBest = day.hourlyRate !== undefined && day.hourlyRate === bestRate;
              return (
                <View key={day.weekday} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <Text style={styles.entryCount}>
                        {day.entryCount} {day.entryCount === 1 ? "shift" : "shifts"}
                        {day.totalHours > 0 ? ` · ${day.totalHours.toLocaleString("en-US")} hrs` : ""}
                      </Text>
                    </View>
                    <View style={styles.cardValues}>
                      <Text style={[styles.hourly, isBest && styles.hourlyBest]}>
                        {formatCurrency(day.hourlyRate ?? 0)}/hr{isBest ? " · best" : ""}
                      </Text>
                      <Text style={styles.netEarnings}>{formatCurrency(day.netEarnings)} kept</Text>
                    </View>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${bestRate && bestRate > 0 ? ((day.hourlyRate ?? 0) / bestRate) * 100 : 0}%` },
                      ]}
                    />
                  </View>
                </View>
              );
            })}

            {thin.length > 0 && (
              <Text style={styles.note}>
                Not enough yet to rank:{" "}
                {thin.map((day) => `${day.label} (${day.entryCount})`).join(", ")}.
              </Text>
            )}
            {empty.length > 0 && (
              <Text style={styles.note}>
                No shifts logged on {empty.map((day) => day.label).join(", ")}.
              </Text>
            )}
          </>
        )}

        <Text style={styles.disclaimer}>
          Your own history, not a forecast — it says what these days have paid you, not what they will.
          A day needs hours logged to be ranked at all.
        </Text>
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
    cardInfo: { flex: 1 },
    dayLabel: { ...type.subtitle, color: colors.ink },
    entryCount: { ...type.caption, color: colors.inkFaint, marginTop: 1 },
    cardValues: { alignItems: "flex-end" },
    hourly: { ...type.subtitle, color: colors.ink },
    hourlyBest: { color: colors.accent, fontWeight: "700" },
    netEarnings: { ...type.caption, color: colors.inkSubtle, marginTop: 1 },
    barTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      marginTop: spacing.sm,
      overflow: "hidden",
    },
    barFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
    emptyState: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
    emptyText: { ...type.body, color: colors.inkFaint, textAlign: "center", lineHeight: 20 },
    note: { ...type.micro, color: colors.inkFaint, marginTop: spacing.sm, lineHeight: 16 },
    disclaimer: { ...type.micro, color: colors.inkFaint, textAlign: "center", marginTop: spacing.lg, lineHeight: 16 },
  });
}

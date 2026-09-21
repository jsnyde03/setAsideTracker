import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { WeeklySetAside } from "../calculations";
import { radius, shadow, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface WeeklySetAsideSheetProps {
  /** Every week with logged work in the selected year, most recent first. Null hides the sheet. */
  weeks: WeeklySetAside[] | null;
  year: number;
  onClose: () => void;
}

/** Local copy, matching the ten others in this codebase rather than introducing an eleventh
 *  convention. Consolidating them is filed to the backlog, not done as a side effect here. */
function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Same reason as BreakdownDetailSheet: react-native-web's rAF-driven animations can stall on a
// headless or backgrounded tab, so the slide is native-only.
const SHEET_ANIMATION = Platform.OS === "web" ? "none" : "slide";

/** "Mon 15 Jun" from a YYYY-MM-DD string, formatted in UTC so it cannot slip a day — the same
 *  reason `weekStartOf` never touches local time. */
function formatWeekDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Every week the user has worked in a year, and what each one said to set aside ([D15]: this sits
 * behind a tap; the current week is on the dashboard itself).
 *
 * Purely presentational — `weeklySetAsides` owns the arithmetic. A week marked `estimated` is
 * labelled as such ([D14]): its figure was derived from the year's current rate because the entries
 * predate the frozen one, and presenting a reconstruction as though it had been frozen at the time
 * is exactly what [D7] exists to prevent.
 */
export function WeeklySetAsideSheet({ weeks, year, onClose }: WeeklySetAsideSheetProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const anyEstimated = (weeks ?? []).some((week) => week.estimated);

  return (
    <Modal
      visible={weeks !== null}
      transparent
      animationType={SHEET_ANIMATION}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropFill} onPress={onClose} accessibilityLabel="Dismiss weekly set-aside" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Set aside by week ({year})</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.inkSubtle} />
              </Pressable>
            </View>

            {weeks?.length === 0 ? (
              <Text style={styles.empty}>No shifts logged this year yet.</Text>
            ) : (
              weeks?.map((week) => (
                <View key={week.weekStart} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>
                      {formatWeekDay(week.weekStart)} – {formatWeekDay(week.weekEnd)}
                    </Text>
                    <Text style={styles.rowHint}>
                      {week.entryCount} {week.entryCount === 1 ? "shift" : "shifts"} ·{" "}
                      {formatCurrency(week.netProfit)} after expenses
                      {week.estimated ? " · estimated" : ""}
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>{formatCurrency(week.setAside)}</Text>
                </View>
              ))
            )}

            {anyEstimated && (
              <Text style={styles.footnote}>
                Weeks marked estimated were logged before this app started recording a set-aside rate
                with each shift, so their figures use this year&apos;s rate rather than the rate at the
                time.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
    backdropFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      maxHeight: "80%",
      ...shadow,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
      marginTop: spacing.sm,
    },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { ...type.title, color: colors.ink, flexShrink: 1 },
    empty: { ...type.body, color: colors.inkSubtle, marginTop: spacing.md },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowText: { flexShrink: 1 },
    rowLabel: { ...type.label, color: colors.ink },
    rowHint: { ...type.caption, color: colors.inkSubtle, marginTop: 2 },
    rowValue: { ...type.subtitle, color: colors.ink },
    footnote: { ...type.caption, color: colors.inkSubtle, marginTop: spacing.md },
  });
}

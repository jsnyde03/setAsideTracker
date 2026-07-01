import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Entry, TaxProfile } from "../types";
import { computeTaxEstimate, entriesForYear } from "../calculations";
import { buildScheduleCSummary } from "../scheduleC";
import { Screen } from "../components/Screen";
import { radius, shadow, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface ExpenseBreakdownScreenProps {
  entries: Entry[];
  taxProfile: TaxProfile;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * Expense breakdown (Premium). Surfaces the year's deductible expenses grouped onto their IRS
 * Schedule C lines — the same mapping the PDF export prints, but on-screen so the value of custom
 * expense categories (which roll into Line 27 "Other expenses", broken out per category) is visible
 * without exporting a document first. A thin view over buildScheduleCSummary; scoped to the current
 * calendar year to match the PDF export and the other premium calc screens.
 */
export function ExpenseBreakdownScreen({ entries, taxProfile, onClose }: ExpenseBreakdownScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const year = new Date().getFullYear();

  const { scheduleC, mileage, parkingTolls } = useMemo(() => {
    const estimate = computeTaxEstimate(entries, taxProfile, year);
    const mileageDeduction = estimate.estimate.mileageDeduction;
    const yearEntries = entriesForYear(entries, year);
    const summary = buildScheduleCSummary(yearEntries, mileageDeduction.deductionAmount);
    // Line 9 = mileage deduction + parking + tolls; the summary combines them, so recover the
    // parking/tolls slice for the sub-caption by subtracting the mileage piece back out.
    const line9 = summary.expenseLines.find((l) => l.line === "9");
    return {
      scheduleC: summary,
      mileage: mileageDeduction,
      parkingTolls: line9 ? Math.max(0, line9.amount - mileageDeduction.deductionAmount) : 0,
    };
  }, [entries, taxProfile, year]);

  const hasCustom = scheduleC.otherExpenses.length > 0;
  const visibleLines = scheduleC.expenseLines.filter((line) => line.amount > 0);

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Expense breakdown</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {scheduleC.totalExpenses <= 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>No expenses logged yet</Text>
            <Text style={styles.emptyBody}>
              Log mileage, supplies, phone, or custom expense categories on your {year} entries and
              they'll show here, grouped by the IRS Schedule C line they belong to.
            </Text>
          </View>
        ) : (
          <>
            <LinearGradient colors={["#4F46E5", "#4338CA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <Text style={styles.heroLabel}>Deductible expenses · {year}</Text>
              <Text
                style={styles.heroValue}
                accessibilityLabel={`Total deductible expenses ${formatCurrency(scheduleC.totalExpenses)} in ${year}`}
              >
                {formatCurrency(scheduleC.totalExpenses)}
              </Text>
              <Text style={styles.heroSub}>
                Reduces your net business profit to {formatCurrency(scheduleC.netProfit)}.
              </Text>
            </LinearGradient>

            <Text style={styles.sectionHeader}>By Schedule C line</Text>
            <View style={styles.card}>
              {visibleLines.map((line, index) => {
                const isOther = line.line === "27";
                return (
                  <View key={line.line} style={[styles.lineGroup, index > 0 && styles.lineGroupDivider]}>
                    <View style={styles.lineRow}>
                      <Text style={styles.lineLabel}>
                        Line {line.line} · {line.label}
                      </Text>
                      <Text style={styles.lineValue}>{formatCurrency(line.amount)}</Text>
                    </View>
                    {line.line === "9" && (
                      <Text style={styles.lineCaption}>
                        {mileage.miles > 0
                          ? `${mileage.miles.toLocaleString("en-US")} mi × ${formatCurrency(mileage.ratePerMile)}/mi = ${formatCurrency(mileage.deductionAmount)}`
                          : ""}
                        {mileage.miles > 0 && parkingTolls > 0 ? "  ·  " : ""}
                        {parkingTolls > 0 ? `parking & tolls ${formatCurrency(parkingTolls)}` : ""}
                      </Text>
                    )}
                    {isOther &&
                      scheduleC.otherExpenses.map((other) => (
                        <View key={other.label} style={styles.subRow}>
                          <Text style={styles.subLabel} numberOfLines={1}>
                            {other.label}
                          </Text>
                          <Text style={styles.subValue}>{formatCurrency(other.amount)}</Text>
                        </View>
                      ))}
                  </View>
                );
              })}
              <View style={[styles.lineRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Line 28 · Total expenses</Text>
                <Text style={styles.totalValue}>{formatCurrency(scheduleC.totalExpenses)}</Text>
              </View>
            </View>

            {!hasCustom && (
              <View style={styles.hintCard}>
                <Ionicons name="bulb-outline" size={18} color={colors.primary} />
                <Text style={styles.hintText}>
                  Deducting write-offs beyond mileage, supplies, and phone — health insurance, car
                  washes, hot bags? Add them as custom expense categories when logging an entry and
                  they'll appear here, grouped as Schedule C "Other expenses."
                </Text>
              </View>
            )}

            <Text style={styles.disclaimer}>
              Expenses are grouped onto the IRS Schedule C lines they map to — the same layout as your
              tax-ready PDF export. Estimates for planning only, not tax advice.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    flex: { flex: 1 },
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

    emptyCard: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.xl,
      gap: spacing.sm,
      ...shadowSm,
    },
    emptyTitle: { ...type.title, fontSize: 18, color: colors.ink, marginTop: spacing.sm },
    emptyBody: { ...type.caption, color: colors.inkSubtle, textAlign: "center", lineHeight: 20 },

    hero: { borderRadius: radius.xl, padding: spacing.lg, ...shadow },
    heroLabel: { ...type.label, color: "#E0E7FF", fontWeight: "600" },
    heroValue: { fontSize: 38, fontWeight: "800", marginTop: 6, color: "#fff", letterSpacing: -0.5 },
    heroSub: { ...type.caption, color: "#EEF2FF", marginTop: 6 },

    sectionHeader: { ...type.title, fontSize: 16, color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.sm },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      ...shadowSm,
    },
    lineGroup: { paddingVertical: spacing.md },
    lineGroupDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
    lineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    lineLabel: { ...type.body, color: colors.ink, flex: 1, paddingRight: spacing.sm },
    lineValue: { ...type.body, color: colors.ink, fontWeight: "700" },
    lineCaption: { ...type.micro, color: colors.inkSubtle, marginTop: 3 },
    subRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.sm,
      paddingLeft: spacing.md,
    },
    subLabel: { ...type.caption, color: colors.inkSubtle, flex: 1, paddingRight: spacing.sm },
    subValue: { ...type.caption, color: colors.inkSubtle, fontWeight: "600" },
    totalRow: {
      borderTopWidth: 1.5,
      borderTopColor: colors.border,
      paddingVertical: spacing.md,
    },
    totalLabel: { ...type.body, color: colors.ink, fontWeight: "700" },
    totalValue: { ...type.body, color: colors.ink, fontWeight: "800" },

    hintCard: {
      flexDirection: "row",
      gap: spacing.sm,
      alignItems: "flex-start",
      backgroundColor: colors.primarySoft,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    hintText: { flex: 1, ...type.caption, color: colors.ink, lineHeight: 19 },

    disclaimer: { ...type.micro, color: colors.inkFaint, textAlign: "center", marginTop: spacing.xl, lineHeight: 15 },
  });
}

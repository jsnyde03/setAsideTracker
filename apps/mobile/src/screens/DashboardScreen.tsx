import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Entry, TaxProfile } from "../types";
import {
  aggregateEntries,
  computeCatchUpStatus,
  computeTaxEstimate,
  effectiveHourlyRate,
  entriesForYear,
} from "../calculations";
import { getUpcomingQuarterlyDueDates } from "../notifications/quarterlyDueDates";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { colors, radius, shadow, shadowSm, spacing, type } from "../theme";

interface DashboardScreenProps {
  entries: Entry[];
  taxProfile: TaxProfile;
  onAddEntry: () => void;
  onEditEntry: (entry: Entry) => void;
  onOpenSettings: () => void;
  onUpdateAmountSetAside: (year: number, amount: number) => void;
}

const PLATFORM_LABELS: Record<Entry["platform"], string> = {
  amazonFlex: "Amazon Flex",
  spark: "Spark",
  doordash: "DoorDash",
  uber: "Uber",
  instacart: "Instacart",
  other: "Other",
};

const PLATFORM_ICONS: Record<Entry["platform"], keyof typeof Ionicons.glyphMap> = {
  amazonFlex: "cube-outline",
  spark: "flash-outline",
  doordash: "fast-food-outline",
  uber: "car-outline",
  instacart: "basket-outline",
  other: "ellipsis-horizontal-circle-outline",
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function totalEntryExpenses(entry: Entry): number {
  return entry.expenses.parking + entry.expenses.tolls + entry.expenses.supplies + entry.expenses.phone;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DashboardScreen({
  entries,
  taxProfile,
  onAddEntry,
  onEditEntry,
  onOpenSettings,
  onUpdateAmountSetAside,
}: DashboardScreenProps) {
  const taxEstimate = computeTaxEstimate(entries, taxProfile);
  const { estimate, year, usedFallbackConfig, w2WithholdingYtdEstimate, netAmountToSetAside } =
    taxEstimate;

  // Headline numbers are scoped to the current tax year — entries from other years must never
  // bleed into "what should I set aside this year," even though the list below still shows
  // everything so users can see their full history.
  const entriesThisYear = entriesForYear(entries, year);
  const aggregate = aggregateEntries(entriesThisYear);
  const totalEarnings = entriesThisYear.reduce((sum, entry) => sum + entry.grossPay + entry.tips, 0);
  const hourlyRate = effectiveHourlyRate(
    totalEarnings,
    aggregate.totalExpenses,
    netAmountToSetAside,
    aggregate.totalHoursWorked
  );

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const amountSetAsideSoFar = taxProfile.amountSetAsideByYear?.[year] ?? 0;
  const [amountSetAsideInput, setAmountSetAsideInput] = useState(String(amountSetAsideSoFar));
  // Resync the input whenever the persisted value changes from outside this screen's own edits
  // (e.g. after a successful save round-trips a new taxProfile prop back down).
  useEffect(() => {
    setAmountSetAsideInput(String(amountSetAsideSoFar));
  }, [amountSetAsideSoFar]);
  const nextDueDate = getUpcomingQuarterlyDueDates()[0];
  const catchUp = computeCatchUpStatus(netAmountToSetAside, amountSetAsideSoFar, nextDueDate);

  function handleSaveAmountSetAside() {
    const parsed = Math.max(0, parseFloat(amountSetAsideInput) || 0);
    onUpdateAmountSetAside(year, parsed);
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <FlatList
        data={sortedEntries}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.greetingRow}>
              <View style={styles.greetingTitleRow}>
                <Text style={styles.greeting}>Your earnings</Text>
                <View style={styles.yearBadge}>
                  <Text style={styles.yearBadgeText}>{year}</Text>
                </View>
              </View>
              <Pressable
                onPress={onOpenSettings}
                hitSlop={8}
                accessibilityLabel="Settings"
                accessibilityRole="button"
              >
                <Ionicons name="settings-outline" size={22} color={colors.inkSubtle} />
              </Pressable>
            </View>
            {usedFallbackConfig && (
              <View style={[styles.warningBox, styles.warningBoxLight]}>
                <Ionicons name="warning-outline" size={14} color={colors.danger} />
                <Text style={styles.yearWarning}>
                  {year} tax rates aren't available yet — this estimate uses {estimate.taxYear}
                  rates as a placeholder until they're confirmed.
                </Text>
              </View>
            )}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total earnings logged ({year})</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalEarnings)}</Text>
              {aggregate.totalExpenses > 0 && (
                <View style={styles.breakdownRowLight}>
                  <Text style={styles.breakdownLabelLight}>Expenses logged</Text>
                  <Text style={styles.breakdownValueLight}>
                    −{formatCurrency(aggregate.totalExpenses)}
                  </Text>
                </View>
              )}
              {hourlyRate !== undefined && (
                <View style={styles.breakdownRowLight}>
                  <Text style={styles.breakdownLabelLight}>Effective hourly rate (after taxes)</Text>
                  <Text style={styles.hourlyRateValue}>{formatCurrency(hourlyRate)}/hr</Text>
                </View>
              )}
            </View>

            <LinearGradient
              colors={["#1F2937", "#111827"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.setAsideCard}
            >
              <View style={styles.setAsideHeader}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#F5C451" />
                <Text style={styles.setAsideLabel}>Set aside for taxes</Text>
              </View>
              <Text style={styles.setAsideValue}>{formatCurrency(netAmountToSetAside)}</Text>
              <Text style={styles.setAsideSubtext}>
                ~
                {(
                  (estimate.netProfitAfterMileage > 0
                    ? netAmountToSetAside / estimate.netProfitAfterMileage
                    : 0) * 100
                ).toFixed(1)}
                % of net earnings, tax year {estimate.taxYear}
              </Text>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Self-employment tax</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(estimate.seTax.totalSeTax)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Federal income tax</Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(estimate.federalIncomeTax.incomeTax)}
                </Text>
              </View>
              {estimate.childTaxCredit.totalCredit > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    Child Tax Credit ({estimate.childTaxCredit.numberOfChildren})
                  </Text>
                  <Text style={[styles.breakdownValue, styles.creditValue]}>
                    −{formatCurrency(estimate.childTaxCredit.totalCredit)}
                  </Text>
                </View>
              )}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{taxProfile.state} state income tax</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(estimate.stateTax.stateLevelTax)}</Text>
              </View>
              {estimate.stateTax.creditApplied > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{taxProfile.state} state tax credit</Text>
                  <Text style={[styles.breakdownValue, styles.creditValue]}>
                    −{formatCurrency(estimate.stateTax.creditApplied)}
                  </Text>
                </View>
              )}
              {w2WithholdingYtdEstimate > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>W2 withholding so far (est.)</Text>
                  <Text style={[styles.breakdownValue, styles.creditValue]}>
                    −{formatCurrency(w2WithholdingYtdEstimate)}
                  </Text>
                </View>
              )}
              {estimate.stateTax.supported &&
                estimate.stateTax.localTaxSupported &&
                estimate.stateTax.county && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{estimate.stateTax.county} local tax</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(estimate.stateTax.localTax)}</Text>
                  </View>
                )}
              {!estimate.stateTax.supported && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={14} color="#FCA5A5" />
                  <Text style={styles.stateWarning}>
                    {taxProfile.state} isn't supported yet — state tax is showing as $0 and is NOT
                    included in your set-aside number. Account for it manually until this state is
                    added.
                  </Text>
                </View>
              )}
              {estimate.stateTax.supported && !estimate.stateTax.localTaxSupported && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={14} color="#FCA5A5" />
                  <Text style={styles.stateWarning}>
                    {taxProfile.state} has a local/county income tax that isn't included here yet
                    (county not set or not recognized). Your set-aside number is missing that amount.
                  </Text>
                </View>
              )}
            </LinearGradient>

            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>Amount set aside so far ({year})</Text>
              <View style={styles.progressInputRow}>
                <Text style={styles.progressInputPrefix}>$</Text>
                <TextInput
                  style={styles.progressInput}
                  value={amountSetAsideInput}
                  onChangeText={setAmountSetAsideInput}
                  onEndEditing={handleSaveAmountSetAside}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  accessibilityLabel="Amount set aside so far"
                />
                <Pressable
                  onPress={handleSaveAmountSetAside}
                  hitSlop={8}
                  accessibilityLabel="Save amount set aside"
                  accessibilityRole="button"
                >
                  <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                </Pressable>
              </View>

              {nextDueDate && (
                <View style={styles.progressRow}>
                  <Text style={styles.progressRowLabel}>Next payment due</Text>
                  <Text style={styles.progressRowValue}>
                    {nextDueDate.label} — {formatDate(nextDueDate.dueDate)}
                  </Text>
                </View>
              )}

              {catchUp.gap <= 0 ? (
                <View style={[styles.statusBox, styles.statusBoxGood]}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.accent} />
                  <Text style={styles.statusTextGood}>
                    {catchUp.gap === 0
                      ? "You're on track — set aside matches what you owe so far."
                      : `You've saved ${formatCurrency(-catchUp.gap)} more than you need so far. Nice work.`}
                  </Text>
                </View>
              ) : catchUp.weeklyCatchUpAmount !== undefined && nextDueDate ? (
                <View style={[styles.statusBox, styles.statusBoxBehind]}>
                  <Ionicons name="warning-outline" size={14} color={colors.danger} />
                  <Text style={styles.statusTextBehind}>
                    You're {formatCurrency(catchUp.gap)} behind — set aside an extra{" "}
                    {formatCurrency(catchUp.weeklyCatchUpAmount)}/week until {formatDate(nextDueDate.dueDate)} to
                    catch up.
                  </Text>
                </View>
              ) : (
                <View style={[styles.statusBox, styles.statusBoxBehind]}>
                  <Ionicons name="warning-outline" size={14} color={colors.danger} />
                  <Text style={styles.statusTextBehind}>
                    You're {formatCurrency(catchUp.gap)} behind what you've set aside so far.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.addButtonWrap}>
              <PrimaryButton
                label="Log Earnings"
                onPress={onAddEntry}
                icon={<Ionicons name="add" size={20} color="#fff" />}
              />
            </View>

            <Text style={styles.sectionHeader}>Recent entries</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={36} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No entries yet — log your first shift to get started.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const expenses = totalEntryExpenses(item);
          return (
            <Pressable
              onPress={() => onEditEntry(item)}
              style={({ pressed }) => [styles.entryRow, pressed && styles.entryRowPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${PLATFORM_LABELS[item.platform]} entry from ${item.date}`}
            >
              <View style={styles.entryIconWrap}>
                <Ionicons name={PLATFORM_ICONS[item.platform]} size={18} color={colors.primary} />
              </View>
              <View style={styles.entryInfo}>
                <Text style={styles.entryPlatform}>{PLATFORM_LABELS[item.platform]}</Text>
                <Text style={styles.entryDate}>{item.date}</Text>
                {expenses > 0 && (
                  <Text style={styles.entryExpenses}>−{formatCurrency(expenses)} expenses</Text>
                )}
              </View>
              <Text style={styles.entryAmount}>{formatCurrency(item.grossPay + item.tips)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Text style={styles.disclaimer}>Estimates for planning purposes only — not tax advice.</Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  greetingTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  greeting: { ...type.display, color: colors.ink },
  yearBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  yearBadgeText: { ...type.label, color: colors.inkSubtle },
  warningBoxLight: { backgroundColor: colors.dangerSoft, marginBottom: spacing.md, marginTop: 0 },
  yearWarning: { flex: 1, ...type.micro, color: colors.danger, lineHeight: 15 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadowSm,
  },
  summaryLabel: { ...type.label, color: colors.inkSubtle, fontWeight: "500" },
  summaryValue: { fontSize: 30, fontWeight: "800", marginTop: 4, color: colors.ink, letterSpacing: -0.5 },
  breakdownRowLight: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  breakdownLabelLight: { ...type.caption, color: colors.inkFaint },
  breakdownValueLight: { ...type.caption, color: colors.danger, fontWeight: "600" },
  hourlyRateValue: { ...type.caption, color: colors.primary, fontWeight: "700" },
  setAsideCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  setAsideHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  setAsideLabel: { ...type.label, color: "#E5E7EB", fontWeight: "600" },
  setAsideValue: { fontSize: 32, fontWeight: "800", marginTop: 6, color: "#fff", letterSpacing: -0.5 },
  setAsideSubtext: { ...type.micro, color: "#9CA3AF", marginTop: 4 },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  breakdownLabel: { ...type.caption, color: "#D1D5DB" },
  breakdownValue: { ...type.caption, color: "#fff", fontWeight: "600" },
  creditValue: { color: "#86EFAC" },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadowSm,
  },
  progressLabel: { ...type.label, color: colors.ink, fontWeight: "500" },
  progressInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressInputPrefix: { ...type.subtitle, color: colors.inkSubtle },
  progressInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  progressRowLabel: { ...type.caption, color: colors.inkFaint },
  progressRowValue: { ...type.caption, color: colors.ink, fontWeight: "600" },
  statusBox: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.md,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  statusBoxGood: { backgroundColor: colors.accentSoft },
  statusBoxBehind: { backgroundColor: colors.dangerSoft },
  statusTextGood: { flex: 1, ...type.micro, color: colors.accent, lineHeight: 15 },
  statusTextBehind: { flex: 1, ...type.micro, color: colors.danger, lineHeight: 15 },
  warningBox: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: "rgba(252,165,165,0.12)",
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  stateWarning: { flex: 1, ...type.micro, color: "#FECACA", lineHeight: 15 },
  addButtonWrap: { marginVertical: spacing.sm },
  sectionHeader: { ...type.title, fontSize: 18, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyState: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { ...type.body, color: colors.inkFaint, textAlign: "center" },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadowSm,
  },
  entryRowPressed: { opacity: 0.7 },
  entryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  entryInfo: { flex: 1 },
  entryPlatform: { ...type.subtitle, color: colors.ink },
  entryDate: { ...type.caption, color: colors.inkFaint, marginTop: 1 },
  entryExpenses: { ...type.micro, color: colors.danger, marginTop: 2 },
  entryAmount: { ...type.subtitle, color: colors.ink },
  disclaimer: { ...type.micro, color: colors.inkFaint, textAlign: "center", marginTop: spacing.lg },
});

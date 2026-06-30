import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Entry, TaxProfile } from "../types";
import {
  aggregateEntries,
  comparePlatforms,
  computeCatchUpStatus,
  computeTaxEstimate,
  effectiveHourlyRate,
  entriesForYear,
  totalEntryExpenses,
  yearsWithEntries,
} from "../calculations";
import { getUpcomingQuarterlyDueDates } from "../notifications/quarterlyDueDates";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { BreakdownDetailSheet } from "../components/BreakdownDetailSheet";
import { ShareEarningsModal } from "../components/ShareEarningsModal";
import { buildBreakdownDetail, type BreakdownRowKey } from "../breakdownDetails";
import { PLATFORM_ICONS, PLATFORM_LABELS } from "../platforms";
import { usePremium } from "../premium/PremiumContext";
import { radius, shadow, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface DashboardScreenProps {
  entries: Entry[];
  taxProfile: TaxProfile;
  onAddEntry: () => void;
  onEditEntry: (entry: Entry) => void;
  onOpenSettings: () => void;
  onOpenWhatIf: () => void;
  onOpenPlatforms: () => void;
  /** Opens the W-4 optimizer (Premium). Only reached by premium users — free users hit the paywall. */
  onOpenW4Optimizer: () => void;
  /** Opens the paywall — invoked when a free user taps the locked W-4 optimizer card. */
  onOpenPaywall: () => void;
  onUpdateAmountSetAside: (year: number, amount: number) => void;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface MathBreakdownRowProps {
  label: string;
  value: string;
  /** Renders the value in the green "credit" treatment (for reductions like the W2 credit). */
  credit?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}

/** A tappable line in the tax breakdown card that opens its "show your math" detail sheet. */
function MathBreakdownRow({ label, value, credit, onPress, styles }: MathBreakdownRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.breakdownRow, pressed && styles.breakdownRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Tap to see how this is calculated.`}
    >
      <Text style={styles.breakdownLabel}>{label}</Text>
      <View style={styles.breakdownValueWrap}>
        <Text style={[styles.breakdownValue, credit && styles.creditValue]}>{value}</Text>
        <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.4)" />
      </View>
    </Pressable>
  );
}

export function DashboardScreen({
  entries,
  taxProfile,
  onAddEntry,
  onEditEntry,
  onOpenSettings,
  onOpenWhatIf,
  onOpenPlatforms,
  onOpenW4Optimizer,
  onOpenPaywall,
  onUpdateAmountSetAside,
}: DashboardScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { isPremium } = usePremium();

  // The current calendar year is always selectable, even before any entry exists for it yet —
  // otherwise a brand-new year would have no way to be picked until an entry is logged for it.
  const currentCalendarYear = new Date().getFullYear();
  const availableYears = Array.from(new Set([currentCalendarYear, ...yearsWithEntries(entries)])).sort(
    (a, b) => b - a
  );
  const [selectedYear, setSelectedYear] = useState(currentCalendarYear);
  const selectedYearIndex = availableYears.indexOf(selectedYear);

  const taxEstimate = computeTaxEstimate(entries, taxProfile, selectedYear);
  const { estimate, year, usedFallbackConfig, w2WithholdingYtdEstimate, netAmountToSetAside } =
    taxEstimate;

  // "Show your math" — which breakdown row's detail sheet is open (null = closed).
  const [activeDetailKey, setActiveDetailKey] = useState<BreakdownRowKey | null>(null);
  const activeDetail = activeDetailKey
    ? buildBreakdownDetail(activeDetailKey, {
        estimate,
        stateLabel: taxProfile.state,
        w2WithholdingYtd: w2WithholdingYtdEstimate,
      })
    : null;

  // Platform comparison is only meaningful once the user has worked 2+ platforms this year.
  const platformStats = comparePlatforms(entries, year);
  const topPlatform = platformStats[0];

  const [showShare, setShowShare] = useState(false);

  function handlePreviousYear() {
    // Years are sorted descending, so "previous" (older) is the next index.
    if (selectedYearIndex < availableYears.length - 1) setSelectedYear(availableYears[selectedYearIndex + 1]);
  }

  function handleNextYear() {
    if (selectedYearIndex > 0) setSelectedYear(availableYears[selectedYearIndex - 1]);
  }

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
                {availableYears.length > 1 ? (
                  <View style={styles.yearSwitcher}>
                    <Pressable
                      onPress={handlePreviousYear}
                      disabled={selectedYearIndex >= availableYears.length - 1}
                      hitSlop={8}
                      accessibilityLabel="Previous year"
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="chevron-back"
                        size={16}
                        color={
                          selectedYearIndex >= availableYears.length - 1 ? colors.inkFaint : colors.inkSubtle
                        }
                      />
                    </Pressable>
                    <Text style={styles.yearBadgeText}>{year}</Text>
                    <Pressable
                      onPress={handleNextYear}
                      disabled={selectedYearIndex <= 0}
                      hitSlop={8}
                      accessibilityLabel="Next year"
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={selectedYearIndex <= 0 ? colors.inkFaint : colors.inkSubtle}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.yearBadge}>
                    <Text style={styles.yearBadgeText}>{year}</Text>
                  </View>
                )}
              </View>
              <View style={styles.headerActions}>
                {totalEarnings > 0 && (
                  <Pressable
                    onPress={() => setShowShare(true)}
                    hitSlop={8}
                    accessibilityLabel="Share earnings"
                    accessibilityRole="button"
                  >
                    <Ionicons name="share-outline" size={22} color={colors.inkSubtle} />
                  </Pressable>
                )}
                <Pressable
                  onPress={onOpenSettings}
                  hitSlop={8}
                  accessibilityLabel="Settings"
                  accessibilityRole="button"
                >
                  <Ionicons name="settings-outline" size={22} color={colors.inkSubtle} />
                </Pressable>
              </View>
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
              <Text style={styles.breakdownHint}>Tap any line to see how it's calculated.</Text>

              <MathBreakdownRow
                label="Self-employment tax"
                value={formatCurrency(estimate.seTax.totalSeTax)}
                onPress={() => setActiveDetailKey("seTax")}
                styles={styles}
              />
              <MathBreakdownRow
                label="Federal income tax"
                value={formatCurrency(estimate.federalIncomeTax.incomeTax)}
                onPress={() => setActiveDetailKey("federalIncomeTax")}
                styles={styles}
              />
              {estimate.childTaxCredit.totalCredit > 0 && (
                <MathBreakdownRow
                  label={`Child Tax Credit (${estimate.childTaxCredit.numberOfChildren})`}
                  value={`−${formatCurrency(estimate.childTaxCredit.totalCredit)}`}
                  credit
                  onPress={() => setActiveDetailKey("childTaxCredit")}
                  styles={styles}
                />
              )}
              <MathBreakdownRow
                label={`${taxProfile.state} state income tax`}
                value={formatCurrency(estimate.stateTax.stateLevelTax)}
                onPress={() => setActiveDetailKey("stateTax")}
                styles={styles}
              />
              {estimate.stateTax.creditApplied > 0 && (
                <MathBreakdownRow
                  label={`${taxProfile.state} state tax credit`}
                  value={`−${formatCurrency(estimate.stateTax.creditApplied)}`}
                  credit
                  onPress={() => setActiveDetailKey("stateTax")}
                  styles={styles}
                />
              )}
              {w2WithholdingYtdEstimate > 0 && (
                <MathBreakdownRow
                  label="W2 withholding so far (est.)"
                  value={`−${formatCurrency(w2WithholdingYtdEstimate)}`}
                  credit
                  onPress={() => setActiveDetailKey("w2Withholding")}
                  styles={styles}
                />
              )}
              {estimate.stateTax.supported &&
                estimate.stateTax.localTaxSupported &&
                estimate.stateTax.county && (
                  <MathBreakdownRow
                    label={`${estimate.stateTax.county} local tax`}
                    value={formatCurrency(estimate.stateTax.localTax)}
                    onPress={() => setActiveDetailKey("stateTax")}
                    styles={styles}
                  />
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
              <Pressable
                onPress={onOpenWhatIf}
                style={({ pressed }) => [styles.whatIfButton, pressed && styles.whatIfButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Try a what-if scenario"
              >
                <Ionicons name="calculator-outline" size={18} color={colors.primary} />
                <Text style={styles.whatIfButtonText}>What if I earned more?</Text>
              </Pressable>
            </View>

            {platformStats.length >= 2 && topPlatform && (
              <Pressable
                onPress={onOpenPlatforms}
                style={({ pressed }) => [styles.insightCard, pressed && styles.insightCardPressed]}
                accessibilityRole="button"
                accessibilityLabel="Compare your platforms"
              >
                <View style={styles.insightIconWrap}>
                  <Ionicons name="podium-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.insightInfo}>
                  <Text style={styles.insightTitle}>Compare your platforms</Text>
                  <Text style={styles.insightSub}>
                    {PLATFORM_LABELS[topPlatform.platform]} leads with{" "}
                    {formatCurrency(topPlatform.totalEarnings)}
                    {topPlatform.hourlyRate !== undefined
                      ? ` · ${formatCurrency(topPlatform.hourlyRate)}/hr`
                      : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
              </Pressable>
            )}

            {taxProfile.hasW2Job && netAmountToSetAside > 0 && (
              <Pressable
                onPress={isPremium ? onOpenW4Optimizer : onOpenPaywall}
                style={({ pressed }) => [styles.insightCard, pressed && styles.insightCardPressed]}
                accessibilityRole="button"
                accessibilityLabel={isPremium ? "Open the W-4 withholding optimizer" : "W-4 withholding optimizer (Premium)"}
              >
                <View style={styles.insightIconWrap}>
                  <Ionicons name={isPremium ? "options-outline" : "lock-closed-outline"} size={18} color={colors.primary} />
                </View>
                <View style={styles.insightInfo}>
                  <Text style={styles.insightTitle}>
                    Skip quarterly payments{isPremium ? "" : "  ·  Premium"}
                  </Text>
                  <Text style={styles.insightSub}>
                    Cover your gig taxes through your W2 paycheck instead — see the W-4 amount.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
              </Pressable>
            )}

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
      <BreakdownDetailSheet detail={activeDetail} onClose={() => setActiveDetailKey(null)} />
      <ShareEarningsModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        data={{
          year,
          totalEarnings,
          setAside: netAmountToSetAside,
          hourlyRate,
          topPlatformLabel: topPlatform ? PLATFORM_LABELS[topPlatform.platform] : undefined,
        }}
      />
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
  listContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  greetingTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  greeting: { ...type.display, color: colors.ink },
  yearBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  yearBadgeText: { ...type.label, color: colors.inkSubtle },
  yearSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
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
  breakdownRowPressed: { opacity: 0.6 },
  breakdownValueWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  breakdownHint: { ...type.micro, color: "#9CA3AF", marginTop: spacing.md, fontStyle: "italic" },
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
  whatIfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  whatIfButtonPressed: { opacity: 0.7 },
  whatIfButtonText: { ...type.label, color: colors.primary },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadowSm,
  },
  insightCardPressed: { opacity: 0.7 },
  insightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  insightInfo: { flex: 1 },
  insightTitle: { ...type.subtitle, color: colors.ink },
  insightSub: { ...type.caption, color: colors.inkSubtle, marginTop: 1 },
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
}

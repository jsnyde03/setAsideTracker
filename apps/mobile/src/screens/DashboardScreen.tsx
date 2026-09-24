import { useCallback, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Entry, TaxProfile } from "../types";
import {
  aggregateEntries,
  comparePlatforms,
  computeCatchUpStatus,
  computeSafeHarborFromEntries,
  computeTaxEstimate,
  effectiveHourlyRate,
  entriesForYear,
  totalEntryExpenses,
  yearsWithEntries,
  summarizeWeeklySetAsides,
  weekStartOf,
} from "../calculations";
import { getUpcomingQuarterlyDueDates } from "../notifications/quarterlyDueDates";
import { summarizeWeekdayEarnings } from "../weekdayEarnings";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useSizeClass } from "../useSizeClass";
import { BreakdownDetailSheet } from "../components/BreakdownDetailSheet";
import { WeeklySetAsideSheet } from "../components/WeeklySetAsideSheet";
import { ShareEarningsModal } from "../components/ShareEarningsModal";
import { buildBreakdownDetail, type BreakdownRowKey } from "../breakdownDetails";
import { PLATFORM_ICONS, PLATFORM_LABELS } from "../platforms";
import { usePremiumAccess } from "../premium/usePremiumAccess";
import { radius, shadow, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";
import { useReduceMotion } from "../useReduceMotion";
import { TourOverlay, useTourAnchor, useTourMeasure } from "../components/TourOverlay";
import { DASHBOARD_TOUR_ANCHORS, DASHBOARD_TOUR_STEPS } from "../dashboardTour";
import { scrollDeltaToReveal, type TourStep } from "../tour";

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
  /** Opens the safe-harbor / Form 2210 calculator (Premium). Premium users only — free → paywall. */
  onOpenSafeHarbor: () => void;
  /** Opens year-over-year insights (Premium). Premium users only — free users hit the paywall. */
  onOpenYearOverYear: () => void;
  /** Opens the Schedule C expense breakdown (Premium). Premium users only — free → paywall. */
  onOpenExpenseBreakdown: () => void;
  /** Opens the best-days-to-work view (Premium). Premium users only — free → paywall. */
  onOpenBestDays: () => void;
  /** Opens the paywall — invoked when a free user taps a locked Premium card (W-4, safe harbor). */
  onOpenPaywall: () => void;
  onUpdateAmountSetAside: (year: number, amount: number) => void;
  /**
   * Whether the guided tour is running (1.2.8). Off unless the route says otherwise — what turns it
   * on is 1.2.8.4's business, not this screen's.
   */
  showTour?: boolean;
  /** `completed` is true when the visitor reached the last stop, false when they skipped. */
  onTourFinish?: (completed: boolean) => void;
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
      hitSlop={10}
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
  onOpenSafeHarbor,
  onOpenYearOverYear,
  onOpenExpenseBreakdown,
  onOpenBestDays,
  onOpenPaywall,
  onUpdateAmountSetAside,
  showTour = false,
  onTourFinish,
}: DashboardScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { canUsePremium } = usePremiumAccess();

  // ── Guided tour (1.2.8.3) ────────────────────────────────────────────────────────────────────
  // ⚠️ Three of the four anchors start BELOW THE FOLD, so the tour cannot simply measure them: it
  // asks this screen to bring each one into view first. The delta is computed by
  // `scrollDeltaToReveal`, which is pure and tested — this side only tracks where the list is and
  // moves it.
  const listRef = useRef<FlatList<Entry>>(null);
  const scrollOffset = useRef(0);
  const measureAnchor = useTourMeasure();
  const tourWindow = useWindowDimensions();
  const tourInsets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const setAsideAnchor = useTourAnchor(DASHBOARD_TOUR_ANCHORS.setAside);
  const weekAnchor = useTourAnchor(DASHBOARD_TOUR_ANCHORS.week);
  const logEarningsAnchor = useTourAnchor(DASHBOARD_TOUR_ANCHORS.logEarnings);
  const settingsAnchor = useTourAnchor(DASHBOARD_TOUR_ANCHORS.settings);

  const handleTourStep = useCallback(
    async (step: TourStep) => {
      if (step.anchorId === null || measureAnchor === null || listRef.current === null) return;
      const rect = await measureAnchor(step.anchorId);
      if (rect === null) return;
      const delta = scrollDeltaToReveal(
        rect,
        { width: tourWindow.width, height: tourWindow.height },
        tourInsets,
      );
      if (delta === 0) return;
      listRef.current.scrollToOffset({
        offset: Math.max(0, scrollOffset.current + delta),
        animated: !reduceMotion,
      });
      // Let the scroll land before the tour measures. The overlay retries once on its own, so a
      // slow frame costs a retry rather than a missed spotlight.
      await new Promise((resolve) => setTimeout(resolve, 320));
    },
    [measureAnchor, tourWindow.width, tourWindow.height, tourInsets, reduceMotion],
  );

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

  // The weekly split ([D7]). `weeklySetAsides` owns the arithmetic; this screen only picks the
  // current week out of it and opens the sheet.
  const [weeksOpen, setWeeksOpen] = useState(false);
  const weekSummary = summarizeWeeklySetAsides(entries, taxProfile, selectedYear);
  const weeks = weekSummary.weeks;
  const currentWeekStart = weekStartOf(new Date().toISOString().slice(0, 10));
  const thisWeek = weeks.find((week) => week.weekStart === currentWeekStart);

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

  // Year-over-year insights soft-gate: only meaningful once entries span 2+ distinct tax years.
  const yearsTracked = yearsWithEntries(entries).length;

  // Day-of-week earnings ([D20]). The card below and the screen it opens share this one soft gate.
  const weekdayEarnings = summarizeWeekdayEarnings(entries, year);

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
  // ⚠️ During render rather than in an effect — see BreakdownDetailSheet for why. It matters a
  // little more here: the effect version briefly rendered the OLD amount after a save landed.
  const [lastPersistedAmount, setLastPersistedAmount] = useState(amountSetAsideSoFar);
  if (amountSetAsideSoFar !== lastPersistedAmount) {
    setLastPersistedAmount(amountSetAsideSoFar);
    setAmountSetAsideInput(String(amountSetAsideSoFar));
  }
  const nextDueDate = getUpcomingQuarterlyDueDates()[0];
  const catchUp = computeCatchUpStatus(netAmountToSetAside, amountSetAsideSoFar, nextDueDate);

  // ─── The per-quarter estimated payment (Premium) ───────────────────────────────────────────────
  //
  // ⛔ `computeSafeHarborFromEntries`, NOT `computeSafeHarbor(taxEstimate, …)` — even though this
  // screen already holds a `taxEstimate` and reusing it looks free. That entry point projects gig
  // income to a full year FIRST, and Form 2210's 90% leg is defined on the full year's tax:
  // comparing a year-to-date tax against a full-year withholding is exactly the defect 1.2.2.3
  // fixed, which reported "no penalty expected" through both spring deadlines. The shortcut here
  // would rebuild it silently, on a number that now carries a payment instruction.
  const safeHarbor = computeSafeHarborFromEntries(entries, taxProfile, selectedYear);
  // The date is the next one from TODAY; everything else in this card is scoped to the selected
  // year. A bare date can carry that mismatch, a dollar figure cannot — so the amount only appears
  // on the current year. The zero case is the same one `SafeHarborScreen` suppresses: nothing is
  // owed in quarterly payments, and "≈ $0.00 per quarter" reads as a broken number, not an answer.
  const showPerQuarter =
    canUsePremium && selectedYear === currentCalendarYear && safeHarbor.estimatedPaymentsNeeded > 0;

  function handleSaveAmountSetAside() {
    const parsed = Math.max(0, parseFloat(amountSetAsideInput) || 0);
    onUpdateAmountSetAside(year, parsed);
  }

  /**
   * Every insight card is conditional, so a brand-new user can have **none** of them — and a
   * two-column layout with an empty right half looks broken rather than spacious.
   *
   * ⚠️ The count is derived from the SAME booleans that gate the cards, and that is the point: a
   * second copy of these conditions would agree today and drift the first time one of them changes.
   */
  const showPlatformCard = platformStats.length >= 2 && !!topPlatform;
  const showW4Card = taxProfile.hasW2Job && netAmountToSetAside > 0;
  const showSafeHarborCard = netAmountToSetAside > 0;
  const showYearOverYearCard = yearsTracked >= 2;
  const showExpenseCard =
    aggregate.totalExpenses > 0 || estimate.mileageDeduction.deductionAmount > 0;
  const showBestDaysCard = weekdayEarnings.hasEnoughData;
  const insightCardCount = [
    showPlatformCard,
    showW4Card,
    showSafeHarborCard,
    showYearOverYearCard,
    showExpenseCard,
    showBestDaysCard,
  ].filter(Boolean).length;

  // Two columns only on a regular-width window AND only when there is a second column to fill.
  const twoColumn = useSizeClass() === "regular" && insightCardCount > 0;

  return (
    // `width="full"` opts out of the reading measure `Screen` applies by default — this is the one
    // screen laying out real columns, which need more room than a column of prose. See ../layout.
    <Screen edges={["top", "left", "right"]} width={twoColumn ? "full" : "readable"}>
      <FlatList
        ref={listRef}
        data={sortedEntries}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.listContent}
        // Tracked only so the tour can scroll by a delta to an anchor whose content offset nobody
        // knows. `scrollEventThrottle` is required on iOS or this fires once per gesture.
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollOffset.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
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
                      hitSlop={11}
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
                      hitSlop={11}
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
                    style={styles.headerIconButton}
                    accessibilityLabel="Share earnings"
                    accessibilityRole="button"
                  >
                    <Ionicons name="share-outline" size={22} color={colors.inkSubtle} />
                  </Pressable>
                )}
                <Pressable
                  ref={settingsAnchor}
                  onPress={onOpenSettings}
                  style={styles.headerIconButton}
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

            {/* The two-column band. On compact this is a plain stack — `columns` and `column` only
                take effect when `twoColumn` adds them, so the phone layout is byte-identical to
                what it was. Money on the left, where the eye starts; navigation on the right. */}
            <View style={twoColumn ? styles.columns : undefined}>
              <View style={twoColumn ? styles.column : undefined}>
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
                {/* The tour's first stop spotlights the HEADLINE, not the whole gradient card —
                    the card also holds the weekly row and every breakdown line, so a cut-out around
                    it would be most of the screen and would point at nothing in particular.
                    ⚠️ Layout-neutral: `setAsideCard` uses padding and the children carry their own
                    `marginTop`, so this wrapper adds no spacing (it would if the card used `gap`). */}
                <View ref={setAsideAnchor}>
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
                </View>
                {/* [D7]/[D15]: the week is the unit a gig worker can act on — one lump sum for the
                    whole year is the thing that "makes it hard to keep track". It sits beside the year
                    total rather than replacing it, because the year total is what is actually owed. */}
                <Pressable
                  ref={weekAnchor}
                  onPress={() => setWeeksOpen(true)}
                  style={styles.weekRow}
                  accessibilityRole="button"
                  accessibilityLabel={
                    thisWeek
                      ? `Set aside for this week, ${formatCurrency(thisWeek.setAside)}. Tap to see every week.`
                      : "See set aside by week"
                  }
                >
                  <View style={styles.weekText}>
                    <Text style={styles.weekLabel}>This week</Text>
                    <Text style={styles.weekHint}>
                      {thisWeek
                        ? `${thisWeek.entryCount} ${thisWeek.entryCount === 1 ? "shift" : "shifts"} so far${
                            thisWeek.estimated ? " · estimated" : ""
                          }`
                        : "No shifts logged yet this week"}
                    </Text>
                  </View>
                  <Text style={styles.weekValue}>
                    {thisWeek ? formatCurrency(thisWeek.setAside) : formatCurrency(0)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.55)" />
                </Pressable>

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
                    // ⚠️ `onBlur`, not `onEndEditing` — a web blur never reaches the latter, so this
                    // field's blur-to-save path was dead on web. Less severe than the safe-harbor
                    // inputs because the check button beside it is a second path, but it is the same
                    // defect and closing two of three sites is how a class half-closes.
                    onBlur={handleSaveAmountSetAside}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.inkFaint}
                    accessibilityLabel="Amount set aside so far"
                  />
                  <Pressable
                    onPress={handleSaveAmountSetAside}
                    hitSlop={11}
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

                {/* Additive by construction: a free user sees the date row above exactly as before.
                    The DATE is the core job and stays free ([D3]'s axis — premium is tax-time depth,
                    never the set-aside itself); the amount is the premium line. */}
                {nextDueDate && showPerQuarter && (
                  <View style={styles.progressRow}>
                    <Text style={styles.progressRowLabel}>Estimated payment</Text>
                    <Text style={styles.progressRowValue}>
                      ≈ {formatCurrency(safeHarbor.perQuarter)} per quarter
                    </Text>
                  </View>
                )}
                {nextDueDate && showPerQuarter && safeHarbor.isProjected && (
                  // Said, not implied. Before the year is out this is earnings-so-far scaled up, and
                  // it moves as more is logged — a figure sitting next to a deadline reads as an
                  // instruction, so the one word that makes it a forecast has to be on screen.
                  <Text style={styles.perQuarterNote}>
                    Projected from your earnings so far — it moves as you log more.
                  </Text>
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
                {/* Wrapped so the spotlight is the button alone — `addButtonWrap` also holds the
                    what-if link, and a cut-out around both would point at two different things. */}
                <View ref={logEarningsAnchor}>
                  <PrimaryButton
                    label="Log Earnings"
                    onPress={onAddEntry}
                    icon={<Ionicons name="add" size={20} color="#fff" />}
                  />
                </View>
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
              </View>

              <View style={twoColumn ? styles.column : undefined}>
              {showPlatformCard && (
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

              {showW4Card && (
                <Pressable
                  onPress={canUsePremium ? onOpenW4Optimizer : onOpenPaywall}
                  style={({ pressed }) => [styles.insightCard, pressed && styles.insightCardPressed]}
                  accessibilityRole="button"
                  /**
                   * ⛔ LEAD WITH THE HEADLINE THE CARD ACTUALLY SHOWS. This wrapper's label
                   * replaces both Texts below it, so naming the feature internally meant a
                   * VoiceOver user heard "W-4 withholding optimizer" and never heard the benefit
                   * the card is built around — the whole reason to tap it. The subtitle moves to a
                   * hint rather than being lost. Same shape on all five insight cards.
                   */
                  accessibilityLabel={canUsePremium ? "Skip quarterly payments" : "Skip quarterly payments, Premium"}
                  accessibilityHint="Cover your gig taxes through your W2 paycheck instead — see the W-4 amount."
                >
                  <View style={styles.insightIconWrap}>
                    <Ionicons name={canUsePremium ? "options-outline" : "lock-closed-outline"} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.insightInfo}>
                    <Text style={styles.insightTitle}>
                      Skip quarterly payments{canUsePremium ? "" : "  ·  Premium"}
                    </Text>
                    <Text style={styles.insightSub}>
                      Cover your gig taxes through your W2 paycheck instead — see the W-4 amount.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </Pressable>
              )}

              {showSafeHarborCard && (
                <Pressable
                  onPress={canUsePremium ? onOpenSafeHarbor : onOpenPaywall}
                  style={({ pressed }) => [styles.insightCard, pressed && styles.insightCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={canUsePremium ? "Avoid the IRS penalty" : "Avoid the IRS penalty, Premium"}
                  accessibilityHint="See the safe-harbor minimum to pay in — often less than your full bill."
                >
                  <View style={styles.insightIconWrap}>
                    <Ionicons name={canUsePremium ? "shield-checkmark-outline" : "lock-closed-outline"} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.insightInfo}>
                    <Text style={styles.insightTitle}>
                      Avoid the IRS penalty{canUsePremium ? "" : "  ·  Premium"}
                    </Text>
                    <Text style={styles.insightSub}>
                      See the safe-harbor minimum to pay in — often less than your full bill.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </Pressable>
              )}

              {showYearOverYearCard && (
                <Pressable
                  onPress={canUsePremium ? onOpenYearOverYear : onOpenPaywall}
                  style={({ pressed }) => [styles.insightCard, pressed && styles.insightCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={canUsePremium ? "Year-over-year insights" : "Year-over-year insights, Premium"}
                  accessibilityHint="See how this year compares to last — earnings, miles, and tax."
                >
                  <View style={styles.insightIconWrap}>
                    <Ionicons name={canUsePremium ? "trending-up-outline" : "lock-closed-outline"} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.insightInfo}>
                    <Text style={styles.insightTitle}>
                      Year-over-year insights{canUsePremium ? "" : "  ·  Premium"}
                    </Text>
                    <Text style={styles.insightSub}>
                      See how this year compares to last — earnings, miles, and tax.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </Pressable>
              )}

              {showExpenseCard && (
                <Pressable
                  onPress={canUsePremium ? onOpenExpenseBreakdown : onOpenPaywall}
                  style={({ pressed }) => [styles.insightCard, pressed && styles.insightCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={canUsePremium ? "Expense breakdown" : "Expense breakdown, Premium"}
                  accessibilityHint="See your write-offs grouped by Schedule C line — including custom categories."
                >
                  <View style={styles.insightIconWrap}>
                    <Ionicons name={canUsePremium ? "receipt-outline" : "lock-closed-outline"} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.insightInfo}>
                    <Text style={styles.insightTitle}>
                      Expense breakdown{canUsePremium ? "" : "  ·  Premium"}
                    </Text>
                    <Text style={styles.insightSub}>
                      See your write-offs grouped by Schedule C line — including custom categories.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </Pressable>
              )}

              {/* Best days ([D20]). Soft-gated on the same rule the screen uses, so the card never
                  promises a comparison the screen would then refuse to draw. */}
              {showBestDaysCard && (
                <Pressable
                  onPress={canUsePremium ? onOpenBestDays : onOpenPaywall}
                  style={({ pressed }) => [styles.insightCard, pressed && styles.insightCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={canUsePremium ? "Best days to work" : "Best days to work, Premium"}
                  accessibilityHint="Which days of the week have actually paid you best per hour."
                >
                  <View style={styles.insightIconWrap}>
                    <Ionicons name={canUsePremium ? "calendar-outline" : "lock-closed-outline"} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.insightInfo}>
                    <Text style={styles.insightTitle}>
                      Best days to work{canUsePremium ? "" : "  ·  Premium"}
                    </Text>
                    <Text style={styles.insightSub}>
                      Which days of the week have actually paid you best per hour.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </Pressable>
              )}

              </View>
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
      <BreakdownDetailSheet detail={activeDetail} onClose={() => setActiveDetailKey(null)} />
      <WeeklySetAsideSheet
        weeks={weeksOpen ? weeks : null}
        summary={weeksOpen ? weekSummary : null}
        year={year}
        onClose={() => setWeeksOpen(false)}
      />
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
      {/* Last, so it sits above every sheet — a tour interrupted by a sheet appearing over it would
          leave the visitor with no visible way out. It renders nothing unless `showTour`. */}
      <TourOverlay
        steps={DASHBOARD_TOUR_STEPS}
        visible={showTour}
        onStepChange={handleTourStep}
        onFinish={(completed) => onTourFinish?.(completed)}
      />
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
  listContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  /**
   * The regular-width band: money left, navigation right. `alignItems: "flex-start"` so a short
   * right column does not stretch its cards down the height of the left one — insight cards are
   * fixed-height rows and a stretched one looks like a rendering fault.
   */
  columns: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xl },
  /** Equal halves. `flexBasis: 0` so the columns split the space evenly regardless of content. */
  column: { flex: 1, flexBasis: 0 },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  greetingTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  // ⛔ gap shrinks as the buttons grow. These were bare 22pt icons 16px apart: hitSlop big enough
  // to reach 44 would have overlapped, so adjacent buttons would steal each other's taps — worse
  // than a small target. Growing the box and closing the gap keeps them the same distance apart
  // on screen while both become real 44pt targets (1.2.9.3).
  headerActions: { flexDirection: "row", alignItems: "center", gap: 0 },
  headerIconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
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
  // The weekly row lives inside the dark set-aside card, so its colours are the card's, not the
  // theme's — same as the breakdown rows below it.
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  weekText: { flex: 1 },
  weekLabel: { ...type.caption, color: "#fff", fontWeight: "600" },
  weekHint: { ...type.micro, color: "#9CA3AF", marginTop: 2 },
  weekValue: { ...type.subtitle, color: "#fff" },
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
  perQuarterNote: { ...type.micro, color: colors.inkFaint, marginTop: spacing.xs, lineHeight: 15 },
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

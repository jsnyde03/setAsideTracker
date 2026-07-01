import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Entry, TaxProfile } from "../types";
import { computeYearOverYear, metricDelta, type YearSummary } from "../calculations";
import { Screen } from "../components/Screen";
import { radius, shadow, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface YearOverYearScreenProps {
  entries: Entry[];
  taxProfile: TaxProfile;
  onClose: () => void;
}

function formatCurrency(amount: number, fractionDigits = 0): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** How a metric reads: currency, a plain count, or a per-hour rate; and whether "up" is good news
 *  (earnings) or just neutral movement (expenses, miles, tax) — so we don't moralize a higher tax
 *  bill as a red "bad" delta when it simply reflects earning more. */
interface MetricConfig {
  key: keyof YearSummary;
  label: string;
  kind: "currency" | "number";
  goodWhenUp?: boolean;
}

const METRICS: MetricConfig[] = [
  { key: "grossEarnings", label: "Gross earnings", kind: "currency", goodWhenUp: true },
  { key: "netProfit", label: "Net profit", kind: "currency", goodWhenUp: true },
  { key: "estimatedTax", label: "Estimated tax", kind: "currency" },
  { key: "totalExpenses", label: "Business expenses", kind: "currency" },
  { key: "businessMiles", label: "Business miles", kind: "number" },
  { key: "totalHoursWorked", label: "Hours worked", kind: "number" },
];

/**
 * Year-over-year insights (Premium). Compares this year's gig work against prior years using the
 * multi-year entry history the app already retains — earnings, profit, expenses, miles, hours, and
 * the estimated tax each year generated. Soft-gated: with only one year of data there's nothing to
 * compare to, so it shows a friendly "come back next year" state instead of a near-empty screen. All
 * the aggregation lives in computeYearOverYear; this is a thin view.
 */
export function YearOverYearScreen({ entries, taxProfile, onClose }: YearOverYearScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const currentYear = new Date().getFullYear();

  const insights = useMemo(() => computeYearOverYear(entries, taxProfile), [entries, taxProfile]);
  const { hasEnoughData, summaries } = insights;
  const latest = summaries[0];
  const previous = summaries[1];

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Year over year</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {!hasEnoughData ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>Come back next year</Text>
            <Text style={styles.emptyBody}>
              {latest
                ? `You've logged one year of data so far (${latest.year}). Once you've tracked earnings across two tax years, this screen will compare them side by side — so you can see how your gig work is trending.`
                : "Log your gig earnings across two tax years and this screen will compare them side by side — earnings, miles, hours, and the tax each year generated."}
            </Text>
          </View>
        ) : (
          <>
            {/* Headline — earnings, the number people care about most. */}
            <EarningsHero latest={latest} previous={previous} styles={styles} />

            <Text style={styles.sectionHeader}>
              {latest.year} vs {previous.year}
            </Text>
            <View style={styles.metricsCard}>
              {METRICS.map((metric, index) => (
                <MetricRow
                  key={metric.key}
                  config={metric}
                  latest={latest}
                  previous={previous}
                  isFirst={index === 0}
                  styles={styles}
                  colors={colors}
                />
              ))}
              {latest.effectiveHourlyRate !== undefined &&
                previous.effectiveHourlyRate !== undefined && (
                  <MetricRow
                    config={{ key: "effectiveHourlyRate", label: "Take-home / hour", kind: "currency", goodWhenUp: true }}
                    latest={latest}
                    previous={previous}
                    isFirst={false}
                    fractionDigits={2}
                    styles={styles}
                    colors={colors}
                  />
                )}
            </View>

            {summaries.length > 2 && (
              <>
                <Text style={styles.sectionHeader}>All tracked years</Text>
                <View style={styles.tableCard}>
                  <View style={[styles.tableRow, styles.tableHeadRow]}>
                    <Text style={[styles.tableCell, styles.tableCellYear, styles.tableHeadCell]}>Year</Text>
                    <Text style={[styles.tableCell, styles.tableHeadCell]}>Earnings</Text>
                    <Text style={[styles.tableCell, styles.tableHeadCell]}>Net</Text>
                    <Text style={[styles.tableCell, styles.tableHeadCell]}>Tax</Text>
                  </View>
                  {summaries.map((summary) => (
                    <View key={summary.year} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.tableCellYear, styles.tableCellStrong]}>
                        {summary.year}
                        {summary.year === currentYear ? " *" : ""}
                      </Text>
                      <Text style={styles.tableCell}>{formatCurrency(summary.grossEarnings)}</Text>
                      <Text style={styles.tableCell}>{formatCurrency(summary.netProfit)}</Text>
                      <Text style={styles.tableCell}>{formatCurrency(summary.estimatedTax)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {latest?.year === currentYear && (
          <Text style={styles.disclaimer}>
            {currentYear} is still in progress — it reflects what you've logged so far this year, so a
            full-year comparison will look different once the year is complete.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

interface HeroProps {
  latest: YearSummary;
  previous: YearSummary;
  styles: ReturnType<typeof createStyles>;
}

/** The gradient headline: this year's earnings and how they moved against last year. */
function EarningsHero({ latest, previous, styles }: HeroProps) {
  const delta = metricDelta(latest.grossEarnings, previous.grossEarnings);
  const up = delta.change > 0;
  const flat = delta.change === 0;
  const pct = delta.percentChange;

  const trend = flat
    ? `About the same as ${previous.year}`
    : pct === undefined
      ? `Up from nothing logged in ${previous.year}`
      : `${up ? "Up" : "Down"} ${Math.abs(pct * 100).toFixed(0)}% from ${formatCurrency(previous.grossEarnings)} in ${previous.year}`;

  return (
    <LinearGradient colors={["#0F766E", "#134E4A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Text style={styles.heroLabel}>Gross earnings · {latest.year}</Text>
      <Text style={styles.heroValue} accessibilityLabel={`Gross earnings ${formatCurrency(latest.grossEarnings)} in ${latest.year}`}>
        {formatCurrency(latest.grossEarnings)}
      </Text>
      <View style={styles.heroTrendRow}>
        {!flat && (
          <Ionicons name={up ? "arrow-up" : "arrow-down"} size={14} color="#fff" />
        )}
        <Text style={styles.heroTrend}>{trend}</Text>
      </View>
    </LinearGradient>
  );
}

interface MetricRowProps {
  config: MetricConfig;
  latest: YearSummary;
  previous: YearSummary;
  isFirst: boolean;
  fractionDigits?: number;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}

/** One comparison row: the metric's current value plus a colored delta pill against last year. */
function MetricRow({ config, latest, previous, isFirst, fractionDigits = 0, styles, colors }: MetricRowProps) {
  const current = (latest[config.key] as number) ?? 0;
  const prior = (previous[config.key] as number) ?? 0;
  const delta = metricDelta(current, prior);

  const format = (value: number) =>
    config.kind === "currency" ? formatCurrency(value, fractionDigits) : formatNumber(value);

  const flat = delta.change === 0;
  const up = delta.change > 0;
  // Only earnings-style metrics get good/bad color; expenses/miles/tax stay neutral so a bigger
  // number isn't implicitly scolded (or praised).
  const pillColor = flat || !config.goodWhenUp ? colors.inkSubtle : up ? colors.accent : colors.danger;

  const pillText =
    flat
      ? "No change"
      : delta.percentChange === undefined
        ? "New"
        : `${Math.abs(delta.percentChange * 100).toFixed(0)}%`;

  return (
    <View style={[styles.metricRow, !isFirst && styles.metricRowDivider]}>
      <Text style={styles.metricLabel}>{config.label}</Text>
      <View style={styles.metricRight}>
        <Text style={styles.metricValue}>{format(current)}</Text>
        <View style={styles.pill}>
          {!flat && delta.percentChange !== undefined && (
            <Ionicons name={up ? "arrow-up" : "arrow-down"} size={11} color={pillColor} />
          )}
          <Text style={[styles.pillText, { color: pillColor }]}>{pillText}</Text>
        </View>
      </View>
    </View>
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
    heroLabel: { ...type.label, color: "#CCFBF1", fontWeight: "600" },
    heroValue: { fontSize: 38, fontWeight: "800", marginTop: 6, color: "#fff", letterSpacing: -0.5 },
    heroTrendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
    heroTrend: { ...type.caption, color: "#F0FDFA", fontWeight: "600" },

    sectionHeader: { ...type.title, fontSize: 16, color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.sm },

    metricsCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      ...shadowSm,
    },
    metricRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
    },
    metricRowDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
    metricLabel: { ...type.body, color: colors.ink },
    metricRight: { alignItems: "flex-end" },
    metricValue: { ...type.body, color: colors.ink, fontWeight: "700" },
    pill: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
    pillText: { ...type.micro, fontWeight: "700" },

    tableCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.sm,
      ...shadowSm,
    },
    tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
    tableHeadRow: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
    tableCell: { flex: 1, ...type.caption, color: colors.ink, textAlign: "right" },
    tableCellYear: { flex: 0.7, textAlign: "left" },
    tableCellStrong: { fontWeight: "700" },
    tableHeadCell: { ...type.micro, color: colors.inkSubtle, fontWeight: "700" },

    disclaimer: { ...type.micro, color: colors.inkFaint, textAlign: "center", marginTop: spacing.xl, lineHeight: 15 },
  });
}

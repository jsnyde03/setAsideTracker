import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Entry, FiledYearTax, TaxProfile } from "../types";
import { computeSafeHarbor, computeTaxEstimate, entriesForYear } from "../calculations";
import { Screen } from "../components/Screen";
import { radius, shadow, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface SafeHarborScreenProps {
  entries: Entry[];
  taxProfile: TaxProfile;
  onClose: () => void;
  /** Persists the user's prior-year filed figures (keyed by the year they describe — i.e. last year). */
  onUpdateFiledTax: (year: number, filed: FiledYearTax) => void;
}

function formatCurrency(amount: number, fractionDigits = 0): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Parses a free-text dollar field to a non-negative number, or undefined when blank. */
function parseAmount(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const parsed = Math.max(0, parseFloat(trimmed.replace(/[$,]/g, "")) || 0);
  return parsed;
}

/**
 * Safe-harbor / Form 2210 underpayment-penalty calculator (Premium). Shows the minimum the user can
 * pay in this year (withholding + estimated payments) and still avoid the federal underpayment
 * penalty — which, when income has jumped, is often far below this year's actual tax thanks to the
 * prior-year safe harbor. The prior-year leg needs last year's filed total tax, which only the user
 * can supply (the app can't know a return it didn't compute), so this screen carries an input for it
 * — with a suggestion derived from the app's own prior-year data when that exists. All the rules live
 * in computeSafeHarbor; this is a thin view + one persisted input.
 */
export function SafeHarborScreen({ entries, taxProfile, onClose, onUpdateFiledTax }: SafeHarborScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const year = new Date().getFullYear();
  const priorYear = year - 1;

  const storedPrior = taxProfile.filedTaxByYear?.[priorYear];
  const [priorTaxInput, setPriorTaxInput] = useState(
    storedPrior?.totalTax !== undefined ? String(storedPrior.totalTax) : ""
  );
  const [priorAgiInput, setPriorAgiInput] = useState(
    storedPrior?.agi !== undefined ? String(storedPrior.agi) : ""
  );

  const result = useMemo(() => {
    const estimate = computeTaxEstimate(entries, taxProfile, year);
    return computeSafeHarbor(estimate, taxProfile);
  }, [entries, taxProfile, year]);

  // A suggestion from the app's own prior-year data, shown only when the user logged enough of last
  // year here. It's the app's *estimate*, clearly labeled — the user should still confirm against
  // their actual return, which is the legally binding figure.
  const priorYearSuggestion = useMemo(() => {
    if (entriesForYear(entries, priorYear).length === 0) return undefined;
    const est = computeTaxEstimate(entries, taxProfile, priorYear).estimate;
    return Math.max(0, est.totalEstimatedTax - est.stateTax.stateTax);
  }, [entries, taxProfile, priorYear]);

  function persistPriorYear(totalTaxText: string, agiText: string) {
    const totalTax = parseAmount(totalTaxText);
    if (totalTax === undefined) return; // nothing to store without a total-tax figure
    const agi = parseAmount(agiText);
    onUpdateFiledTax(priorYear, agi !== undefined ? { totalTax, agi } : { totalTax });
  }

  function applySuggestion() {
    if (priorYearSuggestion === undefined) return;
    const rounded = String(Math.round(priorYearSuggestion));
    setPriorTaxInput(rounded);
    persistPriorYear(rounded, priorAgiInput);
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Safe harbor</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          The IRS can charge an underpayment penalty if you don't pay in enough tax during the year.
          You're in the clear if you pay at least a "safe harbor" amount — often far less than this
          year's full bill if your income went up.
        </Text>

        {/* Prior-year input — the one figure only you can provide. */}
        <View style={styles.inputCard}>
          <Text style={styles.inputCardTitle}>Last year's tax ({priorYear})</Text>
          <Text style={styles.inputCardHint}>
            From your {priorYear} federal return — the "total tax" line of your Form 1040. This unlocks
            the prior-year safe harbor, which can lower the amount below.
          </Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              value={priorTaxInput}
              onChangeText={setPriorTaxInput}
              onEndEditing={() => persistPriorYear(priorTaxInput, priorAgiInput)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel="Last year's total federal tax"
            />
          </View>

          {priorYearSuggestion !== undefined && (
            <Pressable onPress={applySuggestion} hitSlop={6} accessibilityRole="button" accessibilityLabel="Use estimate from my logged data">
              <Text style={styles.suggestion}>
                From your logged {priorYear} data, that was about{" "}
                <Text style={styles.suggestionEmphasis}>{formatCurrency(priorYearSuggestion)}</Text> — tap
                to use, then confirm against your return.
              </Text>
            </Pressable>
          )}

          <Text style={[styles.inputCardTitle, styles.inputCardTitleSpaced]}>
            Last year's AGI <Text style={styles.optional}>(optional)</Text>
          </Text>
          <Text style={styles.inputCardHint}>
            Only matters if it was over{" "}
            {taxProfile.filingStatus === "marriedFilingSeparately" ? "$75,000" : "$150,000"} — that
            raises the prior-year safe harbor from 100% to 110%.
          </Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              value={priorAgiInput}
              onChangeText={setPriorAgiInput}
              onEndEditing={() => persistPriorYear(priorTaxInput, priorAgiInput)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel="Last year's adjusted gross income"
            />
          </View>
        </View>

        {/* The result. */}
        {result.noPenaltyExpected ? (
          <View style={styles.safeCard}>
            <Ionicons name="shield-checkmark" size={22} color={colors.accent} />
            <Text style={styles.safeText}>
              {result.underDeMinimis
                ? `You're expected to owe less than ${formatCurrency(1000)} after withholding, so no underpayment penalty applies this year.`
                : `Your W2 withholding alone is on track to cover the safe harbor — no separate estimated payments needed to avoid the penalty.`}
            </Text>
          </View>
        ) : (
          <>
            <LinearGradient colors={["#1F2937", "#111827"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.resultCard}>
              <Text style={styles.resultLabel}>Pay in at least, for the year</Text>
              <Text
                style={styles.resultValue}
                accessibilityLabel={`Pay in at least ${formatCurrency(result.requiredAnnualPayment)} for the year to avoid the penalty`}
              >
                {formatCurrency(result.requiredAnnualPayment)}
              </Text>
              <Text style={styles.resultSubtext}>
                {result.bindingTest === "priorYear"
                  ? `${result.priorYearMultiplier === 1.1 ? "110%" : "100%"} of last year's tax (the lower safe harbor)`
                  : "90% of this year's estimated tax"}
              </Text>

              <View style={styles.resultRow}>
                <Text style={styles.resultRowLabel}>90% of this year's tax</Text>
                <Text style={[styles.resultRowValue, result.bindingTest === "currentYear" && styles.binding]}>
                  {formatCurrency(result.ninetyPctCurrent)}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultRowLabel}>
                  {result.priorYearMultiplier === 1.1 ? "110%" : "100%"} of last year's tax
                </Text>
                <Text style={[styles.resultRowValue, result.bindingTest === "priorYear" && styles.binding]}>
                  {result.hasPriorYear ? formatCurrency(result.priorYearSafeHarbor) : "—"}
                </Text>
              </View>
            </LinearGradient>

            {!result.hasPriorYear && (
              <View style={styles.noteCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.noteText}>
                  Add last year's tax above to check the prior-year safe harbor — if your income rose,
                  it can lower the amount you need to pay in.
                </Text>
              </View>
            )}

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Covered by W2 withholding</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(result.federalWithholding)}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                <Text style={styles.breakdownTotalLabel}>Estimated payments to make</Text>
                <Text style={styles.breakdownTotalValue}>{formatCurrency(result.estimatedPaymentsNeeded)}</Text>
              </View>
              {result.estimatedPaymentsNeeded > 0 && (
                <Text style={styles.perQuarter}>
                  ≈ {formatCurrency(result.perQuarter)} per quarter across the four 1040-ES due dates.
                </Text>
              )}
            </View>

            <Text style={styles.sectionHeader}>How this works</Text>
            <Text style={styles.bodyText}>
              To avoid the federal underpayment penalty you generally need to pay in — through
              withholding plus estimated payments — the smaller of 90% of this year's tax or{" "}
              {taxProfile.filingStatus === "marriedFilingSeparately" ? "100% (110% if last year's AGI topped $75,000)" : "100% (110% if last year's AGI topped $150,000)"}{" "}
              of last year's. Withholding from a W2 job counts automatically; the rest is what you'd
              send the IRS as quarterly estimated payments (or add to a W-4 via the optimizer).
            </Text>
          </>
        )}

        <Text style={styles.disclaimer}>
          Federal estimate for planning only — not tax advice, and it doesn't cover state underpayment
          rules, which differ. The prior-year safe harbor assumes last year's return covered all 12
          months.
        </Text>
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
    intro: { ...type.caption, color: colors.inkSubtle, lineHeight: 18, marginBottom: spacing.lg },

    inputCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      ...shadowSm,
    },
    inputCardTitle: { ...type.label, color: colors.ink, fontWeight: "700" },
    inputCardTitleSpaced: { marginTop: spacing.lg },
    optional: { ...type.micro, color: colors.inkFaint, fontWeight: "400" },
    inputCardHint: { ...type.micro, color: colors.inkSubtle, lineHeight: 15, marginTop: 4, marginBottom: spacing.sm },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
    },
    inputPrefix: { ...type.body, color: colors.inkSubtle, marginRight: 4 },
    input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: spacing.sm },
    suggestion: { ...type.micro, color: colors.primary, lineHeight: 16, marginTop: spacing.sm },
    suggestionEmphasis: { fontWeight: "700" },

    resultCard: { borderRadius: radius.xl, padding: spacing.lg, ...shadow },
    resultLabel: { ...type.label, color: "#E5E7EB", fontWeight: "600" },
    resultValue: { fontSize: 36, fontWeight: "800", marginTop: 6, color: "#fff", letterSpacing: -0.5 },
    resultSubtext: { ...type.micro, color: "#9CA3AF", marginTop: 4 },
    resultRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.1)",
    },
    resultRowLabel: { ...type.caption, color: "#D1D5DB" },
    resultRowValue: { ...type.caption, color: "#D1D5DB", fontWeight: "600" },
    binding: { color: "#fff", fontWeight: "800" },

    noteCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.md,
      ...shadowSm,
    },
    noteText: { flex: 1, ...type.caption, color: colors.ink, lineHeight: 18 },

    breakdownCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginTop: spacing.md,
      ...shadowSm,
    },
    breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    breakdownLabel: { ...type.caption, color: colors.inkSubtle },
    breakdownValue: { ...type.caption, color: colors.ink, fontWeight: "600" },
    breakdownTotalRow: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.borderSoft,
    },
    breakdownTotalLabel: { ...type.body, color: colors.ink, fontWeight: "700" },
    breakdownTotalValue: { ...type.body, color: colors.primary, fontWeight: "800" },
    perQuarter: { ...type.micro, color: colors.inkSubtle, marginTop: spacing.sm, lineHeight: 16 },

    safeCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      ...shadowSm,
    },
    safeText: { flex: 1, ...type.body, color: colors.ink, lineHeight: 20 },

    sectionHeader: { ...type.title, fontSize: 16, color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.sm },
    bodyText: { ...type.caption, color: colors.inkSubtle, lineHeight: 19 },
    disclaimer: { ...type.micro, color: colors.inkFaint, textAlign: "center", marginTop: spacing.xl, lineHeight: 15 },
  });
}

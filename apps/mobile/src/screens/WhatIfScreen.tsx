import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Entry, TaxProfile } from "../types";
import {
  aggregateEntries,
  computeTaxEstimate,
  computeWhatIfEstimate,
  effectiveHourlyRate,
  entriesForYear,
} from "../calculations";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { radius, shadow, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface WhatIfScreenProps {
  entries: Entry[];
  taxProfile: TaxProfile;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Parses a user-typed number field, clamping to a non-negative value (blank/garbage → 0). */
function parseAmount(text: string): number {
  return Math.max(0, parseFloat(text) || 0);
}

/**
 * "What-if" earnings simulator: starts from this year's actual totals and lets the user tweak
 * earnings, expenses, miles, and hours to see — live — how their tax set-aside and effective hourly
 * rate would change. Pure reuse of the tax engine via computeWhatIfEstimate (no new tax math), and
 * it compares the projection against the real dashboard number so the change is concrete.
 */
export function WhatIfScreen({ entries, taxProfile, onClose }: WhatIfScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const year = new Date().getFullYear();

  // This year's actual totals — the baseline the projection is compared against and pre-filled from.
  const thisYearEntries = useMemo(() => entriesForYear(entries, year), [entries, year]);
  const actuals = useMemo(() => aggregateEntries(thisYearEntries), [thisYearEntries]);
  const actualGrossEarnings = useMemo(
    () => thisYearEntries.reduce((sum, e) => sum + e.grossPay + e.tips, 0),
    [thisYearEntries]
  );
  const baseline = useMemo(() => computeTaxEstimate(entries, taxProfile, year), [entries, taxProfile, year]);

  const [grossEarnings, setGrossEarnings] = useState(String(Math.round(actualGrossEarnings)));
  const [expenses, setExpenses] = useState(String(Math.round(actuals.totalExpenses)));
  const [miles, setMiles] = useState(String(Math.round(actuals.businessMiles)));
  const [hours, setHours] = useState(actuals.totalHoursWorked > 0 ? String(Math.round(actuals.totalHoursWorked)) : "");

  const scenario = {
    grossEarnings: parseAmount(grossEarnings),
    businessExpenses: parseAmount(expenses),
    businessMiles: parseAmount(miles),
    hoursWorked: parseAmount(hours),
  };

  const projected = computeWhatIfEstimate(taxProfile, scenario, year);
  const projectedRate =
    projected.estimate.netProfitAfterMileage > 0
      ? projected.netAmountToSetAside / projected.estimate.netProfitAfterMileage
      : 0;
  const hourlyRate = effectiveHourlyRate(
    scenario.grossEarnings,
    scenario.businessExpenses,
    projected.netAmountToSetAside,
    scenario.hoursWorked
  );
  const delta = projected.netAmountToSetAside - baseline.netAmountToSetAside;

  function resetToActuals() {
    setGrossEarnings(String(Math.round(actualGrossEarnings)));
    setExpenses(String(Math.round(actuals.totalExpenses)));
    setMiles(String(Math.round(actuals.businessMiles)));
    setHours(actuals.totalHoursWorked > 0 ? String(Math.round(actuals.totalHoursWorked)) : "");
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>What if…</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Try out a different year. Start from your {year} numbers and change anything — your
            set-aside updates as you type. Nothing here is saved.
          </Text>

          <LinearGradient colors={["#1F2937", "#111827"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.resultCard}>
            <Text style={styles.resultLabel}>You'd set aside</Text>
            <Text style={styles.resultValue} accessibilityLabel={`Projected set aside ${formatCurrency(projected.netAmountToSetAside)}`}>
              {formatCurrency(projected.netAmountToSetAside)}
            </Text>
            <Text style={styles.resultSubtext}>~{(projectedRate * 100).toFixed(1)}% of net earnings, tax year {projected.estimate.taxYear}</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>Self-employment tax</Text>
              <Text style={styles.resultRowValue}>{formatCurrency(projected.estimate.seTax.totalSeTax)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>Federal income tax</Text>
              <Text style={styles.resultRowValue}>{formatCurrency(projected.estimate.federalIncomeTax.incomeTax)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>{taxProfile.state} state income tax</Text>
              <Text style={styles.resultRowValue}>{formatCurrency(projected.estimate.stateTax.stateLevelTax)}</Text>
            </View>
            {projected.w2WithholdingYtdEstimate > 0 && (
              <View style={styles.resultRow}>
                <Text style={styles.resultRowLabel}>W2 withholding credit (est.)</Text>
                <Text style={[styles.resultRowValue, styles.creditValue]}>−{formatCurrency(projected.w2WithholdingYtdEstimate)}</Text>
              </View>
            )}
            {hourlyRate !== undefined && (
              <View style={styles.resultRow}>
                <Text style={styles.resultRowLabel}>Effective hourly rate (after taxes)</Text>
                <Text style={[styles.resultRowValue, styles.hourlyValue]}>{formatCurrency(hourlyRate)}/hr</Text>
              </View>
            )}
          </LinearGradient>

          <View style={styles.compareCard}>
            <Ionicons
              name={delta > 0 ? "trending-up" : delta < 0 ? "trending-down" : "remove"}
              size={18}
              color={delta > 0 ? colors.danger : delta < 0 ? colors.accent : colors.inkSubtle}
            />
            <Text style={styles.compareText}>
              {delta === 0
                ? `Same as your ${year} so far (${formatCurrency(baseline.netAmountToSetAside)} to set aside).`
                : `That's ${formatCurrency(Math.abs(delta))} ${delta > 0 ? "more" : "less"} than your ${year} so far (${formatCurrency(baseline.netAmountToSetAside)}).`}
            </Text>
          </View>

          <Text style={styles.sectionHeader}>Your scenario</Text>
          <TextField
            label="Gig earnings (gross, for the year)"
            value={grossEarnings}
            onChangeText={setGrossEarnings}
            placeholder="0"
            keyboardType="decimal-pad"
            accessibilityLabel="Gig earnings"
          />
          <TextField
            label="Business expenses (for the year)"
            value={expenses}
            onChangeText={setExpenses}
            placeholder="0"
            keyboardType="decimal-pad"
            accessibilityLabel="Business expenses"
          />
          <TextField
            label="Business miles (for the year)"
            value={miles}
            onChangeText={setMiles}
            placeholder="0"
            keyboardType="decimal-pad"
            accessibilityLabel="Business miles"
          />
          <TextField
            label="Hours worked (for the year, optional)"
            hint="Powers the effective hourly rate above."
            value={hours}
            onChangeText={setHours}
            placeholder="0"
            keyboardType="decimal-pad"
            accessibilityLabel="Hours worked"
          />

          <Pressable onPress={resetToActuals} style={styles.resetButton} accessibilityRole="button" accessibilityLabel={`Reset to your ${year} numbers`}>
            <Ionicons name="refresh" size={15} color={colors.primary} />
            <Text style={styles.resetText}>Reset to my {year} numbers</Text>
          </Pressable>

          <Text style={styles.disclaimer}>Estimates for planning purposes only — not tax advice.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
    resultCard: { borderRadius: radius.xl, padding: spacing.lg, ...shadow },
    resultLabel: { ...type.label, color: "#E5E7EB", fontWeight: "600" },
    resultValue: { fontSize: 32, fontWeight: "800", marginTop: 6, color: "#fff", letterSpacing: -0.5 },
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
    resultRowValue: { ...type.caption, color: "#fff", fontWeight: "600" },
    creditValue: { color: "#86EFAC" },
    hourlyValue: { color: "#93C5FD" },
    compareCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.md,
      ...shadowSm,
    },
    compareText: { flex: 1, ...type.caption, color: colors.ink, lineHeight: 17 },
    sectionHeader: { ...type.title, fontSize: 16, color: colors.ink, marginTop: spacing.xl },
    resetButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.lg, paddingVertical: spacing.sm },
    resetText: { ...type.label, color: colors.primary },
    disclaimer: { ...type.micro, color: colors.inkFaint, textAlign: "center", marginTop: spacing.lg },
  });
}

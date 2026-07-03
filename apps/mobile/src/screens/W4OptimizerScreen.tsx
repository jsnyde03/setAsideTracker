import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Entry, PayFrequency, TaxProfile } from "../types";
import { computeTaxEstimate, computeW4Optimization } from "../calculations";
import { Screen } from "../components/Screen";
import { radius, shadow, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface W4OptimizerScreenProps {
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

const FREQUENCY_LABEL: Record<PayFrequency, string> = {
  weekly: "weekly",
  biweekly: "every 2 weeks",
  semimonthly: "twice a month",
  monthly: "monthly",
};

/**
 * W-4 withholding optimizer (Premium). For a user who has both a W2 job and gig income, this turns
 * their estimated 1099 tax into a single concrete number: the extra per-paycheck withholding to put
 * on a new W-4's Line 4(c) so their employer covers the gig tax automatically — potentially
 * replacing quarterly estimated payments entirely. Pure read-only view over the existing estimate
 * (no new inputs); all the math lives in computeW4Optimization.
 */
export function W4OptimizerScreen({ entries, taxProfile, onClose }: W4OptimizerScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const year = new Date().getFullYear();

  const result = useMemo(() => {
    const estimate = computeTaxEstimate(entries, taxProfile, year);
    return computeW4Optimization(estimate, taxProfile);
  }, [entries, taxProfile, year]);

  const frequencyLabel = FREQUENCY_LABEL[taxProfile.w2PayFrequency ?? "biweekly"];

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>W-4 optimizer</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        {!result.applicable ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={36} color={colors.inkFaint} />
            <Text style={styles.emptyTitle}>Add your W2 job first</Text>
            <Text style={styles.emptyText}>
              This tool adjusts the tax withheld from a W2 paycheck to cover your gig taxes. Add your
              W2 job in Settings → Tax profile, then come back.
            </Text>
          </View>
        ) : result.alreadyCovered ? (
          <>
            <Text style={styles.intro}>
              Use your W2 paycheck to cover your gig taxes — so you may not have to make quarterly
              estimated payments at all.
            </Text>
            <View style={styles.coveredCard}>
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
              <Text style={styles.coveredText}>
                Your W2 withholding already covers your estimated {year} taxes. No W-4 change needed
                right now — log more gig income and check back if that changes.
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.intro}>
              Rather than making quarterly estimated payments, you can have your W2 employer withhold
              the tax on your gig income for you. Here's the amount to add to a new W-4.
            </Text>

            <LinearGradient colors={["#1F2937", "#111827"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.resultCard}>
              <Text style={styles.resultLabel}>Add to each paycheck</Text>
              <Text
                style={styles.resultValue}
                accessibilityLabel={`Add ${formatCurrency(result.extraPerPaycheck)} of extra withholding to each paycheck`}
              >
                {formatCurrency(result.extraPerPaycheck)}
              </Text>
              <Text style={styles.resultSubtext}>
                on Line 4(c) of a new W-4 · paid {frequencyLabel}
              </Text>

              <View style={styles.resultRow}>
                <Text style={styles.resultRowLabel}>Estimated gig tax for the year</Text>
                <Text style={styles.resultRowValue}>{formatCurrency(result.annualGigTax)}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultRowLabel}>Paychecks per year</Text>
                <Text style={styles.resultRowValue}>{result.payPeriodsPerYear}</Text>
              </View>
            </LinearGradient>

            <View style={styles.catchUpCard}>
              <Ionicons name="time-outline" size={18} color={colors.warn} />
              <Text style={styles.catchUpText}>
                Starting partway through {year}? To cover this year's remaining{" "}
                {formatCurrency(result.remainingGigTaxThisYear)} across your last{" "}
                {result.remainingPayPeriods} paycheck{result.remainingPayPeriods === 1 ? "" : "s"}, add{" "}
                <Text style={styles.catchUpEmphasis}>{formatCurrency(result.catchUpPerPaycheck)}</Text> per
                paycheck instead — then drop back to {formatCurrency(result.extraPerPaycheck)} next year.
              </Text>
            </View>

            <Text style={styles.sectionHeader}>How this works</Text>
            <Text style={styles.bodyText}>
              A W-4's Line 4(c) lets you ask your employer to withhold an extra flat amount from every
              paycheck. Setting it to the amount above routes enough to the IRS and your state to cover
              the tax on your gig income — turning a manual quarterly payment into something automatic.
              Hand your employer a new W-4 (Form W-4, available from your HR/payroll team) with this
              figure on Line 4(c).
            </Text>
          </>
        )}

        <Text style={styles.disclaimer}>
          Estimates for planning purposes only — not tax advice. Withholding is calibrated to your
          current numbers; revisit it if your income changes.
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
    resultRowValue: { ...type.caption, color: "#fff", fontWeight: "600" },
    catchUpCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.md,
      ...shadowSm,
    },
    catchUpText: { flex: 1, ...type.caption, color: colors.ink, lineHeight: 18 },
    catchUpEmphasis: { fontWeight: "700", color: colors.ink },
    coveredCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      ...shadowSm,
    },
    coveredText: { flex: 1, ...type.body, color: colors.ink, lineHeight: 20 },
    sectionHeader: { ...type.title, fontSize: 16, color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.sm },
    bodyText: { ...type.caption, color: colors.inkSubtle, lineHeight: 19 },
    emptyState: { alignItems: "center", paddingVertical: spacing.xxxl, gap: spacing.sm },
    emptyTitle: { ...type.title, fontSize: 17, color: colors.ink, marginTop: spacing.sm },
    emptyText: { ...type.caption, color: colors.inkSubtle, textAlign: "center", lineHeight: 18, paddingHorizontal: spacing.lg },
    disclaimer: { ...type.micro, color: colors.inkFaint, textAlign: "center", marginTop: spacing.xl, lineHeight: 15 },
  });
}

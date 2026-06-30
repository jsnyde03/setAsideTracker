import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Screen } from "../components/Screen";
import { radius, shadowSm, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";
import { trackEvent, ANALYTICS_EVENTS } from "../analytics";
import { reportError } from "../errorReporting";
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "../premium/legal";
import { getPurchasesClient, isPremiumActive, type PackageLike } from "../premium/purchases";
import { usePremium } from "../premium/PremiumContext";

interface PaywallScreenProps {
  onClose: () => void;
}

/** What the premium subscription unlocks — kept short and benefit-led for the paywall. */
const PREMIUM_FEATURES = [
  "Tax-ready PDF export for your CPA or TurboTax",
  "Schedule C category breakdown",
  "W-4 withholding optimizer — cover your 1099 tax without quarterly payments",
  "Safe-harbor underpayment-penalty calculator",
  "IRS-compliant mileage log",
  "Custom expense categories",
  "Year-over-year insights",
] as const;

/** Apple's required auto-renewable subscription disclosure (Guideline 3.1.2). */
const AUTO_RENEW_DISCLOSURE =
  "Payment will be charged to your Apple Account at confirmation of purchase. Your subscription " +
  "automatically renews unless it is canceled at least 24 hours before the end of the current " +
  "period. Your account will be charged for renewal within 24 hours prior to the end of the " +
  "current period. You can manage or cancel your subscription in your App Store account settings " +
  "after purchase.";

/** A plan as shown on the paywall — derived from a live RevenueCat package, or a static fallback. */
interface PlanView {
  key: "annual" | "monthly";
  title: string;
  /** The billed amount — the most prominent element on the screen (Guideline 3.1.2). */
  priceString: string;
  periodLabel: string;
  subnote: string;
  badge?: string;
  /** The real package to purchase; undefined in the static fallback (web / no SDK). */
  pkg?: PackageLike;
}

/** The decided launch prices — shown when no live SDK is attached (web preview, local dev) so the
 * layout and the web E2E/screenshot still render. On a real device these are replaced by the
 * currency-correct strings from RevenueCat. */
const STATIC_PLANS: PlanView[] = [
  { key: "annual", title: "Annual", priceString: "$29.99", periodLabel: "per year", subnote: "Billed annually", badge: "Best value" },
  { key: "monthly", title: "Monthly", priceString: "$4.99", periodLabel: "per month", subnote: "Billed monthly" },
];

function planFromPackage(pkg: PackageLike): PlanView | null {
  if (pkg.packageType === "ANNUAL") {
    return {
      key: "annual",
      title: "Annual",
      priceString: pkg.product.priceString,
      periodLabel: "per year",
      subnote: "Billed annually",
      badge: "Best value",
      pkg,
    };
  }
  if (pkg.packageType === "MONTHLY") {
    return {
      key: "monthly",
      title: "Monthly",
      priceString: pkg.product.priceString,
      periodLabel: "per month",
      subnote: "Billed monthly",
      pkg,
    };
  }
  return null;
}

/**
 * Premium paywall. Built to Apple App Store Review Guideline 3.1.2:
 * - the **billed price is the most prominent element** (any other text is subordinate in size),
 * - subscription title, length, and price are clearly shown,
 * - the full auto-renewal disclosure is present,
 * - functional Terms of Use (EULA) + Privacy Policy links are present,
 * - restore-purchases is available.
 * Fires the premium-funnel analytics events defined in analytics.ts.
 */
export function PaywallScreen({ onClose }: PaywallScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { refresh } = usePremium();
  const client = getPurchasesClient();

  const [plans, setPlans] = useState<PlanView[]>(STATIC_PLANS);
  const [selectedKey, setSelectedKey] = useState<PlanView["key"]>("annual");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.paywallViewed);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!client) {
        setLoadingPlans(false);
        return; // web / no SDK → keep the static-price fallback
      }
      try {
        const packages = await client.getDefaultPackages();
        const mapped = packages.map(planFromPackage).filter((p): p is PlanView => p !== null);
        if (mounted && mapped.length > 0) {
          // Annual first so the featured plan leads.
          mapped.sort((a, b) => (a.key === "annual" ? -1 : 1));
          setPlans(mapped);
        }
      } catch (error) {
        reportError(error, { where: "Paywall.loadPackages" });
        // Keep the static fallback so the screen is never empty.
      } finally {
        if (mounted) setLoadingPlans(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.key === selectedKey) ?? plans[0],
    [plans, selectedKey]
  );

  async function openLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      reportError(error, { where: "Paywall.openLink", url });
    }
  }

  async function handleSubscribe() {
    if (!selectedPlan?.pkg || !client) {
      Alert.alert("Purchases unavailable", "In-app purchases aren't available in this preview. Try on your device.");
      return;
    }
    setPurchasing(true);
    trackEvent(ANALYTICS_EVENTS.purchaseStarted, { plan: selectedPlan.key });
    try {
      const result = await client.purchase(selectedPlan.pkg);
      if (result.userCancelled) return;
      if (isPremiumActive(result.customerInfo)) {
        trackEvent(ANALYTICS_EVENTS.purchaseCompleted, { plan: selectedPlan.key });
        await refresh();
        Alert.alert("You're Premium! 🎉", "Thanks for subscribing — your premium tools are unlocked.");
        onClose();
      }
    } catch (error) {
      reportError(error, { where: "Paywall.subscribe" });
      Alert.alert(
        "Purchase didn't complete",
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (!client) {
      Alert.alert("Restore unavailable", "Restoring purchases isn't available in this preview.");
      return;
    }
    setRestoring(true);
    try {
      const info = await client.restore();
      await refresh();
      const restored = isPremiumActive(info);
      trackEvent(ANALYTICS_EVENTS.restoreCompleted, { restored });
      if (restored) {
        Alert.alert("Purchases restored", "Your premium access has been restored.");
        onClose();
      } else {
        Alert.alert("Nothing to restore", "We couldn't find an active subscription for this Apple Account.");
      }
    } catch (error) {
      reportError(error, { where: "Paywall.restore" });
      Alert.alert(
        "Restore didn't complete",
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setRestoring(false);
    }
  }

  const busy = purchasing || restoring;

  return (
    <Screen edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>SetAside Premium</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.tagline}>Filing-ready tools that pay for themselves</Text>

        <View style={styles.featureList}>
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.accent} style={styles.featureIcon} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {loadingPlans ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.plansLoading} />
        ) : (
          <View style={styles.plans}>
            {plans.map((plan) => {
              const selected = plan.key === selectedKey;
              return (
                <Pressable
                  key={plan.key}
                  onPress={() => setSelectedKey(plan.key)}
                  style={[styles.planCard, selected && styles.planCardSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${plan.title} plan, ${plan.priceString} ${plan.periodLabel}`}
                >
                  <View style={styles.planTop}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    {plan.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{plan.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  {/* Billed amount = the hero/most-conspicuous element (Apple Guideline 3.1.2). */}
                  <Text style={styles.price}>{plan.priceString}</Text>
                  <Text style={styles.pricePeriod}>{plan.periodLabel}</Text>
                  <Text style={styles.priceSubnote}>{plan.subnote}</Text>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={handleSubscribe}
          disabled={busy}
          style={[styles.subscribeButton, busy && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Subscribe"
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.subscribeText}>
              Subscribe — {selectedPlan?.priceString} {selectedPlan?.periodLabel}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={handleRestore} disabled={busy} style={styles.restoreButton} accessibilityRole="button">
          {restoring ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.restoreText}>Restore purchases</Text>
          )}
        </Pressable>

        <Text style={styles.disclosure}>{AUTO_RENEW_DISCLOSURE}</Text>

        <View style={styles.legalRow}>
          <Pressable onPress={() => openLink(TERMS_OF_USE_URL)} hitSlop={8} accessibilityRole="link">
            <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => openLink(PRIVACY_POLICY_URL)} hitSlop={8} accessibilityRole="link">
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
        </View>
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
    tagline: { ...type.title, color: colors.ink, marginBottom: spacing.lg },
    featureList: { gap: spacing.sm, marginBottom: spacing.xl },
    featureRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    featureIcon: { marginTop: 1 },
    featureText: { ...type.body, color: colors.ink, flex: 1, lineHeight: 20 },
    plansLoading: { marginVertical: spacing.xxl },
    plans: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
    planCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.md,
      alignItems: "center",
      ...shadowSm,
    },
    planCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    planTop: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 22 },
    planTitle: { ...type.subtitle, color: colors.inkSubtle },
    badge: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    badgeText: { ...type.micro, color: colors.accent, fontWeight: "700" },
    // The hero price: largest, boldest text in the layout so the billed amount is unambiguously
    // the most conspicuous pricing element (Guideline 3.1.2).
    price: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5, color: colors.ink, marginTop: spacing.sm },
    pricePeriod: { ...type.subtitle, color: colors.ink, marginTop: 2 },
    priceSubnote: { ...type.micro, color: colors.inkFaint, marginTop: 2 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.md,
    },
    radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    subscribeButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
    },
    buttonDisabled: { opacity: 0.6 },
    subscribeText: { ...type.subtitle, color: "#FFFFFF", fontSize: 16 },
    restoreButton: { alignItems: "center", paddingVertical: spacing.md, minHeight: 44, justifyContent: "center" },
    restoreText: { ...type.subtitle, color: colors.primary },
    disclosure: { ...type.micro, color: colors.inkFaint, lineHeight: 15, marginTop: spacing.sm, marginBottom: spacing.lg },
    legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm },
    legalLink: { ...type.caption, color: colors.inkSubtle, textDecorationLine: "underline" },
    legalDot: { ...type.caption, color: colors.inkFaint },
  });
}

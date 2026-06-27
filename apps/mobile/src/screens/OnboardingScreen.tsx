import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type { FilingStatus } from "@gig-tax-tracker/tax-engine";
import type { LocalUserProfile, PayFrequency, TaxProfile } from "../types";
import { annualIncomeFromPaycheck, getCountiesForState } from "../calculations";
import { Chip } from "../components/Chip";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { W2_JOB_SUPPORT_ENABLED } from "../featureFlags";
import { radius, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface OnboardingScreenProps {
  onComplete: (profile: LocalUserProfile, taxProfile: TaxProfile) => void;
}

const FILING_STATUS_OPTIONS: { label: string; value: FilingStatus }[] = [
  { label: "Single", value: "single" },
  { label: "Married Filing Jointly", value: "marriedFilingJointly" },
  { label: "Head of Household", value: "headOfHousehold" },
  { label: "Married Filing Separately", value: "marriedFilingSeparately" },
];

const FREQUENCY_OPTIONS: { label: string; value: PayFrequency }[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Biweekly", value: "biweekly" },
  { label: "Semi-monthly", value: "semimonthly" },
  { label: "Monthly", value: "monthly" },
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");
  const [dependents, setDependents] = useState("0");
  const [hasW2Job, setHasW2Job] = useState(false);
  const [w2GrossPayPerPeriod, setW2GrossPayPerPeriod] = useState("");
  const [w2RetirementPerPeriod, setW2RetirementPerPeriod] = useState("");
  const [w2PreTaxBenefitsPerPeriod, setW2PreTaxBenefitsPerPeriod] = useState("");
  const [w2YtdFederalWithheld, setW2YtdFederalWithheld] = useState("");
  const [w2YtdStateWithheld, setW2YtdStateWithheld] = useState("");
  const [w2PayFrequency, setW2PayFrequency] = useState<PayFrequency>("biweekly");
  const [w2EndDate, setW2EndDate] = useState("");
  const [state, setState] = useState("");
  const [county, setCounty] = useState<string | undefined>(undefined);
  const [acknowledgedDisclaimer, setAcknowledgedDisclaimer] = useState(false);

  const availableCounties = getCountiesForState(state);

  useEffect(() => {
    // Reset the picked county whenever the state changes (or no longer has counties) so a
    // stale county from a previously entered state can't silently linger in the profile.
    setCounty(undefined);
  }, [state]);

  function handleContinue() {
    if (displayName.trim().length === 0) {
      Alert.alert("Name required", "Enter a name so we know who this is for.");
      return;
    }
    if (state.trim().length === 0) {
      Alert.alert("State required", "Enter the state you primarily work in.");
      return;
    }
    if (availableCounties && !county) {
      Alert.alert("County required", "Select the county you live in — it affects local tax.");
      return;
    }
    if (hasW2Job && w2EndDate.trim().length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(w2EndDate.trim())) {
      Alert.alert("Check end date", "Enter the W2 job's end date as YYYY-MM-DD, or leave it blank.");
      return;
    }
    if (!acknowledgedDisclaimer) {
      Alert.alert(
        "Please confirm",
        "Check the box confirming you understand this app provides estimates, not tax advice."
      );
      return;
    }

    const profile: LocalUserProfile = {
      id: `local-${Date.now()}`,
      displayName: displayName.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
    };

    const grossAmount = Math.max(0, parseFloat(w2GrossPayPerPeriod) || 0);
    const retirementAmount = Math.max(0, parseFloat(w2RetirementPerPeriod) || 0);
    const preTaxBenefitsAmount = Math.max(0, parseFloat(w2PreTaxBenefitsPerPeriod) || 0);
    const ytdFederalAmount = Math.max(0, parseFloat(w2YtdFederalWithheld) || 0);
    const ytdStateAmount = Math.max(0, parseFloat(w2YtdStateWithheld) || 0);

    const taxProfile: TaxProfile = {
      filingStatus,
      dependents: Math.max(0, parseInt(dependents, 10) || 0),
      hasW2Job,
      w2GrossPayPerPeriod: hasW2Job && grossAmount > 0 ? grossAmount : undefined,
      w2RetirementPerPeriod: hasW2Job && retirementAmount > 0 ? retirementAmount : undefined,
      w2PreTaxBenefitsPerPeriod: hasW2Job && preTaxBenefitsAmount > 0 ? preTaxBenefitsAmount : undefined,
      w2PayFrequency: hasW2Job ? w2PayFrequency : undefined,
      w2EndDate: hasW2Job && w2EndDate.trim().length > 0 ? w2EndDate.trim() : undefined,
      w2YtdFederalWithheld: hasW2Job && ytdFederalAmount > 0 ? ytdFederalAmount : undefined,
      w2YtdStateWithheld: hasW2Job && ytdStateAmount > 0 ? ytdStateAmount : undefined,
      state: state.trim().toUpperCase(),
      county,
    };

    onComplete(profile, taxProfile);
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}>
            <Ionicons name="briefcase-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>
            Everything you enter stays on this device — no account, no password needed.
          </Text>

          <Text style={styles.sectionLabel}>About you</Text>
          <TextField placeholder="Your name" value={displayName} onChangeText={setDisplayName} />
          <TextField
            placeholder="Email (optional)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.sectionLabel}>Tax profile</Text>
          <Text style={styles.fieldLabel}>Filing status</Text>
          <View style={styles.optionRow}>
            {FILING_STATUS_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={filingStatus === option.value}
                onPress={() => setFilingStatus(option.value)}
                flex
              />
            ))}
          </View>

          <TextField
            label="Dependents"
            placeholder="0"
            value={dependents}
            onChangeText={setDependents}
            keyboardType="number-pad"
          />

          <TextField
            label="State you primarily work in"
            hint="State tax is calculated for all 50 states + DC. U.S. territories aren't supported yet — you'll see a warning on the dashboard if that applies to you."
            placeholder="e.g. CA"
            value={state}
            onChangeText={setState}
            autoCapitalize="characters"
            maxLength={2}
          />

          {availableCounties && (
            <>
              <Text style={styles.fieldLabel}>County you live in</Text>
              <Text style={styles.fieldHint}>
                {state.trim().toUpperCase()} has a local county income tax on top of the state tax —
                pick where you live (not necessarily where you work) so it's calculated correctly.
              </Text>
              <View style={styles.optionGrid}>
                {availableCounties.map((countyName) => (
                  <Chip
                    key={countyName}
                    label={countyName}
                    selected={county === countyName}
                    onPress={() => setCounty(countyName)}
                  />
                ))}
              </View>
            </>
          )}

          {W2_JOB_SUPPORT_ENABLED && (
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>I also have a W2 job</Text>
              <Switch
                value={hasW2Job}
                onValueChange={setHasW2Job}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
          )}

          {W2_JOB_SUPPORT_ENABLED && hasW2Job && (
            <>
              <TextField
                label="Gross pay per paycheck"
                hint="The top-line amount before any deductions — shown as 'Gross Pay' on your pay stub."
                placeholder="0"
                value={w2GrossPayPerPeriod}
                onChangeText={setW2GrossPayPerPeriod}
                keyboardType="decimal-pad"
              />
              <Text style={styles.fieldLabel}>How often you're paid</Text>
              <View style={styles.optionRow}>
                {FREQUENCY_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={w2PayFrequency === option.value}
                    onPress={() => setW2PayFrequency(option.value)}
                  />
                ))}
              </View>
              {Math.max(0, parseFloat(w2GrossPayPerPeriod) || 0) > 0 && (
                <Text style={styles.fieldHint}>
                  ≈ {formatCurrency(annualIncomeFromPaycheck(parseFloat(w2GrossPayPerPeriod) || 0, w2PayFrequency))}/year gross
                </Text>
              )}
              <TextField
                label="401k / 403b contribution per paycheck (optional)"
                hint="Pretax retirement contributions reduce your income tax but not Social Security/Medicare."
                placeholder="0"
                value={w2RetirementPerPeriod}
                onChangeText={setW2RetirementPerPeriod}
                keyboardType="decimal-pad"
              />
              <TextField
                label="Pretax insurance / HSA / FSA per paycheck (optional)"
                hint="Pretax benefits reduce both income tax and Social Security/Medicare wages."
                placeholder="0"
                value={w2PreTaxBenefitsPerPeriod}
                onChangeText={setW2PreTaxBenefitsPerPeriod}
                keyboardType="decimal-pad"
              />
              <TextField
                label="Federal income tax withheld YTD (optional)"
                hint="From the 'Federal Income Tax Withheld' YTD column on your most recent pay stub. Improves withholding credit accuracy."
                placeholder="0"
                value={w2YtdFederalWithheld}
                onChangeText={setW2YtdFederalWithheld}
                keyboardType="decimal-pad"
              />
              <TextField
                label="State income tax withheld YTD (optional)"
                hint="From the 'State Income Tax Withheld' YTD column on your most recent pay stub."
                placeholder="0"
                value={w2YtdStateWithheld}
                onChangeText={setW2YtdStateWithheld}
                keyboardType="decimal-pad"
              />
              <TextField
                label="When does/did this job end? (optional)"
                hint="Leave blank if it's ongoing through the end of the year."
                placeholder="YYYY-MM-DD"
                value={w2EndDate}
                onChangeText={setW2EndDate}
              />
            </>
          )}

          <Pressable
            style={styles.disclaimerRow}
            onPress={() => setAcknowledgedDisclaimer(!acknowledgedDisclaimer)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledgedDisclaimer }}
            accessibilityLabel="I understand this app provides estimates, not tax advice"
          >
            <Ionicons
              name={acknowledgedDisclaimer ? "checkbox" : "square-outline"}
              size={20}
              color={acknowledgedDisclaimer ? colors.primary : colors.inkFaint}
            />
            <Text style={styles.disclaimer}>
              Tax figures in this app are estimates for planning purposes only, not tax advice. Consult
              a tax professional or filing software when it's time to file.
            </Text>
          </Pressable>

          <View style={styles.buttonWrap}>
            <PrimaryButton label="Continue" onPress={handleContinue} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    title: { ...type.display, color: colors.ink, marginBottom: 4 },
    subtitle: { ...type.body, color: colors.inkSubtle, marginBottom: spacing.xl, lineHeight: 21 },
    sectionLabel: { ...type.title, fontSize: 17, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },
    fieldLabel: { ...type.label, color: colors.ink, marginBottom: 6, marginTop: spacing.md },
    fieldHint: { ...type.micro, color: colors.inkSubtle, marginBottom: 6, lineHeight: 15 },
    optionRow: { flexDirection: "row", gap: spacing.sm },
    optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.lg,
    },
    disclaimerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginTop: spacing.xl,
    },
    disclaimer: { flex: 1, ...type.micro, color: colors.inkSubtle, lineHeight: 16 },
    buttonWrap: { marginTop: spacing.lg },
  });
}

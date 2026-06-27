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
import type { PayFrequency, TaxProfile } from "../types";
import { annualIncomeFromPaycheck, getCountiesForState } from "../calculations";
import { Chip } from "../components/Chip";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { W2_JOB_SUPPORT_ENABLED } from "../featureFlags";
import { spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface EditTaxProfileScreenProps {
  taxProfile: TaxProfile;
  onSave: (taxProfile: TaxProfile) => void;
  onCancel: () => void;
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

export function EditTaxProfileScreen({ taxProfile, onSave, onCancel }: EditTaxProfileScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(taxProfile.filingStatus);
  const [dependents, setDependents] = useState(String(taxProfile.dependents));
  const [hasW2Job, setHasW2Job] = useState(taxProfile.hasW2Job);
  const [w2GrossPayPerPeriod, setW2GrossPayPerPeriod] = useState(
    taxProfile.w2GrossPayPerPeriod !== undefined ? String(taxProfile.w2GrossPayPerPeriod) : ""
  );
  const [w2RetirementPerPeriod, setW2RetirementPerPeriod] = useState(
    taxProfile.w2RetirementPerPeriod !== undefined ? String(taxProfile.w2RetirementPerPeriod) : ""
  );
  const [w2PreTaxBenefitsPerPeriod, setW2PreTaxBenefitsPerPeriod] = useState(
    taxProfile.w2PreTaxBenefitsPerPeriod !== undefined ? String(taxProfile.w2PreTaxBenefitsPerPeriod) : ""
  );
  const [w2YtdFederalWithheld, setW2YtdFederalWithheld] = useState(
    taxProfile.w2YtdFederalWithheld !== undefined ? String(taxProfile.w2YtdFederalWithheld) : ""
  );
  const [w2YtdStateWithheld, setW2YtdStateWithheld] = useState(
    taxProfile.w2YtdStateWithheld !== undefined ? String(taxProfile.w2YtdStateWithheld) : ""
  );
  const [w2PayFrequency, setW2PayFrequency] = useState<PayFrequency>(
    taxProfile.w2PayFrequency ?? "biweekly"
  );
  const [w2EndDate, setW2EndDate] = useState(taxProfile.w2EndDate ?? "");
  const [state, setState] = useState(taxProfile.state);
  const [county, setCounty] = useState<string | undefined>(taxProfile.county);

  const availableCounties = getCountiesForState(state);

  useEffect(() => {
    // Only reset if the county no longer applies to the (possibly newly typed) state — avoids
    // clobbering the existing county on first render when it's still valid for the initial state.
    if (county && availableCounties && !availableCounties.includes(county)) {
      setCounty(undefined);
    } else if (!availableCounties && county) {
      setCounty(undefined);
    }
  }, [state, availableCounties, county]);

  function handleSave() {
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

    const grossAmount = Math.max(0, parseFloat(w2GrossPayPerPeriod) || 0);
    const retirementAmount = Math.max(0, parseFloat(w2RetirementPerPeriod) || 0);
    const preTaxBenefitsAmount = Math.max(0, parseFloat(w2PreTaxBenefitsPerPeriod) || 0);
    const ytdFederalAmount = Math.max(0, parseFloat(w2YtdFederalWithheld) || 0);
    const ytdStateAmount = Math.max(0, parseFloat(w2YtdStateWithheld) || 0);

    onSave({
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
      amountSetAsideByYear: taxProfile.amountSetAsideByYear,
    });
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
            style={styles.headerButton}
            hitSlop={8}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Tax Profile</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

          <View style={styles.buttonWrap}>
            <PrimaryButton label="Save" onPress={handleSave} />
          </View>
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
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    headerButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { ...type.subtitle, fontSize: 17, color: colors.ink },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
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
    buttonWrap: { marginTop: spacing.xl },
  });
}

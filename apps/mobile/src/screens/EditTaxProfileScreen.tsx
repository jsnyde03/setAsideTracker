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

// Falls back to a best-guess reverse conversion for profiles saved before paycheck-based entry
// existed (estimatedW2Income set directly, with no w2PaycheckAmount/w2PayFrequency on record).
function defaultPaycheckAmount(taxProfile: TaxProfile): string {
  if (taxProfile.w2PaycheckAmount !== undefined) return String(taxProfile.w2PaycheckAmount);
  if (taxProfile.estimatedW2Income > 0) return String(Math.round(taxProfile.estimatedW2Income / 26));
  return "";
}

export function EditTaxProfileScreen({ taxProfile, onSave, onCancel }: EditTaxProfileScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(taxProfile.filingStatus);
  const [dependents, setDependents] = useState(String(taxProfile.dependents));
  const [hasW2Job, setHasW2Job] = useState(taxProfile.hasW2Job);
  const [w2PaycheckAmount, setW2PaycheckAmount] = useState(defaultPaycheckAmount(taxProfile));
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

    const paycheckAmountValue = Math.max(0, parseFloat(w2PaycheckAmount) || 0);

    onSave({
      filingStatus,
      dependents: Math.max(0, parseInt(dependents, 10) || 0),
      hasW2Job,
      estimatedW2Income: hasW2Job ? annualIncomeFromPaycheck(paycheckAmountValue, w2PayFrequency) : 0,
      w2PaycheckAmount: hasW2Job ? paycheckAmountValue : undefined,
      w2PayFrequency: hasW2Job ? w2PayFrequency : undefined,
      w2EndDate: hasW2Job && w2EndDate.trim().length > 0 ? w2EndDate.trim() : undefined,
      state: state.trim().toUpperCase(),
      county,
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
                label="Paycheck amount"
                hint="How much you take home each paycheck — most people know this more easily than their annual gross."
                placeholder="0"
                value={w2PaycheckAmount}
                onChangeText={setW2PaycheckAmount}
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
              {Math.max(0, parseFloat(w2PaycheckAmount) || 0) > 0 && (
                <Text style={styles.fieldHint}>
                  ≈ {formatCurrency(annualIncomeFromPaycheck(parseFloat(w2PaycheckAmount) || 0, w2PayFrequency))}/year
                </Text>
              )}
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

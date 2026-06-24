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
import type { TaxProfile } from "../types";
import { getCountiesForState } from "../calculations";
import { Chip } from "../components/Chip";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { colors, spacing, type } from "../theme";

interface EditTaxProfileScreenProps {
  taxProfile: TaxProfile;
  onSave: (taxProfile: TaxProfile) => void;
  onCancel: () => void;
}

const FILING_STATUS_OPTIONS: { label: string; value: FilingStatus }[] = [
  { label: "Single", value: "single" },
  { label: "Married Filing Jointly", value: "marriedFilingJointly" },
];

export function EditTaxProfileScreen({ taxProfile, onSave, onCancel }: EditTaxProfileScreenProps) {
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(taxProfile.filingStatus);
  const [dependents, setDependents] = useState(String(taxProfile.dependents));
  const [hasW2Job, setHasW2Job] = useState(taxProfile.hasW2Job);
  const [estimatedW2Income, setEstimatedW2Income] = useState(String(taxProfile.estimatedW2Income));
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

    onSave({
      filingStatus,
      dependents: Math.max(0, parseInt(dependents, 10) || 0),
      hasW2Job,
      estimatedW2Income: hasW2Job ? Math.max(0, parseFloat(estimatedW2Income) || 0) : 0,
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
            hint="State tax is currently calculated for CA, FL, MD, NY, PA, TX. Other states will show $0 state tax until added — you'll see a warning on the dashboard if yours isn't supported yet."
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

          <View style={styles.switchRow}>
            <Text style={styles.fieldLabel}>I also have a W2 job</Text>
            <Switch
              value={hasW2Job}
              onValueChange={setHasW2Job}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          {hasW2Job && (
            <TextField
              label="Estimated annual W2 income"
              placeholder="0"
              value={estimatedW2Income}
              onChangeText={setEstimatedW2Income}
              keyboardType="decimal-pad"
            />
          )}

          <View style={styles.buttonWrap}>
            <PrimaryButton label="Save" onPress={handleSave} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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

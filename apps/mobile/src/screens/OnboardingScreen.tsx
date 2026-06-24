import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type { FilingStatus } from "@gig-tax-tracker/tax-engine";
import type { LocalUserProfile, TaxProfile } from "../types";
import { getCountiesForState } from "../calculations";
import { Chip } from "../components/Chip";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextField } from "../components/TextField";
import { colors, radius, spacing, type } from "../theme";

interface OnboardingScreenProps {
  onComplete: (profile: LocalUserProfile, taxProfile: TaxProfile) => void;
}

const FILING_STATUS_OPTIONS: { label: string; value: FilingStatus }[] = [
  { label: "Single", value: "single" },
  { label: "Married Filing Jointly", value: "marriedFilingJointly" },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");
  const [dependents, setDependents] = useState("0");
  const [hasW2Job, setHasW2Job] = useState(false);
  const [estimatedW2Income, setEstimatedW2Income] = useState("0");
  const [state, setState] = useState("");
  const [county, setCounty] = useState<string | undefined>(undefined);

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

    const profile: LocalUserProfile = {
      id: `local-${Date.now()}`,
      displayName: displayName.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
    };

    const taxProfile: TaxProfile = {
      filingStatus,
      dependents: Math.max(0, parseInt(dependents, 10) || 0),
      hasW2Job,
      estimatedW2Income: hasW2Job ? Math.max(0, parseFloat(estimatedW2Income) || 0) : 0,
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
            This is a local alpha build — everything you enter stays on this device. No account, no
            password needed yet.
          </Text>

          <Text style={styles.sectionLabel}>About you</Text>
          <TextField placeholder="Your name" value={displayName} onChangeText={setDisplayName} />
          <TextField
            placeholder="Email (optional, for future sync)"
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

          <Text style={styles.disclaimer}>
            Tax figures in this app are estimates for planning purposes only, not tax advice. Consult
            a tax professional or filing software when it's time to file.
          </Text>

          <View style={styles.buttonWrap}>
            <PrimaryButton label="Continue" onPress={handleContinue} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  disclaimer: { ...type.micro, color: colors.inkSubtle, marginTop: spacing.xl, lineHeight: 16 },
  buttonWrap: { marginTop: spacing.lg },
});

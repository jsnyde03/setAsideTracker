import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  currentTripMiles,
  isTripActive,
  startTripTracking,
  stopTripTracking,
  watchTripMiles,
} from "../mileage/tripTracker";
import { reportError } from "../errorReporting";
import { radius, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";

interface TripTrackerButtonProps {
  /** Called with the captured miles when a trip is stopped, to fill the mileage field. */
  onTripFinished: (miles: number) => void;
}

/**
 * Start/stop a measured trip, and show it running ([D8]'s toggle; [D17]'s background capture).
 *
 * ⚠️ **Web has no location task**, so this renders nothing there rather than offering a button that
 * cannot work. The e2e suite runs on react-native-web, which is precisely why this component's
 * behaviour is covered by unit tests over `tripTracker` instead — and why the device checklist owns
 * the rest.
 */
export function TripTrackerButton({ onTripFinished }: TripTrackerButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [running, setRunning] = useState(isTripActive);
  const [miles, setMiles] = useState(currentTripMiles);
  const [busy, setBusy] = useState(false);

  useEffect(() => watchTripMiles(setMiles), []);

  if (Platform.OS === "web") return null;

  async function handlePress() {
    setBusy(true);
    try {
      if (running) {
        const captured = await stopTripTracking();
        setRunning(false);
        onTripFinished(captured);
        return;
      }

      const result = await startTripTracking();
      if (result.started) {
        setRunning(true);
        return;
      }
      // Named, actionable, and said NOW — a user who learns after the drive that nothing was
      // recorded has lost the trip, and mileage cannot be reconstructed after the fact.
      const [title, body] = messageFor(result.reason);
      Alert.alert(title, body);
    } catch (error) {
      reportError(error, { where: "TripTrackerButton/handlePress" });
      Alert.alert("Couldn't track this trip", "Something went wrong. You can still type your miles in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handlePress}
        disabled={busy}
        style={({ pressed }) => [styles.button, running && styles.buttonRunning, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ busy, selected: running }}
        accessibilityLabel={
          running ? `Stop trip. ${miles.toFixed(1)} miles so far.` : "Track this trip with GPS"
        }
      >
        <Ionicons
          name={running ? "stop-circle-outline" : "navigate-outline"}
          size={18}
          color={running ? colors.danger : colors.primary}
        />
        <Text style={[styles.label, running && styles.labelRunning]}>
          {running ? `Stop trip · ${miles.toFixed(1)} mi` : "Track this trip"}
        </Text>
      </Pressable>
      <Text style={styles.hint}>
        {running
          ? "Measuring while you drive. Your phone shows a location indicator until you stop."
          : "Measures your miles while a trip is running. Stops the moment you stop the trip."}
      </Text>
    </View>
  );
}

/** One message per failure, each naming what the user can actually do about it. */
function messageFor(reason: "permission-denied" | "services-disabled" | "unavailable"): [string, string] {
  switch (reason) {
    case "services-disabled":
      return [
        "Location is turned off",
        "Turn on Location Services in your device settings to measure a trip. You can always type your miles in instead.",
      ];
    case "permission-denied":
      return [
        "SetAside needs location to measure a trip",
        "Allow location access for SetAside in your device settings, or type your miles in by hand — the number is yours either way.",
      ];
    default:
      return [
        "Couldn't start tracking",
        "This device couldn't start a trip just now. You can still type your miles in.",
      ];
  }
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: { marginTop: spacing.xs },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: 12,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    buttonRunning: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
    pressed: { opacity: 0.85 },
    label: { ...type.label, color: colors.primary },
    labelRunning: { color: colors.danger },
    hint: { ...type.micro, color: colors.inkSubtle, marginTop: 6 },
  });
}

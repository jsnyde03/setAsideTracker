import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";

import { reportError } from "../errorReporting";
import { radius, spacing, type, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";
import { currentTripMiles, isTripActive, stopTripTracking, watchTripMiles } from "./tripTracker";

/**
 * A running trip, visible from wherever the user is (1.2.21).
 *
 * ## Why this exists at all
 *
 * ⛔ **`TripTrackerButton` already warns *"This trip has been running a long time"* — which means
 * forgetting to stop was an anticipated failure before this component existed.** But that warning
 * only renders where the button is mounted, and until 1.2.21 the button lived inside the entry form.
 * So the one state that needs to be unmissable was visible only on the screen a driver is least
 * likely to be looking at. ⚡ **Miles left counting become an over-claimed deduction**, which is a
 * tax problem rather than a cosmetic one.
 *
 * ## Why it is in `Screen`
 *
 * Same seam as `DemoBanner`: rendered by the one wrapper every screen already uses, so no screen
 * opts in and none can forget. Both can be on screen at once, and the order is deliberate — the
 * demo marker qualifies everything below it, including this.
 *
 * ## What it deliberately does not do
 *
 * ⚠️ **It hides on `/entry`.** That screen has its own start/stop control and its own mileage field,
 * and it is where stopping sends you anyway — two stop buttons on one screen is not redundancy, it
 * is asking the user which one is real.
 *
 * ⛔ **Renders nothing on web**, like the button it mirrors: there is no location task there, so a
 * trip can never be running. ⚠️ **That makes this component invisible to the Playwright suite, the
 * contrast sweep and the Dynamic Type sweep** — every one of them would report a pass over a
 * component that rendered nothing at all. Its verification is unit tests over `tripTracker` plus a
 * device row, and saying so is the point.
 */
export function TripRunningBanner() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const pathname = usePathname();
  const [running, setRunning] = useState(isTripActive);
  const [miles, setMiles] = useState(currentTripMiles);
  const [busy, setBusy] = useState(false);

  // The module is the single source of truth, so this stays in step with the entry form's control
  // without either knowing about the other.
  useEffect(() => watchTripMiles(setMiles), []);
  useEffect(() => {
    const timer = setInterval(() => setRunning(isTripActive()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (Platform.OS === "web") return null;
  if (!running) return null;
  // The entry form owns its own control; see the note above.
  if (pathname === "/entry") return null;

  async function handleStop() {
    setBusy(true);
    try {
      const captured = await stopTripTracking();
      setRunning(false);
      // Straight to the form with the miles already in it — the same place a trip tracked from
      // inside the form has always put them.
      router.push({ pathname: "/entry", params: { miles: String(captured) } });
    } catch (error) {
      reportError(error, { where: "TripRunningBanner/handleStop" });
      Alert.alert("Couldn't stop the trip", "Something went wrong. You can still type your miles in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="navigate" size={14} color={colors.primaryDark} />
      {/* ⚠️ `primaryDark` on `primarySoft`, not `primary` — 1.2.9.3 solved that exact pairing, and
          `primary` on it is 3.88:1 in dark mode. This is the DemoBanner defect from 1.2.18.1; the
          two components share a background token, so they shared the mistake waiting to happen. */}
      <Text style={styles.text} numberOfLines={1}>
        Trip running · {miles.toFixed(1)} mi
      </Text>
      <Pressable
        onPress={handleStop}
        disabled={busy}
        style={({ pressed }) => [styles.stop, pressed && styles.stopPressed]}
        accessibilityRole="button"
        accessibilityState={{ busy }}
        // No wrapper label on the row itself: one here would replace the live mileage a sighted
        // user reads. The button names only its own action.
        accessibilityLabel="Stop trip"
      >
        <Text style={styles.stopText}>Stop</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.primarySoft,
    },
    text: { flex: 1, ...type.label, color: colors.primaryDark },
    stop: {
      minHeight: 32,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.danger,
    },
    stopPressed: { opacity: 0.85 },
    stopText: { ...type.label, color: colors.danger },
  });
}

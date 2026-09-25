import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { reportError } from "../errorReporting";
import type { Colors } from "../theme";
import { useTheme } from "../ThemeContext";
import { useDemo } from "./DemoContext";

/**
 * The persistent "this is not your money" marker, rendered by `Screen` so it appears on all thirteen
 * screens without any of them opting in.
 *
 * ## Why a banner on every screen rather than a badge on the figures
 *
 * The confusing state isn't a number, it's a whole app: someone entering the demo from their own
 * account sees a dashboard, a safe-harbor screen and a year-over-year chart all showing a stranger's
 * finances. Marking individual figures would be noise on the screens that need it least and still
 * miss the charts. One line at the top of every screen is unmissable and says the true thing.
 *
 * ## The accessibility half of the exit line
 *
 * Rendered FIRST inside `Screen`, so it is the first element a VoiceOver user reaches on every
 * screen — before any figure it qualifies. A marker placed after the content would be technically
 * "in the accessibility tree" and useless, because it would be heard last.
 *
 * ## Why it's tappable
 *
 * A permanent bar announcing a state the user might not want, with no way out of it, sends them
 * hunting through Settings. The way out belongs on the thing that says they're in it. Settings keeps
 * its own control too — that's where someone looks when the banner isn't what caught their eye.
 */
export function DemoBanner() {
  const { colors } = useTheme();
  const { isDemo, exitDemo } = useDemo();
  const router = useRouter();
  const styles = createStyles(colors);

  if (!isDemo) return null;

  async function handleExit() {
    try {
      await exitDemo();
      // Same reasoning as the Settings control: the route this banner is on may not exist for the
      // real account (a premium screen it can't reach, an entry that isn't theirs), so go somewhere
      // that always resolves and let the dashboard's guard route onward from fresh data.
      // `dismissTo`, not `replace` — see app/settings.tsx (1.2.19): replacing onto a route that is
      // already below mounts a second copy of it and leaves the first mounted.
      router.dismissTo("/");
    } catch (error) {
      reportError(error, { where: "DemoBanner.exit" });
      Alert.alert("Couldn't exit the demo", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <Pressable
      onPress={handleExit}
      style={styles.banner}
      accessibilityRole="button"
      accessibilityLabel="Sample data. This is an example account, not your own. Exit sample data."
      accessibilityHint="Returns to your own account."
    >
      <Text style={styles.text} numberOfLines={1}>
        Sample data — not your account
      </Text>
      <Text style={styles.action}>Exit</Text>
    </Pressable>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.primarySoft,
      gap: 12,
    },
    // Deliberately not `danger`: nothing is wrong, and a red bar on every screen would read as an
    // error state for what is a perfectly healthy way to use the app.
    //
    // ⚠️ **`primaryDark`, not `primary` — this failed AA in dark mode on every screen of a demo.**
    // `primary` (#3B82F6) on `primarySoft` (#1E2A44) is **3.88:1**, and 1.2.9.3 already solved that
    // exact pairing: `primaryDark` is the token for text sitting on `primarySoft`, which is why it
    // is *lighter* than `primary` in the dark theme and darker in the light one.
    // ⛔ **It went unmeasured for so long because the contrast sweep runs as a NON-DEMO user**, so
    // the one component that renders on all thirteen screens was on none of them. Found at 1.2.18.1,
    // the moment the gate was pointed at a demo session.
    text: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.primaryDark },
    action: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primaryDark,
      textDecorationLine: "underline",
    },
  });
}

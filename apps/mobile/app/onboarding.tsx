import { Alert } from "react-native";
import { Redirect, useRouter } from "expo-router";
import type { LocalUserProfile, TaxProfile } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { OnboardingScreen } from "../src/screens/OnboardingScreen";
import { useAppData } from "../src/state/AppDataContext";
import { scheduleQuarterlyReminders } from "../src/notifications/scheduleReminders";
import { ANALYTICS_EVENTS, trackEvent } from "../src/analytics";
import { reportError } from "../src/errorReporting";

export default function OnboardingRoute() {
  const router = useRouter();
  const { completeOnboarding, remindersEnabled, localUserProfile, taxProfile } = useAppData();

  // The reverse guard. Onboarding writes a profile, so reaching it with one already set — by URL on
  // web, or by deep link on device now that a `scheme` is declared — would let a stranger's link walk
  // an existing user back through setup and overwrite what they had. Unreachable before 1.2.0.4,
  // addressable after it.
  if (localUserProfile && taxProfile) {
    return <Redirect href="/" />;
  }

  async function handleComplete(profile: LocalUserProfile, taxProfile: TaxProfile) {
    try {
      await completeOnboarding(profile, taxProfile);
      // `replace`, not `push` — onboarding must not sit in the back stack once it's done.
      router.replace("/");
      if (remindersEnabled) scheduleQuarterlyReminders();
      trackEvent(ANALYTICS_EVENTS.onboardingCompleted, {
        state: taxProfile.state,
        hasW2Job: taxProfile.hasW2Job,
      });
    } catch (error) {
      // Without this, a failed save leaves the user stuck on onboarding with no feedback at all —
      // "Continue does nothing" with no error in sight.
      reportError(error, { where: "handleOnboardingComplete" });
      Alert.alert(
        "Couldn't save your info",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  return (
    <ScreenFrame>
      <OnboardingScreen onComplete={handleComplete} />
    </ScreenFrame>
  );
}

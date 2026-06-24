import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

/**
 * Whether an app lock can be enforced on this device at all. False on web (no
 * expo-local-authentication support there) and on devices with no biometrics or device
 * PIN/passcode enrolled — in which case we don't gate the app behind a security feature the
 * user has no way to satisfy.
 */
export async function isAppLockAvailable(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

/**
 * Prompts Face ID / Touch ID / fingerprint, with the OS's own device PIN/passcode fallback
 * after a few failed biometric attempts (disableDeviceFallback defaults to false) — this is
 * what satisfies "PIN lock" here rather than a custom in-app PIN entry screen.
 *
 * Note: Face ID does not work inside Expo Go (iOS) — it needs a development build to test.
 */
export async function unlockWithDeviceAuth(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Gig Tax Tracker",
  });
  return result.success;
}

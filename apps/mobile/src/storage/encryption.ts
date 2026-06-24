import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
// Side-effect import, polyfills crypto.getRandomValues — also imported at the app entry point
// (index.ts) so it's installed before anything else runs, but importing it here too makes this
// module correct in isolation (e.g. for tests) regardless of import order elsewhere.
import "react-native-get-random-values";

export { encryptText, decryptText } from "./cryptoCore";

const SECURE_STORE_KEY_NAME = "gigTaxTracker.encryptionKey";
const RANDOM_KEY_BYTE_LENGTH = 32;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Returns a persistent encryption key, generating and storing one in SecureStore (iOS
 * Keychain / Android Keystore) on first use. Returns null on web — expo-secure-store has no
 * web implementation, and this is a dev-only environment there anyway (see ROADMAP §8.2: real
 * encryption-at-rest is a device-security feature, not something meaningful in a browser tab).
 * A null key means callers should store data as plaintext rather than attempt encryption.
 *
 * Uses the polyfilled Web Crypto API (crypto.getRandomValues) rather than expo-crypto — in this
 * npm-workspaces monorepo, expo-crypto's package resolves from the hoisted root node_modules
 * instead of apps/mobile/node_modules, which hit a known class of Expo autolinking issue: the JS
 * import works fine (so it compiles), but the native module doesn't get registered correctly at
 * runtime, throwing "Native crypto module could not be used to get secure random number" on
 * first use. react-native-get-random-values is a simpler, narrowly-scoped, very widely-used
 * polyfill for exactly this one need, sidestepping that autolinking issue entirely.
 */
export async function getOrCreateEncryptionKey(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const existingKey = await SecureStore.getItemAsync(SECURE_STORE_KEY_NAME);
  if (existingKey) {
    return existingKey;
  }

  const randomBytes = new Uint8Array(RANDOM_KEY_BYTE_LENGTH);
  crypto.getRandomValues(randomBytes);
  const newKey = bytesToHex(randomBytes);
  await SecureStore.setItemAsync(SECURE_STORE_KEY_NAME, newKey);
  return newKey;
}

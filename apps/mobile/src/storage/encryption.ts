import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

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
 */
export async function getOrCreateEncryptionKey(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const existingKey = await SecureStore.getItemAsync(SECURE_STORE_KEY_NAME);
  if (existingKey) {
    return existingKey;
  }

  const randomBytes = await Crypto.getRandomBytesAsync(RANDOM_KEY_BYTE_LENGTH);
  const newKey = bytesToHex(randomBytes);
  await SecureStore.setItemAsync(SECURE_STORE_KEY_NAME, newKey);
  return newKey;
}

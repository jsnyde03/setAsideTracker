import CryptoJS from "crypto-js";

/**
 * Pure AES encrypt/decrypt with no React Native dependency, kept separate from key management
 * (encryption.ts) so this is unit-testable without pulling in RN's Flow-typed source, which
 * Vitest's bundler can't parse outside of a proper Babel/Metro transform.
 *
 * Software-level encryption with a hardware-backed key (Keychain/Keystore, see
 * getOrCreateEncryptionKey in encryption.ts) — meaningful protection against casual disk
 * inspection or a backup being read on another device, but not a substitute for a real security
 * audit before handling production-grade financial data at scale.
 */
export function encryptText(plainText: string, key: string): string {
  return CryptoJS.AES.encrypt(plainText, key).toString();
}

export function decryptText(cipherText: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

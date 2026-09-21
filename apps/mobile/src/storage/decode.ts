import { decryptText, isCipherText } from "./cryptoCore";
import { UnreadableDataError } from "./storageErrors";

/**
 * Turns one stored string back into the value that was written, or throws `UnreadableDataError`.
 *
 * Split out of `repository.ts` so it can be tested directly: `repository` imports AsyncStorage and
 * `encryption` imports react-native's `Platform`, and Vitest cannot parse RN's Flow-typed source.
 * Same reason `cryptoCore.ts` exists.
 *
 * ⛔ **What this replaces, and why it is not a refactor.** The old path decrypted inside a
 * `try`/`catch` and, on any failure, fell through to `JSON.parse(raw)` — parsing the *ciphertext*
 * as JSON. Its comment called that a fallback for "data written before encryption was added". No
 * such data exists: encryption and its wiring into the repository are both in the initial commit,
 * before the first release, and the one genuine plaintext path (web, where there is no key) is
 * handled below without needing a failure to get there. So the fallback could only ever fire on a
 * real decryption failure, where its entire effect was to throw a second, less informative error —
 * a `SyntaxError` about JSON, two layers away from a problem that is about keys.
 *
 * @param storageKey only for the error message, so a failure says *what* could not be read.
 * @param encryptionKey `null` on web, where nothing is encrypted in the first place.
 */
export function decodeStoredValue<T>(storageKey: string, raw: string, encryptionKey: string | null): T {
  if (!isCipherText(raw)) {
    // Plaintext. Only web writes this (no key there), and reading it back needs no key either.
    return parseOrThrow<T>(storageKey, raw);
  }

  if (encryptionKey === null) {
    // Encrypted bytes with no key to open them — a real device's data being read somewhere that has
    // no keystore. Nothing to attempt; saying so is more useful than a parse error.
    throw new UnreadableDataError(storageKey);
  }

  let decrypted: string;
  try {
    decrypted = decryptText(raw, encryptionKey);
  } catch (error) {
    // The minority of wrong-key outcomes: garbage bytes that happen to be invalid UTF-8.
    throw new UnreadableDataError(storageKey, { cause: error });
  }

  // The majority outcome. `decryptText` returns "" rather than throwing when the key is wrong, the
  // payload was truncated, or the bytes are not ours at all. A successful decrypt can never be
  // empty: every write here is `JSON.stringify`, whose shortest possible output is two characters.
  if (decrypted === "") {
    throw new UnreadableDataError(storageKey);
  }

  return parseOrThrow<T>(storageKey, decrypted);
}

function parseOrThrow<T>(storageKey: string, json: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    throw new UnreadableDataError(storageKey, { cause: error });
  }
}

/**
 * Storage failures that callers have to be able to tell apart, rather than whatever generic value
 * happened to be thrown along the way.
 *
 * No react-native import here on purpose — the decode path that throws these stays unit-testable,
 * the same reason `cryptoCore.ts` is kept separate from `encryption.ts`.
 */

/**
 * Stored bytes exist but could not be turned back into the value that was written.
 *
 * ⚠️ **Deliberately not sub-classified by cause.** A wrong key, a truncated payload and outright
 * garbage are *measured to be indistinguishable* — all three make CryptoJS's UTF-8 decode return an
 * empty string (189 of 200 trials; the other 11 threw). Separating them needs an integrity tag the
 * stored format does not have, which is filed as its own v1.3 item. An error that claimed to know
 * which had happened would be guessing, and the recovery is the same either way.
 */
export class UnreadableDataError extends Error {
  /** The storage key whose value could not be read — the app's key name, never the encryption key. */
  readonly storageKey: string;

  constructor(storageKey: string, options?: { cause?: unknown }) {
    super(`Stored data at "${storageKey}" could not be read.`, options);
    // Set explicitly: a subclass name does not survive minification, and this string reaches Sentry.
    this.name = "UnreadableDataError";
    this.storageKey = storageKey;
  }
}

export function isUnreadableDataError(error: unknown): error is UnreadableDataError {
  return error instanceof UnreadableDataError;
}

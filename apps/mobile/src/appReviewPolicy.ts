/**
 * Pure decision logic for the in-app rating prompt — deliberately import-free (no react-native,
 * AsyncStorage, or expo-store-review) so it stays trivially unit-testable in a plain Node/Vitest
 * environment. The native/IO wrapper that uses it lives in appReview.ts.
 */

/** Entry count at which we first surface the prompt — enough logged value to have earned the ask. */
export const REVIEW_ENTRY_THRESHOLD = 5;

export interface ReviewTriggerState {
  entryCount: number;
  /** Whether the user has met their first quarterly catch-up target — the other "real value" moment. */
  catchUpMet: boolean;
  /** Whether we've already shown the prompt once (persisted) — we never ask twice. */
  alreadyRequested: boolean;
}

/**
 * Pure decision: is now the right moment to surface the OS rating prompt? We ask only once, the
 * first time the user crosses a real-value milestone (logging their Nth entry or meeting their first
 * catch-up) — never on first launch, per App Store ranking guidance and Apple's own UX rules.
 */
export function shouldRequestReview({ entryCount, catchUpMet, alreadyRequested }: ReviewTriggerState): boolean {
  if (alreadyRequested) return false;
  return entryCount >= REVIEW_ENTRY_THRESHOLD || catchUpMet;
}

/**
 * The in-memory key-value store demo mode runs on.
 *
 * ## Why this module has no imports
 *
 * It is deliberately pure — no `react-native`, no AsyncStorage, no Expo. That keeps it trivially
 * unit-testable in plain Node/Vitest (the same reason `appReviewPolicy.ts` was split out of
 * `appReview.ts`), and it means the demo/real decision in `repository.ts` is a single expression
 * anyone can check by eye rather than a behaviour spread across a module.
 *
 * ## Why in-memory, with nothing persisted
 *
 * The demo store is a `Map` that dies with the process. Nothing about demo mode is ever written to
 * disk: not the seeded persona, not the entries a visitor adds while exploring, not a "was in demo"
 * flag. That makes the isolation guarantee **structural** rather than something we have to be
 * careful about — there is no persisted demo artifact that a later bug could fail to clean up, and
 * killing the app mid-demo returns to real data with no cleanup step to get wrong.
 *
 * The cost is that demo state doesn't survive a relaunch. That is the correct trade: a demo is a
 * look around, and re-seeding is one tap.
 */

/**
 * The slice of AsyncStorage that `repository.ts` actually uses. Structural, so the real
 * `AsyncStorage` (v3, which renamed `multiRemove` → `removeMany`) satisfies it as-is and the two
 * backends are interchangeable without an adapter.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeMany(keys: string[]): Promise<void>;
}

/**
 * Builds a fresh, empty in-memory store. A new one is created on every demo entry, so a previous
 * session's leftovers can't bleed into the next — entering demo twice gives the same clean persona
 * both times.
 *
 * Values are stored exactly as handed over, encrypted or not. Demo data goes through the identical
 * `readJson`/`writeJson` path as real data, which is what makes demo a genuine exercise of the app
 * rather than a parallel implementation that could diverge.
 */
export function createDemoStore(): KeyValueStore {
  const map = new Map<string, string>();

  return {
    async getItem(key) {
      // `?? null` because Map returns undefined for a miss and AsyncStorage contracts null.
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeMany(keys) {
      for (const key of keys) map.delete(key);
    },
  };
}

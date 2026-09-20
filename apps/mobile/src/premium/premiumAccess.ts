/**
 * The premium-access decision, as a pure function.
 *
 * ## Why this is separate from the hook
 *
 * Same reason `demo/demoMode.ts` is separate from `demo/DemoContext.tsx`: importing the hook pulls
 * in `DemoContext` → `repository` → AsyncStorage → react-native, and this project's unit tests are
 * plain Node with no React renderer at all (there is no testing-library here, and vitest only
 * collects `src/**` + `.test.ts`). Keeping the rule in a dependency-free module is what makes it
 * testable as a truth table rather than only reachable through an e2e.
 *
 * The hook in `usePremiumAccess.ts` is a two-line adapter over this.
 */

export interface PremiumAccess {
  /** The real entitlement, cache-backed and offline-safe. Purchase and export must use only this. */
  isPremium: boolean;
  /**
   * True when premium UI is on screen because a demo is running, with **no** entitlement behind it.
   * False for a paying subscriber exploring the demo — they are not previewing, they own it.
   */
  isDemoPreview: boolean;
  /** Show premium feature UI: a real entitlement, or a demo preview. The gate sites read this. */
  canUsePremium: boolean;
}

/**
 * [D5], Jason 2026-08-08: a demo previews premium through a **separate** boolean, never by faking
 * `isPremium`. The entitlement stays honest, so anything that spends money, writes a real file, or
 * reports subscription status keeps reading the entitlement directly.
 *
 * ⚠️ **Gating something that spends money or leaves the app? You want `isPremium`, not
 * `canUsePremium`.** This is for feature UI whose whole cost is pixels.
 */
export function resolvePremiumAccess(isPremium: boolean, isDemo: boolean): PremiumAccess {
  // A subscriber in a demo is not previewing anything — they already own it. Keeping the two
  // mutually exclusive means `isDemoPreview` answers exactly one question ("is this UI unpaid-for")
  // rather than doubling as "is a demo running", which `useDemo().isDemo` already answers.
  const isDemoPreview = isDemo && !isPremium;

  return { isPremium, isDemoPreview, canUsePremium: isPremium || isDemoPreview };
}

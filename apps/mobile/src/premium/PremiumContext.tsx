import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { reportError } from "../errorReporting";
import { getCachedPremium, saveCachedPremium } from "../storage/repository";
import { getPurchasesClient, isPremiumActive } from "./purchases";

/**
 * App-wide premium entitlement gate. Feature code reads a single `isPremium` boolean via
 * `usePremium()` and never touches RevenueCat internals, keeping the paid/free line in one place
 * and trivially mockable in tests.
 *
 * Offline trust is the core design rule: a failed network call must NEVER lock a paying user out of
 * premium features. So the boolean is hydrated instantly from the encrypted offline cache, then
 * refreshed from RevenueCat — and if that refresh throws (offline, RC down), the cached value is
 * kept rather than downgrading the user to free.
 */
interface PremiumContextValue {
  /** Whether the premium entitlement is currently active (cache-backed, offline-safe). */
  isPremium: boolean;
  /** True only until the first cache read + RevenueCat refresh resolves. */
  isLoading: boolean;
  /** Re-query RevenueCat (e.g. right after a purchase or restore). */
  refresh: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  isLoading: true,
  refresh: async () => {},
});

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const client = getPurchasesClient();
    if (!client) {
      setIsLoading(false);
      return;
    }
    try {
      const info = await client.getCustomerInfo();
      const active = isPremiumActive(info);
      setIsPremium(active);
      await saveCachedPremium(active);
    } catch (error) {
      // Offline / RevenueCat unavailable: trust the already-loaded cached value, don't downgrade.
      reportError(error, { where: "PremiumProvider.refresh" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1. Instant: hydrate from the encrypted offline cache so gated UI doesn't flash "locked".
      try {
        const cached = await getCachedPremium();
        if (mounted) setIsPremium(cached);
      } catch (error) {
        reportError(error, { where: "PremiumProvider.cacheRead" });
      }
      // 2. Then reconcile with RevenueCat (and update the cache). Offline failure keeps the cache.
      await refresh();
    })();

    // 3. Live updates: purchase completes, subscription renews/expires, or restore on another device.
    const client = getPurchasesClient();
    const unsubscribe = client?.addListener((info) => {
      const active = isPremiumActive(info);
      setIsPremium(active);
      saveCachedPremium(active).catch((error) =>
        reportError(error, { where: "PremiumProvider.listener" })
      );
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [refresh]);

  const value = useMemo<PremiumContextValue>(
    () => ({ isPremium, isLoading, refresh }),
    [isPremium, isLoading, refresh]
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

/** Read the premium gate. Returns `{ isPremium, isLoading, refresh }`. */
export function usePremium(): PremiumContextValue {
  return useContext(PremiumContext);
}

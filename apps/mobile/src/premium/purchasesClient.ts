import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

import {
  DEFAULT_OFFERING_ID,
  setPurchasesClient,
  type CustomerInfoLike,
  type PackageLike,
  type PurchaseResult,
} from "./purchases";

/**
 * Wires the real RevenueCat backend into the purchases facade. Kept separate from purchases.ts
 * (which stays import-light/testable) because importing `react-native-purchases` pulls in a native
 * TurboModule that can't load in the Vitest/node test environment — the same native-vs-pure split
 * as analyticsClient.ts vs analytics.ts and appReview.ts vs appReviewPolicy.ts.
 *
 * Reads the public Apple SDK key from EXPO_PUBLIC_RC_IOS_KEY. An `appl_` key is the *public* client
 * key (not a secret), safe to ship in the bundle — same rationale as the Sentry DSN / PostHog key —
 * so it lives in codemagic.yaml, set only for CI/TestFlight builds. With no key set (local dev,
 * tests, web) this leaves the client unattached, so the gate falls back to the offline cache / free
 * tier and the paywall renders its static-price fallback without ever touching the SDK.
 */
let configured = false;

export function initPurchases(): void {
  if (configured) return;
  // IAP is iOS-only for now (Android arrives in v1.2 via the same SDK). On web there's no SDK.
  if (Platform.OS !== "ios") return;
  const apiKey = process.env.EXPO_PUBLIC_RC_IOS_KEY;
  if (!apiKey) return; // no backend configured → facade stays detached, gate uses cache/free

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  configured = true;

  setPurchasesClient({
    getCustomerInfo: () => Purchases.getCustomerInfo(),
    async getDefaultPackages(): Promise<PackageLike[]> {
      const offerings = await Purchases.getOfferings();
      // Prefer the explicitly-named `default` offering; fall back to whatever's marked current.
      const offering = offerings.all[DEFAULT_OFFERING_ID] ?? offerings.current;
      return offering?.availablePackages ?? [];
    },
    async purchase(pkg: PackageLike): Promise<PurchaseResult> {
      try {
        // The facade's PackageLike is a structural subset of the SDK's PurchasesPackage; the object
        // handed to purchase() always originates from getDefaultPackages(), so it IS a real package.
        const { customerInfo } = await Purchases.purchasePackage(
          pkg as unknown as Parameters<typeof Purchases.purchasePackage>[0]
        );
        return { customerInfo, userCancelled: false };
      } catch (error: unknown) {
        // A user backing out of Apple's sheet is the expected non-error path, flagged by the SDK.
        if (error && typeof error === "object" && (error as { userCancelled?: boolean }).userCancelled) {
          return { customerInfo: null, userCancelled: true };
        }
        throw error;
      }
    },
    restore: () => Purchases.restorePurchases(),
    addListener(listener: (info: CustomerInfoLike) => void): () => void {
      Purchases.addCustomerInfoUpdateListener(listener);
      return () => Purchases.removeCustomerInfoUpdateListener(listener);
    },
  });
}

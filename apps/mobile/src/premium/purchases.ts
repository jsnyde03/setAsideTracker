/**
 * Vendor-agnostic premium/IAP facade. Feature code and the PremiumContext import only this file;
 * the real RevenueCat SDK is attached at runtime by purchasesClient.ts via `setPurchasesClient`.
 * This mirrors the analytics.ts/analyticsClient.ts split: it keeps this module import-light so the
 * gate logic stays unit-testable without pulling the native `react-native-purchases` module into
 * the Vitest/node environment. With no client attached (web, local dev, tests, or no API key) the
 * facade reports "not premium" and exposes no packages, so nothing native is ever required.
 */

/** RevenueCat entitlement identifier the gate checks. Must match the RevenueCat dashboard exactly. */
export const PREMIUM_ENTITLEMENT_ID = "premium";

/** RevenueCat offering the paywall reads its packages from. Must match the dashboard exactly. */
export const DEFAULT_OFFERING_ID = "default";

/**
 * Minimal structural shapes this module depends on — intentionally a subset of the real SDK types
 * (`CustomerInfo`, `PurchasesPackage`) so this file imports nothing native and the real SDK objects
 * are still structurally assignable to them at the client boundary.
 */
export interface EntitlementInfoLike {
  identifier: string;
}

export interface CustomerInfoLike {
  entitlements: { active: Record<string, EntitlementInfoLike | undefined> };
}

export interface PackageLike {
  /** RevenueCat package identifier (e.g. "$rc_annual"). */
  identifier: string;
  /** "ANNUAL" | "MONTHLY" | "CUSTOM" | … — used to label the billing period on the paywall. */
  packageType: string;
  product: {
    /** Localized, currency-correct billed price string (e.g. "$29.99") — the paywall's hero value. */
    priceString: string;
    /** Raw price for any subordinate per-unit display. */
    price: number;
    title: string;
    identifier: string;
  };
}

export interface PurchaseResult {
  customerInfo: CustomerInfoLike | null;
  /** True when the user backed out of Apple's purchase sheet — not an error to surface. */
  userCancelled: boolean;
}

export interface PurchasesClient {
  getCustomerInfo(): Promise<CustomerInfoLike>;
  /** Packages of the `default` offering, in display order; empty if none configured. */
  getDefaultPackages(): Promise<PackageLike[]>;
  purchase(pkg: PackageLike): Promise<PurchaseResult>;
  restore(): Promise<CustomerInfoLike>;
  /** Subscribe to entitlement changes (purchase/renewal/expiry); returns an unsubscribe fn. */
  addListener(listener: (info: CustomerInfoLike) => void): () => void;
}

let client: PurchasesClient | null = null;

/** Attach the real RevenueCat-backed client (or detach with `null`). Called once at startup. */
export function setPurchasesClient(next: PurchasesClient | null): void {
  client = next;
}

export function getPurchasesClient(): PurchasesClient | null {
  return client;
}

/**
 * Pure predicate: is the premium entitlement active in this CustomerInfo? `null` (no data yet, or
 * offline with no cache) is treated as not-premium — the offline-cached value is layered on top of
 * this in PremiumContext so a failed network call never downgrades a known-paying user.
 */
export function isPremiumActive(info: CustomerInfoLike | null): boolean {
  if (!info) return false;
  return info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
}

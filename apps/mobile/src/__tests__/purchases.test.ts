import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_OFFERING_ID,
  PREMIUM_ENTITLEMENT_ID,
  getPurchasesClient,
  isPremiumActive,
  setPurchasesClient,
  type CustomerInfoLike,
  type PackageLike,
  type PurchasesClient,
} from "../premium/purchases";

/** A CustomerInfo with the given entitlement ids marked active. */
function customerInfo(activeIds: string[]): CustomerInfoLike {
  return {
    entitlements: {
      active: Object.fromEntries(activeIds.map((id) => [id, { identifier: id }])),
    },
  };
}

afterEach(() => {
  setPurchasesClient(null);
  vi.restoreAllMocks();
});

describe("isPremiumActive", () => {
  it("is false when there is no customer info (offline / not loaded yet)", () => {
    expect(isPremiumActive(null)).toBe(false);
  });

  it("is false when no entitlements are active", () => {
    expect(isPremiumActive(customerInfo([]))).toBe(false);
  });

  it("is true when the premium entitlement is active", () => {
    expect(isPremiumActive(customerInfo([PREMIUM_ENTITLEMENT_ID]))).toBe(true);
  });

  it("is false when only some other entitlement is active", () => {
    expect(isPremiumActive(customerInfo(["some_other_entitlement"]))).toBe(false);
  });

  it("identifiers match the RevenueCat dashboard exactly", () => {
    // Guard against silent drift between code and the dashboard config.
    expect(PREMIUM_ENTITLEMENT_ID).toBe("premium");
    expect(DEFAULT_OFFERING_ID).toBe("default");
  });
});

describe("purchases client registry", () => {
  it("has no client attached by default (web / local / no API key)", () => {
    expect(getPurchasesClient()).toBeNull();
  });

  it("attaches and detaches a client", () => {
    const client = {} as PurchasesClient;
    setPurchasesClient(client);
    expect(getPurchasesClient()).toBe(client);
    setPurchasesClient(null);
    expect(getPurchasesClient()).toBeNull();
  });

  it("a completed purchase yields premium via the same predicate", async () => {
    const annual: PackageLike = {
      identifier: "$rc_annual",
      packageType: "ANNUAL",
      product: { priceString: "$29.99", price: 29.99, title: "Premium Annual", identifier: "com.gigtaxtracker.app.premium.annual" },
    };
    const fakeClient: PurchasesClient = {
      getCustomerInfo: vi.fn(async () => customerInfo([])),
      getDefaultPackages: vi.fn(async () => [annual]),
      purchase: vi.fn(async () => ({ customerInfo: customerInfo([PREMIUM_ENTITLEMENT_ID]), userCancelled: false })),
      restore: vi.fn(async () => customerInfo([PREMIUM_ENTITLEMENT_ID])),
      addListener: vi.fn(() => () => {}),
    };
    setPurchasesClient(fakeClient);

    const client = getPurchasesClient();
    expect(client).not.toBeNull();
    const result = await client!.purchase(annual);
    expect(result.userCancelled).toBe(false);
    expect(isPremiumActive(result.customerInfo)).toBe(true);
  });

  it("a cancelled purchase does not grant premium", async () => {
    const fakeClient: PurchasesClient = {
      getCustomerInfo: vi.fn(async () => customerInfo([])),
      getDefaultPackages: vi.fn(async () => []),
      purchase: vi.fn(async () => ({ customerInfo: null, userCancelled: true })),
      restore: vi.fn(async () => customerInfo([])),
      addListener: vi.fn(() => () => {}),
    };
    setPurchasesClient(fakeClient);

    const result = await getPurchasesClient()!.purchase({} as PackageLike);
    expect(result.userCancelled).toBe(true);
    expect(isPremiumActive(result.customerInfo)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { resolvePremiumAccess } from "../premium/premiumAccess";

/**
 * [D5]'s guarantee in full: a demo previews premium UI without ever making the entitlement boolean
 * lie. The four-cell truth table is the whole rule, so it is asserted exhaustively rather than by
 * example — this is the function that decides whether unpaid users see paid features.
 */
describe("resolvePremiumAccess", () => {
  it("free user, no demo: nothing unlocked", () => {
    expect(resolvePremiumAccess(false, false)).toEqual({
      isPremium: false,
      isDemoPreview: false,
      canUsePremium: false,
    });
  });

  it("free user in a demo: previews premium UI, entitlement still false", () => {
    expect(resolvePremiumAccess(false, true)).toEqual({
      isPremium: false,
      isDemoPreview: true,
      canUsePremium: true,
    });
  });

  it("subscriber, no demo: entitled, not previewing", () => {
    expect(resolvePremiumAccess(true, false)).toEqual({
      isPremium: true,
      isDemoPreview: false,
      canUsePremium: true,
    });
  });

  it("subscriber in a demo is NOT previewing — they own it", () => {
    // isDemoPreview means "this UI is unpaid-for", not "a demo is running" (useDemo().isDemo
    // already answers that). A subscriber exploring the demo must not be described as previewing.
    expect(resolvePremiumAccess(true, true)).toEqual({
      isPremium: true,
      isDemoPreview: false,
      canUsePremium: true,
    });
  });

  it("NEVER reports an entitlement the account does not have", () => {
    // The one invariant that matters for billing honesty: isPremium is a pass-through, always.
    // If this ever fails, a demo is claiming a subscription the user is not paying for.
    for (const isPremium of [true, false]) {
      for (const isDemo of [true, false]) {
        expect(resolvePremiumAccess(isPremium, isDemo).isPremium).toBe(isPremium);
      }
    }
  });

  it("a demo alone never grants the entitlement, only the preview", () => {
    const demoed = resolvePremiumAccess(false, true);
    expect(demoed.isPremium).toBe(false);
    expect(demoed.canUsePremium).toBe(true);
    // canUsePremium and isPremium must be able to disagree — that divergence IS the feature.
    expect(demoed.canUsePremium).not.toBe(demoed.isPremium);
  });
});

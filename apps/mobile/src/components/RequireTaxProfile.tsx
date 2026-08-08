import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { useAppData } from "../state/AppDataContext";

/**
 * Gates every route that can't render without a completed profile.
 *
 * Before 1.2.0.4 this was structurally impossible to get wrong: the screen dispatch only ever
 * rendered these when a profile existed, which is why they all cast `taxProfile as TaxProfile`. Real
 * routing made those states addressable — by URL on web, and by deep link on device now that
 * `app.json` declares a `scheme` — so the cast became a lie a stranger with a link could expose. This
 * makes it true again, and the casts behind it honest.
 *
 * ⚠️ **This is the one place demo mode (1.2.1) will need to widen.** A demo exists precisely for
 * someone who hasn't onboarded, so the condition becomes "has a profile OR is in demo" — Debt hit
 * exactly this at its own `3.5.4.3`, where a blanket onboarding guard locked out the audience the
 * demo was built for. Keeping the check in one component is what makes that a one-line change.
 */
export function RequireTaxProfile({ children }: { children: ReactNode }) {
  const { localUserProfile, taxProfile } = useAppData();

  // `AppGate` has already waited for the load, so absent here means genuinely absent rather than
  // not-yet-loaded — otherwise this would bounce users out mid-boot.
  if (!localUserProfile || !taxProfile) {
    return <Redirect href="/onboarding" />;
  }

  return <>{children}</>;
}

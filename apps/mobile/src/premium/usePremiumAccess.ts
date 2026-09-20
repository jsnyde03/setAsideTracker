import { useDemo } from "../demo/DemoContext";
import { resolvePremiumAccess, type PremiumAccess } from "./premiumAccess";
import { usePremium } from "./PremiumContext";

export type { PremiumAccess } from "./premiumAccess";

/**
 * Whether premium *feature UI* should be shown — which is not the same question as whether the user
 * has paid. The rule itself, and the reasoning behind it, live in `premiumAccess.ts`; this is the
 * React adapter over it.
 *
 * ## Why this can't be a field on `PremiumContext`
 *
 * `PremiumProvider` sits **above** `DemoProvider` in `app/_layout.tsx`, and it has to: entering and
 * leaving a demo both re-read through `AppDataProvider`, which is below premium. A parent context
 * cannot read a child's, so premium genuinely cannot know a demo is running. Composing the two here
 * is the only place that can, and it keeps `PremiumContext` free of any demo concept.
 *
 * ⚠️ **Gating something that spends money or leaves the app** — purchase, PDF export, the "Premium
 * active" row — **read `usePremium().isPremium` directly instead.**
 */
export function usePremiumAccess(): PremiumAccess {
  const { isPremium } = usePremium();
  const { isDemo } = useDemo();

  return resolvePremiumAccess(isPremium, isDemo);
}

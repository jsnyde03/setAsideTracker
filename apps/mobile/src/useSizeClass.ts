import { useWindowDimensions } from "react-native";
import { resolveSizeClass, type SizeClass } from "./layout";

/**
 * The live size class, for a screen that needs to lay out differently on a tablet (the dashboard's
 * multi-column layout, 1.2.7.3). `Screen` applies the default content width on its own, so most
 * screens never call this.
 *
 * Backed by `useWindowDimensions`, which re-renders on every window resize — that is what makes
 * Split View and Stage Manager work **by construction** rather than settling once on mount
 * (1.2.7.5).
 *
 * ⛔ **It lives here, apart from the rule in `layout.ts`, for a reason that bites immediately:**
 * importing `react-native` makes a module uncollectable by vitest (its entry point is Flow-typed
 * and vitest runs in plain Node). Keeping that import out of `layout.ts` is what lets the rule have
 * unit tests at all.
 */
export function useSizeClass(): SizeClass {
  const { width } = useWindowDimensions();
  return resolveSizeClass(width);
}

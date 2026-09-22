import { useWindowDimensions, type ViewStyle } from "react-native";
import { resolveSheetMaxWidth, resolveSizeClass, type SizeClass } from "./layout";

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

/**
 * The width constraint a bottom sheet applies on a regular-width window, or `undefined` on compact.
 *
 * ⚠️ **One helper rather than four copies of the same three properties.** All four sheets are the
 * same pattern already (`backdrop: flex-end` + a `sheet` with rounded top corners), and this repo
 * has a standing entry about `formatCurrency` being defined ten times because each caller fixed its
 * own instance. A fifth sheet gets this by spreading one value.
 *
 * Stays bottom-anchored — only the horizontal span changes — so the top-corners-only radius is
 * still right and the open/close animation is untouched.
 */
export function useSheetWidthStyle(): ViewStyle | undefined {
  const { width } = useWindowDimensions();
  const maxWidth = resolveSheetMaxWidth(width);
  return maxWidth === undefined ? undefined : { maxWidth, width: "100%", alignSelf: "center" };
}

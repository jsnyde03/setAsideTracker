import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Whether the OS's **Reduce Motion** setting is on, live.
 *
 * ⚠️ **Subscribed, not read once.** A user can turn Reduce Motion on while the app is open — it is
 * in Control Center on iOS — and a value captured at mount would go on animating for the rest of
 * the session. `AccessibilityInfo` emits a change event; this listens to it.
 *
 * ⚠️ Starts `false` and corrects itself on the first tick rather than blocking a render. The cost
 * of being briefly wrong is one entrance animation at launch; the cost of blocking is a blank
 * screen, which is worse for everybody including the person this setting exists for.
 *
 * ⛔ Lives apart from `motion.ts` because importing `react-native` makes a module uncollectable by
 * vitest — the same split as `layout.ts` / `useSizeClass.ts`.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        // Never let an accessibility probe take a screen down: the fallback is "animate", which is
        // the current behaviour.
      });

    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}

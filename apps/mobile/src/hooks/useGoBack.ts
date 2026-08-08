import { useCallback } from "react";
import { useRouter } from "expo-router";

/**
 * Closing a screen, safely for a route that was entered directly.
 *
 * Every screen's close button called `router.back()` after 1.2.0.4, which is correct when the user
 * pushed their way in. It is a dead button when they didn't — and since `app.json` now declares a
 * `scheme`, a route can be entered with no history at all: a deep link, a shared URL, a bookmark, or
 * a cold start onto a saved location. `back()` on an empty stack does nothing, so the X does nothing,
 * and the only way out is force-quitting the app.
 *
 * Falling back to the dashboard keeps the button meaningful in both cases. Found at 1.2.0.7 by
 * walking every route via `goto()` — no assertion covered it, because every test reaches these
 * screens by tapping through, which is the one path where `back()` was always fine.
 */
export function useGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);
}

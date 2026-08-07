import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { getAppSettings, updateAppSettings } from "./storage/repository";
import { darkColors, lightColors, type Colors } from "./theme";

export type ColorSchemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  colors: Colors;
  isDark: boolean;
  /** The user's saved preference, as opposed to the resolved light/dark result in `isDark`. */
  scheme: ColorSchemePreference;
  /** Updates the preference and persists it. Throws if the write fails, so callers can surface it. */
  setScheme: (scheme: ColorSchemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  scheme: "system",
  setScheme: async () => {},
});

/**
 * Resolves the user's saved scheme preference against the OS-reported scheme (only relevant when
 * the preference is "system") and provides the matching color palette. `useColorScheme()` is the
 * only thing here that's reactive to OS-level changes — switching the device's own light/dark
 * setting while the app is open updates `isDark` automatically when the preference is "system".
 *
 * The preference itself lives here rather than being passed in. It used to be state in `App`, lifted
 * above this provider purely because a component can't consume a context it renders itself — which
 * meant only `App` could change the theme, and every consumer had to be prop-drilled from it. Owning
 * it here lets any route change the theme directly, which is what makes the screens independently
 * routable (1.2.0.2). Persistence is a merge, so writing the theme can't clobber the other settings.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [scheme, setSchemeState] = useState<ColorSchemePreference>("system");

  // Load the saved preference once. Until it arrives the default "system" applies, which is the
  // same thing an unset preference resolves to — so there's no flash of the wrong theme for the
  // users who never chose one, and only a brief one for those who did.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await getAppSettings();
        if (!cancelled && settings.colorScheme) setSchemeState(settings.colorScheme);
      } catch {
        // A settings read failure must not stop the app from rendering — "system" is a safe default.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setScheme = useCallback(async (next: ColorSchemePreference) => {
    setSchemeState(next);
    await updateAppSettings({ colorScheme: next });
  }, []);

  const isDark = scheme === "dark" || (scheme === "system" && systemScheme === "dark");
  const value = useMemo(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, scheme, setScheme }),
    [isDark, scheme, setScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** For class components, which can't call hooks — see ErrorBoundary's `static contextType`. */
export { ThemeContext };

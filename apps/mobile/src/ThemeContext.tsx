import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type Colors } from "./theme";

export type ColorSchemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  colors: Colors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ colors: lightColors, isDark: false });

interface ThemeProviderProps {
  /** The user's saved preference (defaults to "system" if not yet set anywhere). */
  scheme: ColorSchemePreference;
  children: ReactNode;
}

/**
 * Resolves the user's saved scheme preference against the OS-reported scheme (only relevant when
 * the preference is "system") and provides the matching color palette. `useColorScheme()` is the
 * only thing here that's reactive to OS-level changes — switching the device's own light/dark
 * setting while the app is open updates `isDark` automatically when the preference is "system".
 */
export function ThemeProvider({ scheme, children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const isDark = scheme === "dark" || (scheme === "system" && systemScheme === "dark");
  const value = useMemo(
    () => ({ colors: isDark ? darkColors : lightColors, isDark }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** For class components, which can't call hooks — see ErrorBoundary's `static contextType`. */
export { ThemeContext };

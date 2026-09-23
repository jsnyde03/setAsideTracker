import { Platform } from "react-native";

/** Light palette — the original, unchanged token values. */
export const lightColors = {
  bg: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F2F5",

  ink: "#13161B",
  inkSubtle: "#5B6270",
  /** ⚠️ WCAG AA against EVERY surface token, not just the three obvious ones — 1.2.9.3.
   *  Was #9AA1AC, which read 2.45:1 and failed AA on hint text across eight routes. */
  inkFaint: "#676C74",

  primary: "#0F5FE0",
  primaryDark: "#0A3F99",
  primarySoft: "#E8F0FE",
  /** The primary BUTTON's fill, separate from `primary` on purpose.
   *  ⛔ In dark mode one value cannot serve both: `primary` #3B82F6 is 4.54:1 as TEXT on a dark
   *  surface and only 3.68:1 UNDER WHITE, so darkening it for the buttons would have broken the
   *  twelve places it is read as text. Splitting the token is what lets both pass. */
  primaryButton: "#0F5FE0",

  /** Was #0E8F5E — 4.11 on white and 4.04 on accentSoft, so it failed AA in both places it is
   *  used as text ("You're on track", "Best value"). */
  accent: "#0C7E53",
  accentSoft: "#E3F6ED",

  warn: "#B8860B",
  warnBg: "#FFF8E8",
  warnBorder: "#F0DDA0",

  danger: "#C0341F",
  dangerSoft: "#FBE9E6",

  border: "#E4E7EC",
  borderSoft: "#EEF0F3",

  overlay: "rgba(15, 18, 25, 0.55)",
};

/** Dark palette — same semantic token set as lightColors, every screen/component reads through
 * useTheme() so it actually applies; see ThemeContext.tsx. */
export const darkColors: typeof lightColors = {
  bg: "#0F1219",
  surface: "#1A1E27",
  surfaceAlt: "#222632",

  ink: "#F2F4F7",
  inkSubtle: "#A8AFBC",
  /** Was #6B7280 — 3.12:1 on surfaceAlt. Lightened rather than darkened: this is the dark theme.
   *  ⚠️ Solved against every surface token including primarySoft — the first attempt passed on
   *  bg/surface/surfaceAlt and still failed on the paywall's selected plan card. */
  inkFaint: "#9197A1",

  primary: "#3B82F6",
  /** ⛔ A DARK blue was wrong for a dark theme. This token colours the selected chip label and the
   *  glossary terms, which sit on primarySoft (#1E2A44) — so #1D4ED8 was dark-on-dark at 2.13:1,
   *  the worst contrast in the app. Lighter is the direction here. */
  primaryDark: "#6E8DE6",
  primarySoft: "#1E2A44",
  primaryButton: "#3473DA",

  accent: "#34D399",
  accentSoft: "#16302A",

  warn: "#FBBF24",
  warnBg: "#3A2E12",
  warnBorder: "#5A4A1E",

  danger: "#F87171",
  dangerSoft: "#3A1F1F",

  border: "#2B3040",
  borderSoft: "#242834",

  overlay: "rgba(0, 0, 0, 0.65)",
};

export type Colors = typeof lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const type = {
  display: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
  micro: { fontSize: 11, fontWeight: "400" as const },
};

export const shadow = Platform.select({
  web: {
    boxShadow: "0 1px 3px rgba(15, 18, 25, 0.08), 0 8px 24px rgba(15, 18, 25, 0.06)",
  },
  default: {
    shadowColor: "#0F1219",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
}) as object;

export const shadowSm = Platform.select({
  web: {
    boxShadow: "0 1px 2px rgba(15, 18, 25, 0.06)",
  },
  default: {
    shadowColor: "#0F1219",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
}) as object;

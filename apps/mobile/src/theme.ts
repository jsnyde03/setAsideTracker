import { Platform } from "react-native";

export const colors = {
  bg: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F2F5",

  ink: "#13161B",
  inkSubtle: "#5B6270",
  inkFaint: "#9AA1AC",

  primary: "#0F5FE0",
  primaryDark: "#0A3F99",
  primarySoft: "#E8F0FE",

  accent: "#0E8F5E",
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

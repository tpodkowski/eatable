export type ThemeMode = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark" | null | undefined;

export const rainbowColors = ["#F44336", "#FF9800", "#FFEB3B", "#4CAF50", "#2196F3", "#9C27B0"] as const;

export const themes = {
  light: {
    background: "#FFF9ED",
    surface: "#FFFFFF",
    surfaceAlt: "#FFF0C9",
    text: "#271C34",
    muted: "#6D6274",
    subtle: "#8B8190",
    border: "#E8DFD0",
    primary: "#8338EC",
    primaryText: "#FFFFFF",
    amber: "#FFBE0B",
    orange: "#FB5607",
    pink: "#FF006E",
    violet: "#8338EC",
    blue: "#3A86FF",
    danger: "#C83255",
    success: "#27813D",
    input: "#FFFFFF",
    placeholder: "#8B8190",
    divider: "#E8DFD0",
  },
  dark: {
    background: "#17121F",
    surface: "#241B30",
    surfaceAlt: "#332342",
    text: "#FFF8EF",
    muted: "#C5B8CE",
    subtle: "#A99CB3",
    border: "#493952",
    primary: "#8338EC",
    primaryText: "#FFFFFF",
    amber: "#FFBE0B",
    orange: "#FB5607",
    pink: "#FF006E",
    violet: "#8338EC",
    blue: "#3A86FF",
    danger: "#FF8299",
    success: "#78D992",
    input: "#21192B",
    placeholder: "#A99CB3",
    divider: "#493952",
  },
} as const;

export type ThemeName = keyof typeof themes;
export type ThemeColors = (typeof themes)[ThemeName];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(mode: ThemeMode, systemScheme: ColorScheme): ThemeName {
  if (mode === "light" || mode === "dark") return mode;
  return systemScheme === "dark" ? "dark" : "light";
}

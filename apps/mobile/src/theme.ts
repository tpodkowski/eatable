export type ThemeMode = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark" | null | undefined;

export const themes = {
  light: {
    background: "#FFFFFF",
    surface: "#F4F4F4",
    surfaceAlt: "#EEEEEE",
    text: "#212121",
    muted: "#5E5E5E",
    subtle: "#777777",
    border: "#D6D6D6",
    primary: "#587500",
    primaryText: "#FFFFFF",
    amber: "#587500",
    orange: "#587500",
    pink: "#587500",
    violet: "#587500",
    blue: "#587500",
    danger: "#C83232",
    success: "#587500",
    input: "#FFFFFF",
    placeholder: "#777777",
    divider: "#D6D6D6",
  },
  dark: {
    background: "#212121",
    surface: "#282828",
    surfaceAlt: "#282828",
    text: "#FFFFFF",
    muted: "#D0D0D0",
    subtle: "#A0A0A0",
    border: "#414141",
    primary: "#D0FE5D",
    primaryText: "#212121",
    amber: "#D0FE5D",
    orange: "#D0FE5D",
    pink: "#D0FE5D",
    violet: "#D0FE5D",
    blue: "#D0FE5D",
    danger: "#FF7B7B",
    success: "#D0FE5D",
    input: "#282828",
    placeholder: "#A0A0A0",
    divider: "#414141",
  },
} as const;

export type ThemeName = keyof typeof themes;
export type ThemeColors = (typeof themes)[ThemeName];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(mode: ThemeMode, systemScheme: ColorScheme): ThemeName {
  if (mode === "light" || mode === "dark") return mode;
  return systemScheme === "light" ? "light" : "dark";
}

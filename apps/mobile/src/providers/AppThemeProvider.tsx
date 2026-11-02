import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { readThemePreference, saveThemePreference } from "../lib/preferences";
import { isThemeMode, resolveTheme, themes } from "../theme";
import type { ThemeMode } from "../theme";

interface AppThemeContextValue {
  mode: ThemeMode;
  name: "light" | "dark";
  colors: (typeof themes)[keyof typeof themes];
  setMode: (mode: ThemeMode) => Promise<void>;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: React.PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const name = resolveTheme(mode, systemScheme);
  const colors = themes[name];

  useEffect(() => {
    let active = true;
    void readThemePreference()
      .then((storedMode) => {
        if (active && isThemeMode(storedMode)) setModeState(storedMode);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      await saveThemePreference(nextMode);
    } catch {
      // Keep the chosen appearance for this session if device storage is unavailable.
    }
  }, []);

  const value = useMemo(() => ({ mode, name, colors, setMode }), [mode, name, colors, setMode]);
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error("useAppTheme must be used inside AppThemeProvider");
  return context;
}

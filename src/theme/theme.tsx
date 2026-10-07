import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, useColorScheme } from "react-native";

import { getSetting, setSetting } from "@/db/repositories/settings";
import { DARK_COLORS, LIGHT_COLORS, type ThemeColors } from "@/theme/colors";

// "system" follows the phone's setting.
export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  colors: ThemeColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

// Applies the saved theme (Settings → Aparência) to the whole app: our own
// colours, the navigation bars and native parts (alerts, keyboard).
// Must be inside SQLiteProvider.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const scheme = useColorScheme();

  useEffect(() => {
    getSetting(db, "theme")
      .then((saved) => {
        if (isThemeMode(saved)) setModeState(saved);
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
  }, [mode]);

  const setMode = useCallback(
    async (next: ThemeMode) => {
      setModeState(next);
      await setSetting(db, "theme", next);
    },
    [db],
  );

  // With a forced mode, useColorScheme already returns it (setColorScheme).
  const isDark = (mode === "system" ? scheme : mode) === "dark";
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        primary: isDark ? "#60a5fa" : "#2563eb",
      },
    };
  }, [isDark, colors]);

  const value = useMemo(
    () => ({ mode, setMode, colors, isDark }),
    [mode, setMode, colors, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={isDark ? "light" : "dark"} />
        {children}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

export function useColors(): ThemeColors {
  return useTheme().colors;
}

// Builds a StyleSheet from the current colours, again only when they change:
//   const styles = useThemedStyles(createStyles);
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [factory, colors]);
}

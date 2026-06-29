import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { darkTheme, withAccent, type Theme, type ThemeAccent } from './theme';

const ThemeContext = createContext<Theme>(darkTheme);

/** Root theme provider. Wrap the whole app once near the navigation root. */
export function ThemeProvider({
  theme = darkTheme,
  children,
}: {
  theme?: Theme;
  children: ReactNode;
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/**
 * Tints a subtree with a game mode's accent. Nested under the root provider so
 * every button, progress bar and glow inside a game adopts its signature color.
 */
export function AccentProvider({
  accent,
  children,
}: {
  accent?: ThemeAccent;
  children: ReactNode;
}) {
  const base = useContext(ThemeContext);
  const themed = useMemo(() => withAccent(base, accent), [base, accent]);
  return <ThemeContext.Provider value={themed}>{children}</ThemeContext.Provider>;
}

/** Access the active theme (root or accent-tinted). */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

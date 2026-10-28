/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // New storage key: any previously saved "mer-theme" preference (incl. old
    // "dark" values) is ignored so everyone lands on the light brand theme.
    try { localStorage.removeItem("mer-theme"); } catch { /* private mode */ }
    const stored = localStorage.getItem("mer-theme-v2");
    return stored === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    if (!document.querySelector('link[data-mer-fonts]')) {
      const fonts = document.createElement("link");
      fonts.rel = "stylesheet";
      fonts.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;450;500&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap";
      fonts.dataset.merFonts = "true";
      document.head.appendChild(fonts);
    }
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.remove("dark");
    localStorage.setItem("mer-theme-v2", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

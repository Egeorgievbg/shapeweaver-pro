import { useEffect, useState } from "react";
import { preferences } from "@/stores/persistence";

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">(() => preferences.getTheme());

  useEffect(() => {
    const cls = document.documentElement.classList;
    if (theme === "dark") cls.add("dark");
    else cls.remove("dark");
    preferences.setTheme(theme);
  }, [theme]);

  return {
    theme,
    setTheme: setThemeState,
    toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
  };
}

"use client";

import { useState, useEffect } from "react";
import { useThemeStore } from "@/store/theme.store";
import { resolveThemeClass } from "../theme.types";

/**
 * Hook that returns whether the current rendered theme is dark.
 * Single Responsibility: Synchronizes theme state with documentElement class and system media queries.
 */
export function useIsDarkMode(): boolean {
  const theme = useThemeStore((s) => s.theme);
  const hasHydrated = useThemeStore((s) => s._hasHydrated);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const resolved = resolveThemeClass(theme, media.matches);
      setIsDark(resolved === "dark");
    };

    update();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);

    // Also observe class mutations on <html> in case ThemeProvider updates it
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, [theme, hasHydrated]);

  return isDark;
}

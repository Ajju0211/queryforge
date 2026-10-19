"use client";

/**
 * ThemeProvider — the ONLY place that applies/removes `dark` on <html>.
 *
 * Waits for Zustand's persist layer to hydrate from localStorage before
 * applying the class, preventing a flash-of-wrong-theme (FOWT).
 */

import { useEffect, useRef } from "react";
import { useThemeStore } from "@/store/theme.store";
import { resolveThemeClass } from "@/domain/theme/theme.types";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useThemeStore((s) => s.theme);
  const hasHydrated = useThemeStore((s) => s._hasHydrated);
  const mediaRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    // Don't apply until Zustand has restored the persisted value
    if (!hasHydrated) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    mediaRef.current = media;

    /** Apply or remove `.dark` on <html> */
    const apply = () => {
      const cls = resolveThemeClass(theme, media.matches);
      document.documentElement.classList.toggle("dark", cls === "dark");
    };

    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, hasHydrated]);

  return <>{children}</>;
}

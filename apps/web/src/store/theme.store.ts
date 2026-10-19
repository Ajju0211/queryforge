/**
 * Theme Store — Zustand SSOT for the active theme preference.
 *
 * - Persists the user's choice in localStorage under THEME_STORAGE_KEY.
 * - Exposes `setTheme` as the single write-path for theme changes.
 * - Exposes `_hasHydrated` so consumers can wait before applying classes
 *   (prevents flash-of-wrong-theme on initial render).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Theme, THEME_STORAGE_KEY } from "@/domain/theme/theme.types";

interface ThemeState {
  /** The user-selected preference: "light" | "dark" | "system" */
  theme: Theme;
  /** True once the persisted state has been restored from localStorage */
  _hasHydrated: boolean;
  /** Update the persisted theme preference */
  setTheme: (theme: Theme) => void;
  /** Called internally by Zustand after rehydration completes */
  _setHasHydrated: (value: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      _hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      _setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: THEME_STORAGE_KEY,
      // Only persist the user's preference — not internal flags
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        // Signal that localStorage restore is complete
        state?._setHasHydrated(true);
      },
    }
  )
);

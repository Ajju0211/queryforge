/**
 * Theme Domain — types and SSOT for the theme system.
 * Three modes: light, dark, system (follows OS preference).
 */

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "qf-theme" as const;

/** Returns the CSS class to apply to <html> given a resolved preference. */
export function resolveThemeClass(theme: Theme, systemIsDark: boolean): "dark" | "" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "";
  return systemIsDark ? "dark" : "";
}

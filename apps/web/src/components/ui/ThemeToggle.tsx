"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeStore } from "@/store/theme.store";

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const hasHydrated = useThemeStore((s) => s._hasHydrated);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-md border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground h-7.5 w-7.5"
          title="Switch theme"
          aria-label="Switch theme"
        >
          {theme === "light" && <Sun className="h-3.5 w-3.5 text-amber-500" />}
          {theme === "dark" && <Moon className="h-3.5 w-3.5 text-foreground" />}
          {(theme === "system" || !hasHydrated) && <Laptop className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 rounded-md p-1 bg-popover border-border shadow-lg">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`flex items-center gap-2 text-xs font-medium cursor-pointer rounded-sm px-2.5 py-1.5 ${
            theme === "light" ? "bg-muted text-foreground font-semibold" : ""
          }`}
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-2 text-xs font-medium cursor-pointer rounded-sm px-2.5 py-1.5 ${
            theme === "dark" ? "bg-muted text-foreground font-semibold" : ""
          }`}
        >
          <Moon className="h-3.5 w-3.5 text-foreground" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`flex items-center gap-2 text-xs font-medium cursor-pointer rounded-sm px-2.5 py-1.5 ${
            theme === "system" ? "bg-muted text-foreground font-semibold" : ""
          }`}
        >
          <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

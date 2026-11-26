"use client";

import React, { useState, useEffect } from "react";
import { useThemeStore } from "@/store/theme.store";
import { type Theme } from "@/domain/theme/theme.types";
import { ApiStatusBadge } from "@/components/system/ApiStatusBadge";
import { useApiHealth } from "@/domain/system/hooks/useApiHealth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Check,
  Terminal,
  Network,
  Shield,
  Trash2,
  RefreshCw,
  Database,
  Sliders,
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { isOnline, health, checkHealth } = useApiHealth();

  // Local storage persisted preferences with sensible defaults
  const [rowLimit, setRowLimit] = useState<number>(50);
  const [queryTimeout, setQueryTimeout] = useState<number>(30);
  const [autoFormatSql, setAutoFormatSql] = useState<boolean>(true);
  const [warnDestructive, setWarnDestructive] = useState<boolean>(true);
  const [autoFitGraph, setAutoFitGraph] = useState<boolean>(true);
  const [compactDensity, setCompactDensity] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedLimit = localStorage.getItem("queryforge:setting:row-limit");
        if (savedLimit) setRowLimit(Number(savedLimit));

        const savedTimeout = localStorage.getItem("queryforge:setting:query-timeout");
        if (savedTimeout) setQueryTimeout(Number(savedTimeout));

        const savedAutoFormat = localStorage.getItem("queryforge:setting:auto-format");
        if (savedAutoFormat !== null) setAutoFormatSql(savedAutoFormat === "true");

        const savedWarn = localStorage.getItem("queryforge:setting:warn-destructive");
        if (savedWarn !== null) setWarnDestructive(savedWarn === "true");

        const savedAutoFit = localStorage.getItem("queryforge:setting:autofit-graph");
        if (savedAutoFit !== null) setAutoFitGraph(savedAutoFit === "true");

        const savedDensity = localStorage.getItem("queryforge:setting:compact-density");
        if (savedDensity !== null) setCompactDensity(savedDensity === "true");
      } catch {
        // Ignore localStorage error
      }
    }
  }, []);

  const handleUpdate = (key: string, val: string | number | boolean) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`queryforge:setting:${key}`, String(val));
      } catch {
        // Ignore
      }
    }
  };

  const handleClearCache = () => {
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("queryforge:cache:")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        toast.success("Cache cleared", {
          description: "Cached introspection and schema records have been refreshed.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Could not clear cache.";
        toast.error("Failed", { description: msg });
      }
    }
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      {/* Workspace Header Rail — 48px */}
      <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h1 className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
            Settings & Preferences
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ApiStatusBadge />
        </div>
      </header>

      {/* Main Settings Form Scroll Container */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
          {/* Section 1: Appearance & Theme */}
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
                Appearance
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Customize QueryForge’s visual theme and interface density.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Light Theme Card */}
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`group flex flex-col items-start rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
                  theme === "light"
                    ? "border-foreground bg-card ring-1 ring-foreground/20 shadow-xs"
                    : "border-border bg-card/60 hover:border-foreground/30 hover:bg-muted/30"
                }`}
              >
                <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-[#fafaf8] text-[#17191b]">
                  <Sun className="h-3.5 w-3.5" />
                </div>
                <div className="flex w-full items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">Light Studio</span>
                  {theme === "light" && <Check className="h-3.5 w-3.5 text-foreground" />}
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  Warm paper, low glare
                </span>
              </button>

              {/* Dark Theme Card */}
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`group flex flex-col items-start rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
                  theme === "dark"
                    ? "border-foreground bg-card ring-1 ring-foreground/20 shadow-xs"
                    : "border-border bg-card/60 hover:border-foreground/30 hover:bg-muted/30"
                }`}
              >
                <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-md border border-[#2c2c30] bg-[#131315] text-[#f1f1ef]">
                  <Moon className="h-3.5 w-3.5" />
                </div>
                <div className="flex w-full items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">Matte Graphite</span>
                  {theme === "dark" && <Check className="h-3.5 w-3.5 text-foreground" />}
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  Pure dark, zero glow
                </span>
              </button>

              {/* System Theme Card */}
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`group flex flex-col items-start rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
                  theme === "system"
                    ? "border-foreground bg-card ring-1 ring-foreground/20 shadow-xs"
                    : "border-border bg-card/60 hover:border-foreground/30 hover:bg-muted/30"
                }`}
              >
                <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                  <Laptop className="h-3.5 w-3.5" />
                </div>
                <div className="flex w-full items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">System Synced</span>
                  {theme === "system" && <Check className="h-3.5 w-3.5 text-foreground" />}
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  Follows macOS / OS
                </span>
              </button>
            </div>

            {/* Density toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5 shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[13px] font-medium text-foreground">
                  Compact row density
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Reduces padding across data tables and table schema lists.
                </p>
              </div>
              <Switch
                checked={compactDensity}
                onCheckedChange={(checked) => {
                  setCompactDensity(checked);
                  handleUpdate("compact-density", checked);
                  toast.info(checked ? "Compact mode enabled" : "Default row padding restored");
                }}
              />
            </div>
          </section>

          {/* Section 2: SQL Execution & Query Defaults */}
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span>SQL Query Execution</span>
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Runtime guardrails, timeouts, and query formatting options.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-2xs divide-y divide-border/60">
              {/* Row Limit */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[13px] font-medium text-foreground">
                    Default query limit
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Maximum rows fetched when executing queries without explicit LIMIT.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {[25, 50, 100, 250].map((limit) => (
                    <button
                      key={limit}
                      type="button"
                      onClick={() => {
                        setRowLimit(limit);
                        handleUpdate("row-limit", limit);
                      }}
                      className={`h-7 rounded border px-2.5 transition-colors cursor-pointer ${
                        rowLimit === limit
                          ? "border-foreground bg-muted font-semibold text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {limit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Execution Timeout */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="space-y-0.5">
                  <span className="text-[13px] font-medium text-foreground">
                    Query timeout
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Abort long-running SQL statements after elapsed seconds.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {[15, 30, 60].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setQueryTimeout(t);
                        handleUpdate("query-timeout", t);
                      }}
                      className={`h-7 rounded border px-2.5 transition-colors cursor-pointer ${
                        queryTimeout === t
                          ? "border-foreground bg-muted font-semibold text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Format SQL */}
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="space-y-0.5">
                  <span className="text-[13px] font-medium text-foreground">
                    Auto-format SQL keywords
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically uppercase standard SQL keywords (SELECT, FROM, WHERE).
                  </p>
                </div>
                <Switch
                  checked={autoFormatSql}
                  onCheckedChange={(checked) => {
                    setAutoFormatSql(checked);
                    handleUpdate("auto-format", checked);
                  }}
                />
              </div>

              {/* Destructive guard */}
              <div className="flex items-center justify-between gap-3 pt-3">
                <div className="space-y-0.5">
                  <span className="text-[13px] font-medium text-foreground">
                    Destructive query confirmation
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Ask for confirmation before running DROP, TRUNCATE, or DELETE commands.
                  </p>
                </div>
                <Switch
                  checked={warnDestructive}
                  onCheckedChange={(checked) => {
                    setWarnDestructive(checked);
                    handleUpdate("warn-destructive", checked);
                  }}
                />
              </div>
            </div>
          </section>

          {/* Section 3: Schema & ER Diagram */}
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                <span>ER Diagram & Catalogs</span>
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Settings for schema introspection and relational graph canvas.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-2xs divide-y divide-border/60">
              <div className="flex items-center justify-between gap-3 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[13px] font-medium text-foreground">
                    Auto-fit diagram on load
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically center and scale the ER canvas viewport when opening a schema.
                  </p>
                </div>
                <Switch
                  checked={autoFitGraph}
                  onCheckedChange={(checked) => {
                    setAutoFitGraph(checked);
                    handleUpdate("autofit-graph", checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-3">
                <div className="space-y-0.5">
                  <span className="text-[13px] font-medium text-foreground">
                    Clear local schema cache
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Flushes saved catalog metadata, table arrangements, and query drafts.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear cache</span>
                </Button>
              </div>
            </div>
          </section>

          {/* Section 4: System Information */}
          <section className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-[13px] font-semibold text-foreground">
                    QueryForge AI Core
                  </span>
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                    v0.1.0 (Next.js 16 + FastAPI)
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => checkHealth()}
                className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Ping backend</span>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
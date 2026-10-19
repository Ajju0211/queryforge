"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { FolderKanban, Settings, ArrowLeft, Database, Table } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";

export function AppSidebar() {
  const pathname = usePathname();
  const { activeConnection } = useConnectionManager();

  const isInsideProject = pathname.startsWith("/project/");
  const isSettingActive = pathname.startsWith("/setting");

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col h-full z-30 select-none">
      {/* Brand Header */}
      <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0 bg-sidebar">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          aria-label="QueryForge Home"
        >
          <Logo size={32} glow={true} showBadge={true} />
        </Link>
      </div>

      {/* Main Navigation Options */}
      <div className="flex-1 py-3 px-2.5 space-y-2 overflow-y-auto">
        {/* If inside a selected project: change sidebar to show project context */}
        {isInsideProject ? (
          <>
            <Link
              href="/"
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors font-medium group mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>All Databases</span>
            </Link>

            {/* Active Project Card */}
            {activeConnection && (
              <div className="px-2.5 py-2 rounded-md bg-card border border-border flex items-center gap-2 mb-2.5 shadow-xs">
                <div className="p-1.5 rounded-md bg-muted text-foreground shrink-0">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {activeConnection.name}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">
                    {activeConnection.database}
                  </p>
                </div>
              </div>
            )}

            <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 font-mono">
              Database
            </div>

            <nav className="space-y-1">
              {/* Schema Table Info Option */}
              <Link
                href={activeConnection ? `/project/${activeConnection.id}` : "/"}
                className={cn(
                  "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-semibold transition-all duration-150 group",
                  "bg-muted text-foreground shadow-xs border border-border"
                )}
              >
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-foreground rounded-r-xs" />
                <Table className="w-4 h-4 shrink-0 text-foreground" />
                <span className="truncate">Schema</span>
              </Link>
            </nav>
          </>
        ) : (
          /* Default root sidebar */
          <>
            <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 font-mono">
              Menu
            </div>

            <nav className="space-y-1">
              {/* Project Option */}
              <Link
                href="/"
                className={cn(
                  "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150 group",
                  !isSettingActive
                    ? "bg-muted text-foreground font-semibold shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                )}
              >
                {!isSettingActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-foreground rounded-r-xs" />
                )}
                <FolderKanban
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    !isSettingActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">Project</span>
              </Link>

              {/* Other Option (Setting) in the same sidebar */}
              <Link
                href="/settings"
                className={cn(
                  "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150 group",
                  isSettingActive
                    ? "bg-muted text-foreground font-semibold shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                )}
              >
                {isSettingActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-foreground rounded-r-xs" />
                )}
                <Settings
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isSettingActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">Setting</span>
              </Link>
            </nav>
          </>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-2.5 border-t border-border bg-sidebar flex items-center justify-between">
        <div className="flex items-center gap-2 px-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono font-medium text-muted-foreground">
            QueryForge AI
          </span>
        </div>

        <ThemeToggle />
      </div>
    </aside>
  );
}

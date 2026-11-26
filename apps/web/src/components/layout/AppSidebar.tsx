"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import {
  FolderKanban,
  Settings,
  ArrowLeft,
  Database,
  Table,
  Terminal,
  Network,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { activeConnection } = useConnectionManager();

  useEffect(() => {
    onMobileClose?.();
    // Only close the drawer when the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isInsideProject = pathname.startsWith("/project/");
  const isSettingActive = pathname.startsWith("/setting");
  const isSqlEditorActive = pathname.includes("/editor");
  const isGraphActive = pathname.includes("/graph");
  const isSchemaActive = isInsideProject && !isSqlEditorActive && !isGraphActive;

  const navItemClass = (active: boolean) =>
    cn(
      "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-all duration-150",
      active
        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground ring-1 ring-sidebar-border shadow-2xs"
        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
    );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 select-none flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        )}
      >
        {/* Brand header — shares the 48px rail with every workspace */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 rounded-md hover:opacity-90"
            aria-label="QueryForge home"
          >
            <Logo size={28} glow={false} showBadge={true} />
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {isInsideProject ? (
            <>
              <Link
                href="/"
                className="group mb-2 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>All databases</span>
              </Link>

              {/* Active database card */}
              {activeConnection && (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-sidebar-border bg-card px-2.5 py-2 shadow-2xs">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-foreground">
                    <Database className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-foreground">
                      {activeConnection.name}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {activeConnection.database}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      activeConnection.status === "ACTIVE"
                        ? "bg-signal"
                        : activeConnection.status === "UNREACHABLE"
                        ? "bg-destructive"
                        : "bg-warning"
                    )}
                    title={`Status: ${activeConnection.status}`}
                  />
                </div>
              )}

              <p className="px-2.5 pb-1.5 text-[11px] font-medium text-muted-foreground">
                Workspace
              </p>

              <nav className="space-y-0.5">
                <Link
                  href={activeConnection ? `/project/${activeConnection.id}` : "/"}
                  className={navItemClass(isSchemaActive)}
                >
                  <Table className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="truncate">Schema</span>
                </Link>

                <Link
                  href={activeConnection ? `/project/${activeConnection.id}/graph` : "/"}
                  className={navItemClass(isGraphActive)}
                >
                  <Network className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="truncate">ER diagram</span>
                </Link>

                <Link
                  href={activeConnection ? `/project/${activeConnection.id}/editor` : "/"}
                  className={navItemClass(isSqlEditorActive)}
                >
                  <Terminal className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="truncate">SQL editor</span>
                </Link>
              </nav>
            </>
          ) : (
            <>
              <p className="px-2.5 pb-1.5 text-[11px] font-medium text-muted-foreground">
                Workspace
              </p>

              <nav className="space-y-0.5">
                <Link href="/" className={navItemClass(!isSettingActive)}>
                  <FolderKanban className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="truncate">Databases</span>
                </Link>

                <Link href="/settings" className={navItemClass(isSettingActive)}>
                  <Settings className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="truncate">Settings</span>
                </Link>
              </nav>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex h-12 shrink-0 items-center justify-between border-t border-sidebar-border px-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              QueryForge AI
            </span>
          </div>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}

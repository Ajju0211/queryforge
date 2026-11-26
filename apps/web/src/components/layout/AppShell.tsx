"use client";

import React, { useState, Suspense } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { ConnectionModal } from "@/components/connection/ConnectionModal";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background font-sans text-foreground">
      <Suspense
        fallback={
          <aside className="hidden h-full w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block" />
        }
      >
        <AppSidebar
          mobileOpen={isMobileNavOpen}
          onMobileClose={() => setIsMobileNavOpen(false)}
        />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile-only app bar. Desktop navigation is always visible. */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMobileNavOpen(true)}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Logo size={24} showBadge={false} glow={false} />
          </div>
          <ThemeToggle />
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>

      {/* Global Connection Creation / Editing Modal */}
      <ConnectionModal />
    </div>
  );
}

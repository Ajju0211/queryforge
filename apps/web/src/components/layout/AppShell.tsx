import React, { Suspense } from "react";
import { AppSidebar } from "./AppSidebar";
import { ConnectionModal } from "@/components/connection/ConnectionModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Primary Left Navigation Sidebar */}
      <Suspense fallback={<aside className="w-60 shrink-0 border-r border-border bg-sidebar" />}>
        <AppSidebar />
      </Suspense>

      {/* Main Content Area for Pages */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {children}
      </div>

      {/* Global Connection Creation / Editing Modal */}
      <ConnectionModal />
    </div>
  );
}

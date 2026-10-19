"use client";

import React from "react";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full w-full bg-background min-w-0 overflow-hidden">
      {/* Workspace Top Bar */}
      <header
        className="h-14 border-b border-border backdrop-blur-xl px-5 flex items-center justify-between shrink-0 z-10"
        style={{
          backgroundColor: "color-mix(in srgb, var(--background) 85%, transparent)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-foreground tracking-tight">
            Setting
          </span>
        </div>
      </header>

      {/* Empty Settings Body */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-lg max-w-sm w-full bg-card/40">
          <div className="p-3 rounded-md bg-card border border-border shadow-xs mb-3 flex items-center justify-center">
            <Settings className="w-6 h-6 text-muted-foreground/70" />
          </div>
          <h2 className="text-xs font-display font-semibold text-foreground">
            Setting
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
            Workspace settings and preferences will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}

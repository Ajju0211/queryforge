"use client";

import React, { useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { SchemaExplorer } from "@/components/connection/SchemaExplorer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, RefreshCw, Activity, Loader2 } from "lucide-react";

function WorkspaceContent() {
  const params = useParams();
  const connectionId = params?.id as string;

  const {
    activeConnection,
    selectConnection,
    isLoadingSchema,
    refreshSchema,
    isRefreshingSchema,
  } = useConnectionManager();

  useEffect(() => {
    if (connectionId && (!activeConnection || activeConnection.id !== connectionId)) {
      selectConnection(connectionId);
    }
  }, [connectionId, activeConnection, selectConnection]);

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden bg-background">
      {/* Top Workspace Bar */}
      <header
        className="h-14 border-b border-border backdrop-blur-xl px-5 flex items-center justify-between shrink-0 z-10"
        style={{
          backgroundColor: "color-mix(in srgb, var(--background) 85%, transparent)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7.5 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Databases</span>
            </Button>
          </Link>

          <span className="text-border">/</span>

          {activeConnection ? (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                size="md"
                className="flex items-center gap-1.5 py-1 px-2.5 font-mono text-muted-foreground bg-card shadow-xs"
              >
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground font-semibold">
                  {activeConnection.name}
                </span>
              </Badge>

              <Badge
                variant={activeConnection.status === "ACTIVE" ? "emerald" : "amber"}
                size="sm"
                className="font-mono text-[10px]"
              >
                {activeConnection.status}
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-mono">
              Loading Database...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeConnection && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshSchema()}
              disabled={isRefreshingSchema}
              className="text-xs h-7.5 gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-muted-foreground ${
                  isRefreshingSchema ? "animate-spin" : ""
                }`}
              />
              <span>Refresh Schema</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Workspace: Schema Explorer (Tables, Columns, Inspector) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isLoadingSchema && !activeConnection ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span>Connecting to database and introspecting tables...</span>
          </div>
        ) : (
          <SchemaExplorer />
        )}
      </main>
    </div>
  );
}

export default function DatabaseWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground gap-2 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span>Loading workspace...</span>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}

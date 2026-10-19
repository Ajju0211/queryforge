"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { DatabaseTable } from "@/components/project/DatabaseTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Plus, Database, RefreshCw, Loader2 } from "lucide-react";
import { LogoIcon } from "@/components/ui/Logo";
import { ConnectionEntity } from "@/domain/connection/models/connection.types";

export default function ProjectPage() {
  const router = useRouter();
  const {
    connections,
    isLoadingConnections,
    openModal,
    deleteConnection,
    errorMessage,
    refreshConnections,
    selectConnection,
  } = useConnectionManager();

  const handleSelectConnection = (conn: ConnectionEntity) => {
    selectConnection(conn.id);
    router.push(`/project/${conn.id}`);
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden bg-background">
      {/* Top Header */}
      <header
        className="h-14 border-b border-border backdrop-blur-xl px-5 flex items-center justify-between shrink-0 z-10"
        style={{
          backgroundColor: "color-mix(in srgb, var(--background) 85%, transparent)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-xs font-display font-semibold text-foreground tracking-tight">
            Project
          </h1>
          {connections.length > 0 && (
            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
              {connections.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {connections.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => refreshConnections()}
              className="text-muted-foreground hover:text-foreground h-7.5 w-7.5 rounded-md"
              aria-label="Refresh database connections"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoadingConnections ? "animate-spin text-muted-foreground" : ""
                }`}
              />
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={openModal}
            className="text-xs h-7.5 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Database</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Loading State */}
        {isLoadingConnections && connections.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span>Loading connected databases...</span>
          </div>
        )}

        {/* Empty State: Not a single database is connected -> Show Connect button */}
        {!isLoadingConnections && connections.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-lg max-w-sm w-full bg-card/40">
              <div className="p-3 rounded-md bg-card border border-border shadow-xs mb-3 flex items-center justify-center">
                <LogoIcon size={34} glow={false} />
              </div>
              <h2 className="text-xs font-display font-semibold text-foreground">
                No database connected
              </h2>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
                Connect a local PostgreSQL or cloud database to get started.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={openModal}
                className="mt-4 text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect Database</span>
              </Button>
            </div>
          </div>
        )}

        {/* Connected Databases Table ONLY */}
        {connections.length > 0 && (
          <DatabaseTable
            connections={connections}
            onSelectConnection={handleSelectConnection}
            onDeleteConnection={deleteConnection}
            errorMessage={errorMessage}
          />
        )}
      </main>
    </div>
  );
}

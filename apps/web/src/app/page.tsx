"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { DatabaseTable } from "@/components/project/DatabaseTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Plus,
  Database,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Lock,
  Layers,
  AlertTriangle,
  Search,
  CheckCircle2,
  Server,
  Cloud,
  Sliders,
  X,
} from "lucide-react";
import { LogoIcon } from "@/components/ui/Logo";
import { ConnectionEntity, ConnectionPresetType } from "@/domain/connection/models/connection.types";

export default function ProjectPage() {
  const router = useRouter();
  const {
    connections,
    isLoadingConnections,
    openModal,
    setSelectedPreset,
    deleteConnection,
    errorMessage,
    refreshConnections,
    selectConnection,
  } = useConnectionManager();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "issues">("all");

  const handleSelectConnection = (conn: ConnectionEntity) => {
    selectConnection(conn.id);
    router.push(`/project/${conn.id}`);
  };

  const handleQuickPreset = (preset: ConnectionPresetType) => {
    setSelectedPreset(preset);
    openModal();
  };

  // Metrics computation
  const totalCount = connections.length;
  const activeCount = useMemo(
    () => connections.filter((c) => c.status === "ACTIVE").length,
    [connections]
  );
  const issuesList = useMemo(
    () =>
      connections.filter(
        (c) => c.status === "UNREACHABLE" || c.status === "INTROSPECTION_FAILED"
      ),
    [connections]
  );
  const issuesCount = issuesList.length;
  const sslCount = useMemo(
    () => connections.filter((c) => c.ssl_mode && c.ssl_mode !== "disable").length,
    [connections]
  );

  // Filtered connections list
  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      // 1. Status Filter
      if (statusFilter === "active" && conn.status !== "ACTIVE") return false;
      if (
        statusFilter === "issues" &&
        conn.status !== "UNREACHABLE" &&
        conn.status !== "INTROSPECTION_FAILED"
      ) {
        return false;
      }

      // 2. Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        conn.name.toLowerCase().includes(q) ||
        conn.database.toLowerCase().includes(q) ||
        conn.host.toLowerCase().includes(q) ||
        conn.username.toLowerCase().includes(q)
      );
    });
  }, [connections, statusFilter, searchQuery]);

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
      {/* Workspace Rail — 48px standard header */}
      <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h1 className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
            Databases
          </h1>
          {totalCount > 0 && (
            <Badge variant="outline" size="sm" className="font-mono tabular-nums">
              {totalCount}
            </Badge>
          )}

          {/* Engine health pill */}
          <div className="ml-2 hidden items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-0.5 sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">Engine Ready</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {totalCount > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => refreshConnections()}
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Refresh database connections"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoadingConnections ? "animate-spin" : ""}`}
              />
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={openModal}
            className="h-8 gap-1.5 text-[13px] font-medium transition-transform active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Connect database</span>
          </Button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isLoadingConnections && totalCount === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-[13px] text-muted-foreground animate-fade-in">
            <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            <span className="font-mono">Connecting to database runtime…</span>
          </div>
        )}

        {!isLoadingConnections && totalCount === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center bg-background p-6 animate-scale-in">
            <div className="flex w-full max-w-xl flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-8 text-center shadow-xs">
              <div className="mb-4 flex items-center justify-center rounded-xl border border-border bg-card p-3 shadow-2xs">
                <LogoIcon size={36} glow={false} />
              </div>
              <h2 className="font-display text-base font-semibold text-foreground">
                No database connected
              </h2>
              <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                QueryForge introspects tables, visualizes foreign keys in ER diagrams, and executes
                queries. Choose a preset below or enter custom connection credentials.
              </p>

              {/* Starter Presets */}
              <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handleQuickPreset("local")}
                  className="flex flex-col items-start rounded-lg border border-border bg-card p-3.5 text-left transition-all hover:border-foreground/30 hover:bg-muted/30 hover:shadow-2xs cursor-pointer group"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Server className="h-4 w-4" />
                  </div>
                  <span className="text-[13px] font-semibold text-foreground">Local Postgres</span>
                  <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    localhost:5432
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPreset("cloud")}
                  className="flex flex-col items-start rounded-lg border border-border bg-card p-3.5 text-left transition-all hover:border-foreground/30 hover:bg-muted/30 hover:shadow-2xs cursor-pointer group"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Cloud className="h-4 w-4" />
                  </div>
                  <span className="text-[13px] font-semibold text-foreground">Cloud Database</span>
                  <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    TLS encrypted
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPreset("custom")}
                  className="flex flex-col items-start rounded-lg border border-border bg-card p-3.5 text-left transition-all hover:border-foreground/30 hover:bg-muted/30 hover:shadow-2xs cursor-pointer group"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <span className="text-[13px] font-semibold text-foreground">Custom Host</span>
                  <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    Custom certs / LAN
                  </span>
                </button>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={openModal}
                className="mt-6 h-8.5 gap-1.5 px-4 text-[13px] font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Custom connection</span>
              </Button>
            </div>
          </div>
        )}

        {totalCount > 0 && (
          <div className="flex flex-1 flex-col p-4 sm:p-6 space-y-5 animate-fade-in">
            {/* Attention Alert Banner — Rule: Attention lives on the data, action beside it */}
            {issuesCount > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[13px] text-foreground animate-slide-down">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong className="font-semibold">{issuesCount} database</strong>{" "}
                    {issuesCount === 1 ? "requires" : "require"} attention:{" "}
                    <span className="font-mono text-muted-foreground">
                      {issuesList.map((i) => i.name).join(", ")}
                    </span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => refreshConnections()}
                    className="h-7 text-xs gap-1 border-amber-500/30 hover:bg-amber-500/15"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry probe</span>
                  </Button>
                </div>
              </div>
            )}

            {/* KPI Cards Strip — Stephen Few / Tufte honest 4-card monitoring strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Tile 1: Total Connections */}
              <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 shadow-2xs transition-all hover:border-border/80">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[12px] font-medium">Databases</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-foreground">
                    <Database className="h-3 w-3" />
                  </div>
                </div>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                    {totalCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">configured</span>
                </div>
              </div>

              {/* Tile 2: Operational Health */}
              <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 shadow-2xs transition-all hover:border-border/80">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[12px] font-medium">Status</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-foreground">
                    <ShieldCheck className="h-3 w-3" />
                  </div>
                </div>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                    {activeCount}/{totalCount}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-signal font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                    operational
                  </span>
                </div>
              </div>

              {/* Tile 3: SSL Transport */}
              <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 shadow-2xs transition-all hover:border-border/80">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[12px] font-medium">Encryption</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-foreground">
                    <Lock className="h-3 w-3" />
                  </div>
                </div>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                    {sslCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {sslCount === 1 ? "instance TLS" : "instances TLS"}
                  </span>
                </div>
              </div>

              {/* Tile 4: Schema Ready */}
              <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 shadow-2xs transition-all hover:border-border/80">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[12px] font-medium">Catalogs</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-foreground">
                    <Layers className="h-3 w-3" />
                  </div>
                </div>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                    {activeCount > 0 ? "Synced" : "Idle"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">introspected</span>
                </div>
              </div>
            </div>

            {/* Main Table View Container with Filter Controls */}
            <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card shadow-2xs overflow-hidden">
              {/* Table Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 p-3 sm:px-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Filter by database, host, user…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 pr-7 text-[12px] bg-background border-border"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Status Filter Segmented Controls */}
                <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-0.5 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                      statusFilter === "all"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("active")}
                    className={`rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                      statusFilter === "active"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Active ({activeCount})
                  </button>
                  {issuesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter("issues")}
                      className={`rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                        statusFilter === "issues"
                          ? "bg-card text-destructive shadow-2xs"
                          : "text-amber-600 dark:text-amber-400 hover:opacity-80"
                      }`}
                    >
                      Issues ({issuesCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Table Component */}
              <DatabaseTable
                connections={filteredConnections}
                onSelectConnection={handleSelectConnection}
                onDeleteConnection={deleteConnection}
                errorMessage={errorMessage}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

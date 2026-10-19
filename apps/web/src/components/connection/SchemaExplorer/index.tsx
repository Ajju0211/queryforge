"use client";

import React from "react";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { useSchemaExplorer } from "@/domain/connection/hooks/useSchemaExplorer";
import { SchemaHeader } from "./SchemaHeader";
import { TableList } from "./TableList";
import { TableDetailView } from "./TableDetailView";
import { Loader2, Plus, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/card";
import { LogoIcon } from "@/components/ui/Logo";

export function SchemaExplorer() {
  const {
    activeConnection,
    refreshSchema,
    isRefreshingSchema,
    openModal,
    errorMessage,
  } = useConnectionManager();

  const {
    activeSchema,
    isLoadingSchema,
    searchQuery,
    setSearchQuery,
    selectedTableName,
    setSelectedTableName,
    selectedTable,
    filteredTables,
    stats,
    toggleExclusion,
  } = useSchemaExplorer();

  // 1. Empty state: No active connection selected
  if (!activeConnection) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
        <Card className="flex flex-col items-center justify-center p-8 max-w-md text-center bg-card border-border shadow-xl rounded-2xl">
          <div className="p-3.5 rounded-2xl bg-card border border-border shadow-md mb-4 flex items-center justify-center">
            <LogoIcon size={44} glow />
          </div>
          <h2 className="text-lg font-bold font-display text-foreground tracking-tight">
            No Database Selected
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
            Select an active database connection from the Databases panel, or connect a new PostgreSQL instance to inspect schema catalogs.
          </p>
          <div className="mt-5">
            <Button variant="primary" size="sm" onClick={openModal}>
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Database</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 2. Loading state: Introspecting schema
  if (isLoadingSchema && !activeSchema) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <h3 className="text-sm font-display font-semibold text-foreground">
          Introspecting database catalogs...
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Scanning tables, column types, primary keys, and foreign constraints for{" "}
          <span className="font-mono text-primary font-semibold">{activeConnection.name}</span>.
        </p>
      </div>
    );
  }

  // 3. Error state: Introspection failed or connection unreachable
  const isFailed =
    !activeSchema &&
    (activeConnection.status === "INTROSPECTION_FAILED" ||
      activeConnection.status === "UNREACHABLE" ||
      Boolean(errorMessage));

  if (isFailed) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
        <Card className="flex flex-col items-center justify-center p-8 max-w-md text-center bg-card border-border shadow-xl rounded-2xl">
          <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive mb-3 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold font-display text-foreground tracking-tight">
              Schema Introspection Failed
            </h2>
            <Badge variant="amber" size="sm">
              {activeConnection.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            QueryForge connected to PostgreSQL host{" "}
            <span className="font-mono text-foreground font-semibold">{activeConnection.host}:{activeConnection.port}</span>,
            but could not inspect catalog tables.
          </p>

          {errorMessage && (
            <div className="mt-3 p-3 rounded-md bg-destructive/5 border border-destructive/20 text-left w-full text-xs font-mono text-destructive/90 break-words leading-relaxed">
              {errorMessage}
            </div>
          )}

          <div className="mt-5 flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshSchema()}
              isLoading={isRefreshingSchema}
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Retry Introspection</span>
            </Button>
            <Button variant="primary" size="sm" onClick={openModal}>
              <Plus className="w-3.5 h-3.5" />
              <span>Edit Credentials</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background min-w-0">
      {/* Schema Header with diagnostics and stats */}
      <SchemaHeader
        connection={activeConnection}
        databaseName={activeSchema?.database_name}
        introspectedAt={activeSchema?.introspected_at}
        isRefreshing={isRefreshingSchema}
        onRefresh={refreshSchema}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        stats={stats}
      />

      {/* Main Layout: Tables Master-Detail Split */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Column: Tables List */}
        <div className="w-72 lg:w-80 border-r border-border bg-card/20 flex flex-col shrink-0">
          <div className="p-3 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between font-display">
            <span>Tables ({filteredTables.length})</span>
            {searchQuery && (
              <Badge variant="secondary" size="sm" className="text-[10px]">Filtered</Badge>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <TableList
              tables={filteredTables}
              selectedTableName={selectedTableName}
              onSelectTable={(tableName) => setSelectedTableName(tableName)}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {/* Right Column: Table Detail Inspector */}
        <div className="flex-1 bg-background flex flex-col min-w-0 overflow-hidden">
          <TableDetailView
            table={selectedTable}
            onToggleExclusion={toggleExclusion}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { useSchemaExplorer } from "@/domain/connection/hooks/useSchemaExplorer";
import { SchemaSidebar } from "./SchemaSidebar";
import { TableDetailView } from "./TableDetailView";
import { Loader2, Plus, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/card";
import { LogoIcon } from "@/components/ui/Logo";

export function SchemaExplorer() {
  const {
    openModal,
    errorMessage,
  } = useConnectionManager();

  const {
    activeConnection,
    connections,
    selectConnection,
    activeSchema,
    isLoadingSchema,
    isRefreshingSchema,
    tables,
    filteredTables,
    availableSchemas,
    selectedSchema,
    setSelectedSchema,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    selectedTableName,
    setSelectedTableName,
    selectedTable,
    activeView,
    setActiveView,
    isRowLevelSecurityEnabled,
    toggleRowLevelSecurity,
    toggleExclusion,
    updateTableName,
    updateTableSchema,
    addColumn,
    updateColumn,
    deleteColumn,
    addConstraint,
    deleteConstraint,
    resetTableSchema,
  } = useSchemaExplorer();

  const { refreshSchema } = useConnectionManager();

  // Sidebar toggle state (persisted across sessions with Cmd+B shortcut support)
  const [isTablesSidebarOpen, setIsTablesSidebarOpen] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("queryforge:schema-sidebar-open");
      if (saved !== null) return saved === "true";
      // On phones the table rail is an overlay, so start collapsed.
      return window.matchMedia("(min-width: 768px)").matches;
    }
    return true;
  });

  const toggleTablesSidebar = React.useCallback(() => {
    setIsTablesSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("queryforge:schema-sidebar-open", String(next));
        } catch {
          // Ignore localStorage access errors
        }
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleTablesSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleTablesSidebar]);

  // 1. Empty state: No active connection selected
  if (!activeConnection) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background p-6 text-center">
        <Card className="flex max-w-md flex-col items-center justify-center rounded-lg border-border p-8 text-center shadow-sm">
          <div className="mb-4 flex items-center justify-center rounded-md border border-border bg-card p-3">
            <LogoIcon size={40} glow={false} />
          </div>
          <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
            No database selected
          </h2>
          <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Select a connection from the Databases panel, or connect a new
            PostgreSQL instance to inspect its schema.
          </p>
          <div className="mt-5">
            <Button variant="primary" size="sm" onClick={openModal} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Connect database</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 2. Loading state: Introspecting schema
  if (isLoadingSchema && !activeSchema) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background p-6 text-center">
        <Loader2 className="mb-3 h-6 w-6 animate-spin text-muted-foreground" />
        <h3 className="font-display text-sm font-semibold text-foreground">
          Reading database catalog…
        </h3>
        <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
          Scanning tables, columns, keys, and foreign constraints for{" "}
          <span className="font-mono font-medium text-foreground">{activeConnection.name}</span>.
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
      <div className="flex h-full flex-col items-center justify-center bg-background p-6 text-center">
        <Card className="flex max-w-md flex-col items-center justify-center rounded-lg border-border p-8 text-center shadow-sm">
          <div className="mb-3 flex items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
              Schema introspection failed
            </h2>
            <Badge variant="amber" size="sm">
              {activeConnection.status}
            </Badge>
          </div>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            QueryForge reached{" "}
            <span className="font-mono font-medium text-foreground">
              {activeConnection.host}:{activeConnection.port}
            </span>{" "}
            but could not read its catalog tables.
          </p>

          {errorMessage && (
            <div className="mt-3 w-full rounded-md border border-destructive/20 bg-destructive/5 p-3 text-left font-mono text-[12px] leading-relaxed break-words text-destructive">
              {errorMessage}
            </div>
          )}

          <div className="mt-5 flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshSchema()}
              isLoading={isRefreshingSchema}
              className="h-8 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
            <Button variant="primary" size="sm" onClick={openModal} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Edit credentials</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden bg-background">
      {/* Mobile scrim for the tables rail */}
      {isTablesSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] md:hidden"
          onClick={toggleTablesSidebar}
          aria-hidden="true"
        />
      )}

      {/* QueryForge Tables Sidebar (Left Master Panel) */}
      <SchemaSidebar
        connection={activeConnection}
        connections={connections}
        onSelectConnection={(id) => selectConnection(id)}
        tables={tables}
        filteredTables={filteredTables}
        selectedTableName={selectedTableName}
        onSelectTable={(name) => {
          setSelectedTableName(name);
          // On phones the tables rail is an overlay; dismiss it after choosing.
          if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
            setIsTablesSidebarOpen(false);
          }
        }}
        availableSchemas={availableSchemas}
        selectedSchema={selectedSchema}
        onSelectSchema={(schema) => setSelectedSchema(schema)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterMode={filterMode}
        onFilterChange={setFilterMode}
        isRefreshing={isRefreshingSchema}
        onRefresh={refreshSchema}
        onToggleExclusion={toggleExclusion}
        onOpenDataView={() => setActiveView("data")}
        isOpen={isTablesSidebarOpen}
        onToggle={toggleTablesSidebar}
      />

      {/* Main Table Inspector (Right Detail Panel) */}
      <main className="flex-1 bg-background flex flex-col min-w-0 overflow-hidden">
        <TableDetailView
          key={`${activeConnection.id}_${selectedTable?.name || "none"}`}
          connectionId={activeConnection.id}
          table={selectedTable}
          allTables={tables}
          activeView={activeView}
          onViewChange={setActiveView}
          availableSchemas={availableSchemas}
          onSelectSchema={setSelectedSchema}
          isRLSEnabled={selectedTable ? isRowLevelSecurityEnabled(selectedTable.name) : false}
          onToggleRLS={toggleRowLevelSecurity}
          onToggleExclusion={toggleExclusion}
          onUpdateTableName={updateTableName}
          onUpdateTableSchema={updateTableSchema}
          onAddColumn={addColumn}
          onUpdateColumn={updateColumn}
          onDeleteColumn={deleteColumn}
          onAddConstraint={addConstraint}
          onDeleteConstraint={deleteConstraint}
          onResetTable={resetTableSchema}
          isSidebarOpen={isTablesSidebarOpen}
          onToggleSidebar={toggleTablesSidebar}
        />
      </main>
    </div>
  );
}

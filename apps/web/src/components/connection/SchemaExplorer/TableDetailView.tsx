"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TableMetadata, ColumnMetadata, ForeignKeyMetadata } from "@/domain/connection/models/connection.types";
import { SchemaViewMode } from "@/domain/connection/hooks/useSchemaExplorer";
import { SchemaTopBar } from "./SchemaTopBar";
import { TableDetail } from "./TableDetail";
import { SchemaSqlView } from "./SchemaSqlView";
import { DataTable } from "@/components/common/DataTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Table2, AlertCircle, RefreshCw, PanelLeftOpen } from "lucide-react";
import { defaultConnectionRepository } from "@/infrastructure/repositories/connection.http-repository";

interface TableDetailViewProps {
  connectionId?: string;
  table: TableMetadata | null;
  allTables: TableMetadata[];
  activeView: SchemaViewMode;
  onViewChange: (view: SchemaViewMode) => void;
  availableSchemas: string[];
  onSelectSchema?: (schema: string) => void;
  isRLSEnabled: boolean;
  onToggleRLS: (tableName: string) => void;
  onToggleExclusion: (tableName: string, isExcluded: boolean, schema?: string) => void | Promise<void>;
  isToggling?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;

  // Schema mutators
  onUpdateTableName?: (oldName: string, newName: string) => void;
  onUpdateTableSchema?: (tableName: string, newSchema: string) => void;
  onAddColumn?: (tableName: string, col: ColumnMetadata) => void;
  onUpdateColumn?: (tableName: string, colName: string, updates: Partial<ColumnMetadata>) => void;
  onDeleteColumn?: (tableName: string, colName: string) => void;
  onAddConstraint?: (tableName: string, fk: ForeignKeyMetadata) => void;
  onDeleteConstraint?: (tableName: string, fkColumn: string) => void;
  onResetTable?: (tableName: string) => void;
}

export function TableDetailView({
  connectionId,
  table,
  allTables,
  activeView,
  onViewChange,
  availableSchemas,
  onSelectSchema,
  isRLSEnabled,
  onToggleRLS,
  isSidebarOpen = true,
  onToggleSidebar,
  onUpdateTableName,
  onUpdateTableSchema,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onAddConstraint,
  onDeleteConstraint,
  onResetTable,
}: TableDetailViewProps) {
  // Data browsing state for "data" view
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<ColumnMetadata[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isLoadingRows, setIsLoadingRows] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch rows whenever table, activeView, pagination/sort or refreshTrigger changes
  useEffect(() => {
    let isCancelled = false;

    if (activeView === "data" && connectionId && table) {
      queueMicrotask(() => {
        if (!isCancelled) {
          setIsLoadingRows(true);
          setFetchError(null);
        }
      });

      defaultConnectionRepository
        .getTableRows({
          connectionId,
          tableName: table.name,
          schema: table.schema || "public",
          page,
          limit: pageSize,
          sort: sortColumn,
          order: sortOrder,
        })
        .then((response) => {
          if (!isCancelled) {
            setRows(response.rows || []);
            setColumns(response.columns || table.columns || []);
            setTotalCount(response.total_count ?? response.rows?.length ?? 0);
            setIsLoadingRows(false);
          }
        })
        .catch((err: unknown) => {
          if (!isCancelled) {
            const msg = err instanceof Error ? err.message : "Failed to load table rows.";
            setFetchError(msg);
            setIsLoadingRows(false);
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [activeView, connectionId, table, page, pageSize, sortColumn, sortOrder, refreshTrigger]);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  if (!table) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-background">
        {!isSidebarOpen && onToggleSidebar && (
          <div className="h-9 border-b border-border px-3 sm:px-5 flex items-center shrink-0 bg-background/90 select-none">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="h-7 px-2 flex items-center gap-1.5 rounded bg-card text-foreground border border-border hover:bg-muted text-xs font-mono shadow-2xs cursor-pointer"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-sans text-xs">Open Tables ({allTables.length})</span>
            </button>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <Table2 className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-display font-semibold text-foreground">No table selected</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
            Select a table from the sidebar to inspect its columns, constraints, and data records.
          </p>
          {!isSidebarOpen && onToggleSidebar && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSidebar}
              className="mt-4 gap-1.5 text-xs font-mono"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>Open Tables sidebar</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top action toolbar with view toggles & Copy create statements */}
      <SchemaTopBar
        connectionId={connectionId}
        activeView={activeView}
        onViewChange={onViewChange}
        selectedTable={table}
        allTables={allTables}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {activeView === "schema" && (
          <TableDetail
            key={table.name}
            table={table}
            allTables={allTables}
            availableSchemas={availableSchemas}
            onSelectSchema={onSelectSchema}
            isRLSEnabled={isRLSEnabled}
            onToggleRLS={onToggleRLS}
            onUpdateTableName={onUpdateTableName}
            onUpdateTableSchema={onUpdateTableSchema}
            onAddColumn={onAddColumn}
            onUpdateColumn={onUpdateColumn}
            onDeleteColumn={onDeleteColumn}
            onAddConstraint={onAddConstraint}
            onDeleteConstraint={onDeleteConstraint}
            onResetTable={onResetTable}
          />
        )}

        {activeView === "sql" && <SchemaSqlView table={table} />}

        {activeView === "data" && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {fetchError ? (
              <div className="p-6 flex flex-col items-center justify-center h-full">
                <Card className="flex flex-col items-center justify-center p-8 text-center bg-card border-border max-w-sm">
                  <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                  <h3 className="text-sm font-semibold text-foreground">Error loading table data</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">{fetchError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="mt-4 text-xs gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </Button>
                </Card>
              </div>
            ) : (
              <DataTable
                title={table.name}
                data={rows}
                columnMetadata={columns.length > 0 ? columns : table.columns}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                isLoading={isLoadingRows}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                onSortChange={(col, ord) => {
                  setSortColumn(col);
                  setSortOrder(ord);
                }}
                sortColumn={sortColumn}
                sortOrder={sortOrder}
                onRefresh={handleRefresh}
                emptyMessage={`No records found in table "${table.name}".`}
                className="h-full shadow-xs"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

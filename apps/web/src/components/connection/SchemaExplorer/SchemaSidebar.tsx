"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Table2,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Settings,
  Hammer,
  Database,
  ChevronDown,
  MoreHorizontal,
  Check,
  Copy,
  Table as TableIcon,
  EyeOff,
  Eye,
  Filter,
  Terminal,
  PanelLeftClose,
  X,
} from "lucide-react";
import { TableMetadata, ConnectionEntity } from "@/domain/connection/models/connection.types";
import { SchemaFilterMode } from "@/domain/connection/hooks/useSchemaExplorer";
import { generateTableDDL } from "@/domain/connection/utils/schema-ddl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface SchemaSidebarProps {
  connection: ConnectionEntity | null;
  connections: ConnectionEntity[];
  onSelectConnection: (id: string) => void;
  tables: TableMetadata[];
  filteredTables: TableMetadata[];
  selectedTableName: string | null;
  onSelectTable: (name: string) => void;
  availableSchemas: string[];
  selectedSchema: string;
  onSelectSchema: (schema: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterMode: SchemaFilterMode;
  onFilterChange: (mode: SchemaFilterMode) => void;
  isRefreshing: boolean;
  onRefresh: () => void | Promise<void>;
  onToggleExclusion: (tableName: string, isExcluded: boolean, schema?: string) => void | Promise<void>;
  onOpenDataView?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function SchemaSidebar({
  connection,
  connections,
  onSelectConnection,
  tables,
  filteredTables,
  selectedTableName,
  onSelectTable,
  availableSchemas,
  selectedSchema,
  onSelectSchema,
  searchQuery,
  onSearchChange,
  filterMode,
  onFilterChange,
  isRefreshing,
  onRefresh,
  onToggleExclusion,
  onOpenDataView,
  isOpen = true,
  onToggle,
}: SchemaSidebarProps) {
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const handleCopyTableName = (tableName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tableName);
    toast.success("Table name copied", { description: tableName });
  };

  const handleCopyCreateStatement = (table: TableMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    const ddl = generateTableDDL(table);
    navigator.clipboard.writeText(ddl);
    toast.success(`Copied CREATE statement for "${table.name}"`);
  };

  const dbDisplayName = connection?.database || "database";
  const projectName = connection?.name || "queryforge";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 select-none flex-col overflow-hidden border-r border-border bg-sidebar",
        "transition-[transform,width,opacity] duration-200 ease-out md:static md:z-auto",
        isOpen
          ? "translate-x-0 opacity-100 md:w-64"
          : "-translate-x-full opacity-0 md:pointer-events-none md:w-0 md:border-r-0"
      )}
      aria-hidden={!isOpen}
    >
      <div className="flex h-full w-64 shrink-0 flex-col">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <h2 className="font-display text-[13px] font-semibold tracking-tight text-foreground">
                  Tables
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {filteredTables.length}
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground">
                <span className="max-w-[92px] truncate">{projectName}</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="max-w-[84px] truncate">{dbDisplayName}</span>
              </p>
            </div>

            {onToggle && (
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={onToggle}
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                  aria-label="Close tables panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onToggle}
                      className="hidden h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
                      aria-label="Hide tables panel"
                    >
                      <PanelLeftClose className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Hide tables (⌘B)</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Database selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex h-8 w-full items-center justify-between rounded-md border border-border bg-card px-2 text-[12px] text-foreground transition-colors hover:bg-muted"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono">{dbDisplayName}</span>
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                Switch database
              </DropdownMenuLabel>
              {connections.map((conn) => {
                const isCurrent = conn.id === connection?.id;
                return (
                  <DropdownMenuItem
                    key={conn.id}
                    onClick={() => onSelectConnection(conn.id)}
                    className="flex cursor-pointer items-center justify-between"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Database className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{conn.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        ({conn.database})
                      </span>
                    </span>
                    {isCurrent && <Check className="h-3 w-3 shrink-0 text-foreground" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Schema selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-full items-center justify-between rounded-md border border-border bg-card px-2 text-[12px] text-foreground transition-colors hover:bg-muted"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                  <span className="text-[11px] text-muted-foreground">Schema</span>
                  <span className="truncate font-mono">{selectedSchema}</span>
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                Select schema
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onSelectSchema("all")}
                className="flex cursor-pointer items-center justify-between"
              >
                <span>All schemas ({tables.length})</span>
                {selectedSchema === "all" && (
                  <Check className="h-3 w-3 shrink-0 text-foreground" />
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {availableSchemas.map((schema) => {
                const isCurrent = selectedSchema === schema;
                const count = tables.filter((t) => t.schema === schema).length;
                return (
                  <DropdownMenuItem
                    key={schema}
                    onClick={() => onSelectSchema(schema)}
                    className="flex cursor-pointer items-center justify-between"
                  >
                    <span>
                      {schema} ({count})
                    </span>
                    {isCurrent && <Check className="h-3 w-3 shrink-0 text-foreground" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search + filter + refresh + add */}
          <div className="flex items-center gap-1">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search tables…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-8 w-full rounded-md border-border bg-card pr-2 pl-6 text-[12px] placeholder:text-muted-foreground"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={filterMode !== "all" ? "secondary" : "ghost"}
                  size="icon-sm"
                  className="h-8 w-8 shrink-0 rounded-md border border-border text-muted-foreground hover:text-foreground"
                  aria-label="Filter tables"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                  Filter tables
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onFilterChange("all")}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <span>All tables</span>
                  {filterMode === "all" && <Check className="h-3 w-3 text-foreground" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onFilterChange("with_pk")}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <span>Has primary key</span>
                  {filterMode === "with_pk" && <Check className="h-3 w-3 text-foreground" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onFilterChange("with_fk")}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <span>Has foreign keys</span>
                  {filterMode === "with_fk" && <Check className="h-3 w-3 text-foreground" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onFilterChange("excluded")}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <span>Excluded from AI</span>
                  {filterMode === "excluded" && <Check className="h-3 w-3 text-foreground" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRefresh()}
                  disabled={isRefreshing}
                  className="h-8 w-8 shrink-0 rounded-md border border-border text-muted-foreground hover:text-foreground"
                  aria-label="Refresh database schema"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-foreground")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Refresh schema</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsAddTableOpen(true)}
                  className="h-8 w-8 shrink-0 rounded-md border border-border text-muted-foreground hover:text-foreground"
                  aria-label="Add table"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Add table (read-only)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Table list */}
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {filteredTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 p-6 text-center">
                <Filter className="mb-1 h-4 w-4 text-muted-foreground/60" />
                <p className="text-[12px] font-medium text-foreground">No tables match</p>
                <p className="text-[11px] text-muted-foreground">
                  Clear the search or change the filter.
                </p>
              </div>
            ) : (
              <div className="space-y-px p-1.5">
                {filteredTables.map((table) => {
                  const isSelected = selectedTableName === table.name;

                  return (
                    <div
                      key={`${table.schema}.${table.name}`}
                      onClick={() => onSelectTable(table.name)}
                      className={cn(
                        "group flex h-8 cursor-pointer items-center justify-between rounded-md border px-2 font-mono text-[12px] transition-colors",
                        isSelected
                          ? "border-border bg-card font-medium text-foreground"
                          : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2 pr-1">
                        <Table2
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate" title={table.name}>
                          {table.name}
                        </span>
                        {table.is_excluded && (
                          <EyeOff className="h-3 w-3 shrink-0 text-warning" />
                        )}
                      </div>

                      <div className="flex shrink-0 items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "rounded p-0.5 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground",
                                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              )}
                              aria-label="Table options"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => handleCopyTableName(table.name, e)}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Copy name</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleCopyCreateStatement(table, e)}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Copy CREATE statement</span>
                            </DropdownMenuItem>
                            {onOpenDataView && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTable(table.name);
                                  onOpenDataView();
                                }}
                                className="flex cursor-pointer items-center gap-2"
                              >
                                <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>View data</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleExclusion(table.name, !table.is_excluded, table.schema);
                              }}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              {table.is_excluded ? (
                                <>
                                  <Eye className="h-3.5 w-3.5 text-signal" />
                                  <span>Include in AI</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-3.5 w-3.5 text-warning" />
                                  <span>Exclude from AI</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Bottom toolbar */}
        <div className="flex h-10 shrink-0 items-center justify-between border-t border-border bg-sidebar px-2">
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsToolsOpen(true)}
                  className="h-7 w-7 rounded text-muted-foreground hover:text-foreground"
                  aria-label="Connection settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Connection settings</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsToolsOpen(true)}
                  className="h-7 w-7 rounded text-muted-foreground hover:text-foreground"
                  aria-label="Database tools"
                >
                  <Hammer className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Database tools</TooltipContent>
            </Tooltip>

            {connection && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/project/${connection.id}/editor`}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 rounded text-muted-foreground hover:text-foreground"
                      aria-label="Open SQL editor"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top">Open SQL editor</TooltipContent>
              </Tooltip>
            )}
          </div>

          <span className="pr-1 font-mono text-[11px] text-muted-foreground">
            {filteredTables.length} tables
          </span>
        </div>

        {/* Read-only notice for Add Table */}
        <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-sm">
                Target database is read-only
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                QueryForge uses read-only sessions (
                <code className="font-mono text-foreground">
                  default_transaction_read_only = on
                </code>
                ). Create or drop tables through your database shell or migration
                tool.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddTableOpen(false)}
                className="h-8"
              >
                Understood
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tools Modal */}
        <Dialog open={isToolsOpen} onOpenChange={setIsToolsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-sm">
                Database information
              </DialogTitle>
              <DialogDescription className="mt-1.5 space-y-1 text-[13px] text-muted-foreground">
                <span className="block">
                  Host:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {connection?.host}:{connection?.port}
                  </span>
                </span>
                <span className="block">
                  Database:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {connection?.database}
                  </span>
                </span>
                <span className="block">
                  SSL mode:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {connection?.ssl_mode}
                  </span>
                </span>
                <span className="block">
                  Status:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {connection?.status}
                  </span>
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsToolsOpen(false)}
                className="h-8"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
}

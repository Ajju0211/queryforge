"use client";

import React from "react";
import Link from "next/link";
import { TableMetadata } from "@/domain/connection/models/connection.types";
import { SchemaViewMode } from "@/domain/connection/hooks/useSchemaExplorer";
import { generateTableDDL, generateFullSchemaDDL } from "@/domain/connection/utils/schema-ddl";
import {
  Table2,
  Columns3,
  Copy,
  ChevronDown,
  Check,
  Terminal,
  FileCode,
  PanelLeftClose,
  PanelLeftOpen,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface SchemaTopBarProps {
  connectionId?: string;
  activeView: SchemaViewMode;
  onViewChange: (view: SchemaViewMode) => void;
  selectedTable: TableMetadata | null;
  allTables: TableMetadata[];
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function SchemaTopBar({
  connectionId,
  activeView,
  onViewChange,
  selectedTable,
  allTables,
  isSidebarOpen = true,
  onToggleSidebar,
}: SchemaTopBarProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCurrentTable = () => {
    if (!selectedTable) return;
    const ddl = generateTableDDL(selectedTable);
    navigator.clipboard.writeText(ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(`Copied CREATE statement for "${selectedTable.name}"`);
  };

  const handleCopyAllTables = () => {
    if (!allTables.length) return;
    const fullDDL = generateFullSchemaDDL(allTables);
    navigator.clipboard.writeText(fullDDL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(`Copied CREATE statements for ${allTables.length} tables`);
  };

  const viewButton = (
    view: SchemaViewMode,
    label: string,
    Icon: React.ComponentType<{ className?: string }>
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onViewChange(view)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
            activeView === view
              ? "border-border bg-muted text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
          aria-label={label}
          aria-pressed={activeView === view}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="flex h-12 shrink-0 select-none items-center justify-between gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-sm sm:px-4">
      {/* Left: rail toggle + view switcher */}
      <div className="flex min-w-0 items-center gap-1">
        {onToggleSidebar && (
          <>
            <button
              type="button"
              onClick={onToggleSidebar}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md border px-2 text-[12px] transition-colors",
                !isSidebarOpen
                  ? "border-border bg-card text-foreground hover:bg-muted"
                  : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
              aria-label={isSidebarOpen ? "Hide tables panel" : "Show tables panel"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Tables</span>
              {allTables.length > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {allTables.length}
                </span>
              )}
            </button>

            <div className="mx-1 h-4 w-px bg-border" />
          </>
        )}

        {viewButton("schema", "Columns and constraints", Columns3)}
        {viewButton("data", "Browse table records", Table2)}
        {viewButton("sql", "SQL definition", FileCode)}

        {selectedTable && (
          <span className="ml-2 hidden truncate font-mono text-[12px] text-muted-foreground md:inline">
            {selectedTable.schema || "public"}.{selectedTable.name}
          </span>
        )}
      </div>

      {/* Right: navigation + copy */}
      <div className="flex shrink-0 items-center gap-1.5">
        {connectionId && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/project/${connectionId}/graph`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-[12px] font-medium"
                    aria-label="Open ER diagram"
                  >
                    <Network className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden xl:inline">ER diagram</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open ER diagram</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/project/${connectionId}/editor`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-[12px] font-medium"
                    aria-label="Open SQL editor"
                  >
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden xl:inline">SQL editor</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open SQL editor</TooltipContent>
            </Tooltip>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedTable}
              className="h-8 gap-1.5 px-2 text-[12px] font-medium"
              aria-label="Copy CREATE statements"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-signal" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="hidden xl:inline">Copy DDL</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              SQL DDL statements
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={handleCopyCurrentTable}
              className="flex cursor-pointer items-center gap-2"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">Copy for &quot;{selectedTable?.name}&quot;</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleCopyAllTables}
              className="flex cursor-pointer items-center gap-2"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Copy all ({allTables.length}) tables</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

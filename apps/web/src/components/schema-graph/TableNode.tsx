"use client";

import React, { memo, useState } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { TableNodeData } from "@/domain/schema-graph/types";
import {
  Table2,
  Key,
  Link2,
  Crosshair,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatRowCount(count: number = 0): string {
  const num = typeof count === "number" ? count : 0;
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`;
  }
  return num.toString();
}

function TableNodeComponent({ data }: NodeProps<Node<TableNodeData>>) {
  const {
    table,
    isFocused,
    isSelected,
    isCompact,
    hiddenRelations = [],
    onSelectTable,
    onFocusTable,
    onExpandRelation,
  } = data || {};

  const [menuOpen, setMenuOpen] = useState(false);

  const columns = table?.columns;

  // Group columns: PKs first, then FKs, then remaining columns
  const sortedColumns = React.useMemo(() => {
    if (!columns) return [];
    const pks = columns.filter((c) => c.is_primary_key);
    const fks = columns.filter((c) => !c.is_primary_key && c.is_foreign_key);
    const others = columns.filter((c) => !c.is_primary_key && !c.is_foreign_key);
    return [...pks, ...fks, ...others];
  }, [columns]);

  if (!table) return null;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectTable(table.name);
      }}
      className={cn(
        "group relative w-[310px] rounded-lg border text-card-foreground shadow-lg transition-all duration-200 select-none bg-card/95 backdrop-blur-md",
        isSelected
          ? "border-foreground/60 ring-2 ring-foreground/15"
          : isFocused
          ? "border-signal ring-2 ring-signal/25"
          : "border-border/80 hover:border-border hover:shadow-xl"
      )}
    >
      {/* Fallback default handles to ensure connections always resolve */}
      <Handle
        type="target"
        position={Position.Left}
        id={`${table.name}-target-fallback`}
        className="!w-2 !h-2 !bg-muted-foreground !border-2 !border-background !-left-1 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${table.name}-source-fallback`}
        className="!w-2 !h-2 !bg-muted-foreground !border-2 !border-background !-right-1 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* Card Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={cn(
              "p-1.5 rounded-md shrink-0 transition-colors",
              isFocused
                ? "bg-signal/10 text-signal"
                : isSelected
                ? "bg-foreground/10 text-foreground"
                : "bg-muted text-muted-foreground group-hover:text-foreground"
            )}
          >
            <Table2 className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3
                className="font-mono text-xs font-bold text-foreground truncate max-w-[150px]"
                title={table.name}
              >
                {table.name}
              </h3>
              {table.schema && (
                <span className="text-[10px] px-1 py-0.5 rounded font-mono bg-muted/80 text-muted-foreground border border-border/50 shrink-0">
                  {table.schema}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              {formatRowCount(table.estimated_row_count)} rows
            </p>
          </div>
        </div>

        {/* Quick Focus Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFocusTable(table.name);
          }}
          className={cn(
            "p-1.5 rounded transition-colors cursor-pointer",
            isFocused
              ? "bg-signal/15 text-signal"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Focus neighborhood of this table"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body: Compact vs Full Column List */}
      {isCompact ? (
        <div className="px-3.5 py-2 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span>{table.columns.length} columns</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
            {table.foreign_keys.length} FKs
          </span>
        </div>
      ) : (
        <div className="divide-y divide-border/40 py-1">
          {sortedColumns.map((col) => {
            const isPk = col.is_primary_key;
            const isFk = col.is_foreign_key;

            return (
              <div
                key={col.name}
                className={cn(
                  "relative flex items-center justify-between px-3.5 py-1.5 text-xs font-mono transition-colors hover:bg-muted/40",
                  isPk ? "bg-amber-500/[0.05]" : isFk ? "bg-sky-500/[0.05]" : ""
                )}
              >
                {/* Inbound target handle (e.g. for PK being referenced) */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${table.name}.${col.name}-target`}
                  className={cn(
                    "!w-2 !h-2 !-left-1 !border-2 !border-background transition-opacity",
                    isPk
                      ? "!bg-amber-500 opacity-90"
                      : "!bg-muted-foreground opacity-0 group-hover:opacity-70"
                  )}
                />

                <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                  {isPk ? (
                    <Key className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : isFk ? (
                    <Link2 className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-0.5" />
                  )}

                  <span
                    className={cn(
                      "truncate font-medium",
                      isPk
                        ? "text-amber-700 dark:text-amber-300 font-semibold"
                        : isFk
                        ? "text-sky-700 dark:text-sky-300 font-semibold"
                        : "text-foreground/90"
                    )}
                    title={col.name}
                  >
                    {col.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground truncate max-w-[85px]">
                    {col.data_type}
                  </span>

                  {isPk && (
                    <span className="text-[10px] px-1 py-0.2 rounded font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      PK
                    </span>
                  )}
                  {isFk && (
                    <span className="text-[10px] px-1 py-0.2 rounded font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                      FK
                    </span>
                  )}
                </div>

                {/* Outbound source handle (for FK referencing another table) */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${table.name}.${col.name}-source`}
                  className={cn(
                    "!w-2 !h-2 !-right-1 !border-2 !border-background transition-opacity",
                    isFk
                      ? "!bg-sky-500 opacity-90"
                      : "!bg-muted-foreground opacity-0 group-hover:opacity-70"
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Card Footer: Expand Hidden Relations Menu */}
      {hiddenRelations.length > 0 && (
        <div className="border-t border-border/60 p-1.5 bg-muted/20 rounded-b-lg">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Plus className="w-3 h-3" />
                  <span>+{hiddenRelations.length} more relations</span>
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="center"
              className="w-64 max-h-60 overflow-y-auto text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuLabel className="text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                <span>Connect related tables</span>
                <button
                  type="button"
                  onClick={() => {
                    hiddenRelations.forEach((r) => onExpandRelation(r.relatedTable));
                    setMenuOpen(false);
                  }}
                  className="text-foreground font-medium hover:underline text-[10px] cursor-pointer"
                >
                  Add all ({hiddenRelations.length})
                </button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {hiddenRelations.map((rel, idx) => (
                <DropdownMenuItem
                  key={`${rel.relatedTable}-${rel.column}-${idx}`}
                  onClick={() => {
                    onExpandRelation(rel.relatedTable);
                    setMenuOpen(false);
                  }}
                  className="flex items-center justify-between cursor-pointer py-1.5"
                >
                  <div className="min-w-0 flex items-center gap-1.5">
                    {rel.direction === "outbound" ? (
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    ) : (
                      <ArrowLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-mono font-medium truncate">
                      {rel.relatedTable}
                    </span>
                  </div>

                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px]">
                    via {rel.column}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);


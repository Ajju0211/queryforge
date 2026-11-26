"use client";

import React from "react";
import Link from "next/link";
import { TableMetadata } from "@/domain/connection/models/connection.types";
import {
  X,
  Table2,
  Key,
  Link2,
  Crosshair,
  Terminal,
  ArrowRight,
  ArrowLeft,
  Columns3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface TableDetailDrawerProps {
  table: TableMetadata | null;
  connectionId: string;
  allTables: TableMetadata[];
  onClose: () => void;
  onFocusTable: (tableName: string) => void;
  onSelectTable: (tableName: string) => void;
}

export function TableDetailDrawer({
  table,
  connectionId,
  allTables,
  onClose,
  onFocusTable,
  onSelectTable,
}: TableDetailDrawerProps) {
  // Find incoming foreign keys (other tables that point to this table)
  const incomingForeignKeys = React.useMemo(() => {
    if (!table) return [];
    const list: Array<{ sourceTable: string; column: string; targetColumn: string }> = [];
    allTables.forEach((t) => {
      (t.foreign_keys || []).forEach((fk) => {
        if (fk.target_table === table.name) {
          list.push({
            sourceTable: t.name,
            column: fk.column,
            targetColumn: fk.target_column,
          });
        }
      });
    });
    return list;
  }, [allTables, table]);

  if (!table) return null;

  return (
    <aside
      className="absolute top-12 bottom-4 left-4 right-4 z-40 flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-4 duration-200 sm:left-auto sm:w-96"
      aria-label="Table Inspector"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/60 flex items-start justify-between bg-muted/20">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
            <Table2 className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-mono text-sm font-bold text-foreground truncate">
                {table.name}
              </h2>
              {table.schema && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                  {table.schema}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {table.estimated_row_count.toLocaleString()} estimated rows
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Bar */}
      <div className="px-4 py-2.5 border-b border-border/40 bg-muted/10 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFocusTable(table.name)}
          className="flex-1 text-xs h-7 gap-1.5 font-medium border-border/70 hover:bg-muted cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Focus in Graph</span>
        </Button>

        <Link
          href={`/project/${connectionId}/editor`}
          className="flex-1"
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7 gap-1.5 font-medium border-border/70 text-foreground hover:bg-muted cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Query Table</span>
          </Button>
        </Link>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40">
        {/* Columns Section */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <Columns3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Columns ({table.columns.length})</span>
            </span>
          </div>

          <div className="divide-y divide-border/30 rounded-lg border border-border/50 bg-background/50 overflow-hidden">
            {table.columns.map((col) => (
              <div
                key={col.name}
                className="px-3 py-2 flex items-center justify-between text-xs font-mono hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                  {col.is_primary_key ? (
                    <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : col.is_foreign_key ? (
                    <Link2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                  )}

                  <span
                    className={cn(
                      "truncate font-medium",
                      col.is_primary_key
                        ? "text-amber-700 dark:text-amber-300 font-semibold"
                        : col.is_foreign_key
                        ? "text-sky-700 dark:text-sky-300 font-semibold"
                        : "text-foreground"
                    )}
                  >
                    {col.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-muted-foreground">
                    {col.data_type}
                  </span>
                  {!col.nullable && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground">
                      NN
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outgoing Foreign Keys */}
        {table.foreign_keys.length > 0 && (
          <div className="p-4 space-y-2">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Outgoing foreign keys ({table.foreign_keys.length})</span>
            </div>

            <div className="space-y-1.5">
              {table.foreign_keys.map((fk, idx) => (
                <div
                  key={`${fk.column}-${fk.target_table}-${idx}`}
                  onClick={() => onSelectTable(fk.target_table)}
                  className="p-2.5 rounded-lg border border-border/50 bg-background/50 hover:border-border hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-sky-700 dark:text-sky-300 font-semibold">
                      {fk.column}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      references
                    </span>
                  </div>
                  <div className="text-xs font-mono text-foreground font-medium flex items-center gap-1 mt-1 group-hover:text-foreground">
                    <span>{fk.target_table}</span>
                    <span className="text-muted-foreground font-normal">
                      ({fk.target_column})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Foreign Keys */}
        {incomingForeignKeys.length > 0 && (
          <div className="p-4 space-y-2">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Referenced by ({incomingForeignKeys.length})</span>
            </div>

            <div className="space-y-1.5">
              {incomingForeignKeys.map((fk, idx) => (
                <div
                  key={`${fk.sourceTable}-${fk.column}-${idx}`}
                  onClick={() => onSelectTable(fk.sourceTable)}
                  className="p-2.5 rounded-lg border border-border/50 bg-background/50 hover:border-border hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-sky-700 dark:text-sky-300 font-semibold group-hover:text-foreground">
                      {fk.sourceTable}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      via {fk.column}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    → points to {table.name} ({fk.targetColumn})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

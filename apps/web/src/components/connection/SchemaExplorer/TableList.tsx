"use client";

import React from "react";
import { TableMetadata } from "@/domain/connection/models/connection.types";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table2, EyeOff, SearchX, Hash } from "lucide-react";

interface TableListProps {
  tables: TableMetadata[];
  selectedTableName: string | null;
  onSelectTable: (tableName: string) => void;
  searchQuery?: string;
}

export function TableList({
  tables,
  selectedTableName,
  onSelectTable,
  searchQuery = "",
}: TableListProps) {
  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full text-muted-foreground">
        <SearchX className="w-8 h-8 text-muted-foreground/60 mb-2" />
        <p className="text-xs font-semibold text-foreground/80">No tables found</p>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[180px]">
          {searchQuery
            ? `No tables or columns match "${searchQuery}"`
            : "No tables discovered in this database schema"}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col divide-y divide-border">
        {tables.map((table) => {
          const isSelected = selectedTableName === table.name;
          const displayName =
            table.schema && table.schema !== "public"
              ? `${table.schema}.${table.name}`
              : table.name;

          return (
            <button
              key={`${table.schema}.${table.name}`}
              type="button"
              onClick={() => onSelectTable(table.name)}
              className={`w-full text-left p-3 transition-colors flex items-center justify-between gap-3 group relative cursor-pointer ${
                isSelected
                  ? "bg-muted text-foreground border-l-2 border-foreground font-medium"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-1.5 rounded-md transition-colors ${
                    isSelected
                      ? "bg-card text-foreground border border-border"
                      : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5 shrink-0" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate tracking-tight text-foreground">
                      {displayName}
                    </span>
                    {table.is_excluded && (
                      <Badge variant="amber" size="sm" className="text-[9px] px-1.5 py-0">
                        <EyeOff className="w-2.5 h-2.5 mr-0.5" />
                        Hidden
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground font-mono">
                    <span>{table.columns.length} cols</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />
                      {table.estimated_row_count.toLocaleString()} rows
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-muted-foreground/80 group-hover:text-foreground shrink-0">
                {table.schema}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

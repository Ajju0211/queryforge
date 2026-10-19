"use client";

import React from "react";
import { TableMetadata } from "@/domain/connection/models/connection.types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Key,
  Link2,
  Table2,
  Eye,
  EyeOff,
  Hash,
  ShieldAlert,
  Info,
} from "lucide-react";

import { toast } from "@/components/ui/sonner";

interface TableDetailViewProps {
  table: TableMetadata | null;
  onToggleExclusion: (tableName: string, isExcluded: boolean, schema?: string) => void | Promise<void>;
  isToggling?: boolean;
}

export function TableDetailView({
  table,
  onToggleExclusion,
  isToggling = false,
}: TableDetailViewProps) {
  // Map foreign keys by column name for quick O(1) lookup
  const fkByColumn = React.useMemo(() => {
    const map = new Map<string, { target_table: string; target_column: string }>();
    if (table?.foreign_keys) {
      for (const fk of table.foreign_keys) {
        map.set(fk.column, {
          target_table: fk.target_table,
          target_column: fk.target_column,
        });
      }
    }
    return map;
  }, [table]);

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full text-muted-foreground">
        <Table2 className="w-10 h-10 text-muted-foreground/60 mb-3" />
        <h3 className="text-sm font-display font-semibold text-foreground">No table selected</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
          Select a table from the schema list to view its columns, keys, and foreign relationships.
        </p>
      </div>
    );
  }

  const handleExclusionToggle = async () => {
    const nextState = !table.is_excluded;
    try {
      await onToggleExclusion(table.name, nextState, table.schema);
      if (nextState) {
        toast.info(`Excluded "${table.name}" from AI`, {
          description: "Table schema will not be included in AI SQL generation prompts.",
        });
      } else {
        toast.success(`Included "${table.name}" in AI`, {
          description: "Table is enabled for AI query generation and catalog search.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update table exclusion.";
      toast.error("Update Failed", { description: msg });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Table Header Section */}
      <div className="p-6 border-b border-border bg-card/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-md bg-muted text-foreground border border-border">
                <Table2 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-display font-bold text-foreground tracking-tight">
                {table.name}
              </h2>
              <Badge variant="neutral" size="sm">
                schema: {table.schema}
              </Badge>
              {table.is_excluded && (
                <Badge variant="amber" size="sm">
                  <EyeOff className="w-3 h-3 mr-0.5" />
                  <span>Excluded from AI</span>
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1 font-mono">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                {table.estimated_row_count.toLocaleString()} estimated rows
              </span>
              <span>•</span>
              <span className="font-mono">{table.columns.length} columns</span>
              <span>•</span>
              <span className="font-mono">
                {table.foreign_keys?.length || 0} foreign relationships
              </span>
            </div>
          </div>

          {/* AI Inclusion / Exclusion Control */}
          <div>
            <Button
              variant={table.is_excluded ? "outline" : "secondary"}
              size="sm"
              onClick={handleExclusionToggle}
              isLoading={isToggling}
              className={`text-xs ${table.is_excluded
                  ? "border-amber-500/40 text-amber-300 hover:bg-amber-950/30"
                  : ""
                }`}
            >
              {table.is_excluded ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Include in AI Context</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Exclude from AI Context</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Informational banner when excluded using shadcn Alert */}
        {table.is_excluded && (
          <Alert className="mt-4 border-amber-500/30 bg-amber-950/20 text-amber-300 rounded-md">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <AlertTitle className="font-semibold text-amber-200 text-xs">Table Hidden from AI Prompts</AlertTitle>
            <AlertDescription className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
              This table and its column definitions are excluded from schema embeddings, AI query generation, and chat reasoning prompts.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Foreign Key Relationships (if any) */}
      {table.foreign_keys && table.foreign_keys.length > 0 && (
        <div className="px-6 py-3 border-b border-border bg-muted/20">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 font-display">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Foreign Key References</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {table.foreign_keys.map((fk, idx) => (
              <Badge
                key={idx}
                variant="outline"
                size="sm"
                className="font-mono text-xs gap-1.5 bg-card py-1 px-2.5 rounded-md border-border"
              >
                <span className="text-foreground font-medium">{fk.column}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-foreground font-semibold">{fk.target_table}</span>
                <span className="text-muted-foreground">({fk.target_column})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Columns Table with shadcn Table & Card */}
      <div className="p-6">
        <Card className="rounded-lg border border-border overflow-hidden bg-card shadow-xs p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="bg-muted/40 border-b border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                    Column
                  </TableHead>
                  <TableHead className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                    Constraints
                  </TableHead>
                  <TableHead className="py-2.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                    References
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-mono">
                {table.columns.map((col) => {
                  const fk = fkByColumn.get(col.name);

                  return (
                    <TableRow
                      key={col.name}
                      className="hover:bg-muted/30 transition-colors border-b border-border/60"
                    >
                      {/* Column Name with PK indicator */}
                      <TableCell className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          {col.is_primary_key ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="p-1 rounded-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-default">
                                  <Key className="w-3 h-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">Primary Key</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="w-5" />
                          )}
                          <span
                            className={`font-semibold ${col.is_primary_key
                                ? "text-amber-300"
                                : "text-foreground"
                              }`}
                          >
                            {col.name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Data Type */}
                      <TableCell className="py-2.5 px-4">
                        <Badge variant="outline" size="sm" className="font-mono text-[10px] text-muted-foreground border-border">
                          {col.data_type}
                        </Badge>
                      </TableCell>

                      {/* Nullable / Constraint Badges */}
                      <TableCell className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 font-sans">
                          {col.is_primary_key && (
                            <Badge variant="amber" size="sm">
                              PRIMARY KEY
                            </Badge>
                          )}
                          {col.nullable ? (
                            <Badge variant="neutral" size="sm">
                              NULLABLE
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm" className="font-mono text-[9px]">
                              NOT NULL
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Foreign Key Reference */}
                      <TableCell className="py-2.5 px-4">
                        {fk ? (
                          <div className="flex items-center gap-1 text-[11px] text-foreground/90">
                            <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span>
                              {fk.target_table}
                              <span className="text-muted-foreground">
                                ({fk.target_column})
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-sans text-[11px]">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Footer info */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Schema definitions are introspected directly from PostgreSQL information catalogs (information_schema & pg_catalog).
          </span>
        </div>
      </div>
    </div>
  );
}

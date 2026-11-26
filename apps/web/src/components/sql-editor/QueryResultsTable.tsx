"use client";

import React, { useState, useMemo } from "react";
import { QueryExecutionResult } from "@/domain/sql-editor/types";
import {
  Check,
  Search,
  AlertCircle,
  CheckCircle2,
  Table as TableIcon,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface QueryResultsTableProps {
  result: QueryExecutionResult | null;
  isExecuting?: boolean;
}

export function QueryResultsTable({ result, isExecuting }: QueryResultsTableProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const columns = useMemo(() => result?.columns || [], [result?.columns]);
  const rawRows = useMemo(() => result?.rows || [], [result?.rows]);

  // Filter rows locally if search query is provided
  const filteredRows = useMemo(() => {
    if (!filterQuery.trim()) return rawRows;
    const lower = filterQuery.toLowerCase();
    return rawRows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(lower)
      )
    );
  }, [rawRows, filterQuery]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const handleExportJson = () => {
    if (!rawRows.length) return;
    const blob = new Blob([JSON.stringify(rawRows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedAction("json");
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleExportCsv = () => {
    if (!rawRows.length || !columns.length) return;
    const header = columns.join(",");
    const rows = rawRows.map((r) =>
      columns
        .map((col) => {
          const val = r[col];
          if (val === null || val === undefined) return "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedAction("csv");
    setTimeout(() => setCopiedAction(null), 2000);
  };

  if (isExecuting) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-8">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Executing query on database...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5 p-8 select-none">
        <TableIcon className="w-8 h-8 stroke-[1.2]" />
        <p className="text-xs font-mono">No query executed yet</p>
        <p className="text-[11px] text-muted-foreground/40">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border">⌘ + Enter</kbd> to execute
        </p>
      </div>
    );
  }

  // Error State
  if (!result.success || result.error) {
    return (
      <div className="h-full p-4 overflow-auto font-mono text-xs">
        <div className="rounded border border-destructive/30 bg-destructive/10 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Execution Error</span>
            <span className="ml-auto text-[11px] text-muted-foreground font-normal">
              {result.executionTimeMs}ms
            </span>
          </div>
          <pre className="text-xs text-destructive/90 whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {result.error}
          </pre>
        </div>
      </div>
    );
  }

  // Command executed with 0 rows (DDL / DML statements)
  if (columns.length === 0 || rawRows.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-foreground font-mono">
          {result.command || "Query executed successfully"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Execution time: {result.executionTimeMs}ms • 0 rows returned
        </p>
      </div>
    );
  }

  // Results Grid with Data
  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-background select-none">
      {/* Top Results Toolbar */}
      <div className="h-8 shrink-0 border-b border-border px-3 flex items-center justify-between bg-card/40 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
            {rawRows.length} {rawRows.length === 1 ? "row" : "rows"}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/50">•</span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {result.executionTimeMs}ms
          </span>
          {result.command && (
            <>
              <span className="text-[11px] font-mono text-muted-foreground/50">•</span>
              <span className="text-[11px] font-mono text-muted-foreground/80">
                {result.command}
              </span>
            </>
          )}
        </div>

        {/* Filter and Export buttons */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="text"
              placeholder="Filter results..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="h-6 w-36 pl-6 pr-2 text-[11px] rounded bg-background/80 border-border/80 font-mono"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground font-mono rounded"
            title="Export as CSV"
          >
            {copiedAction === "csv" ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <FileSpreadsheet className="w-3 h-3" />
            )}
            <span>CSV</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportJson}
            className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground font-mono rounded"
            title="Export as JSON"
          >
            {copiedAction === "json" ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <FileJson className="w-3 h-3" />
            )}
            <span>JSON</span>
          </Button>
        </div>
      </div>

      {/* Main Table Scroll Container */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse font-mono text-xs">
          <thead className="sticky top-0 bg-card z-10 border-b border-border">
            <tr>
              <th className="w-10 px-2 py-1.5 text-center text-[10px] text-muted-foreground/50 border-r border-border/60 bg-muted/20">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-1.5 text-left text-[11px] font-semibold text-foreground border-r border-border/60 whitespace-nowrap bg-muted/10"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filteredRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                <td className="w-10 px-2 py-1 text-center text-[10px] text-muted-foreground/40 border-r border-border/40 select-none">
                  {idx + 1}
                </td>
                {columns.map((col) => {
                  const val = row[col];
                  const isNull = val === null || val === undefined;
                  const cellId = `${idx}-${col}`;
                  const isCopied = copiedCell === cellId;
                  const displayStr = isNull ? "NULL" : String(val);

                  return (
                    <td
                      key={col}
                      onClick={() => !isNull && copyToClipboard(displayStr, cellId)}
                      title={isNull ? "NULL value" : "Click to copy value"}
                      className={`px-3 py-1 border-r border-border/40 whitespace-nowrap max-w-[300px] truncate cursor-pointer group ${
                        isNull ? "text-muted-foreground/40 italic" : "text-foreground"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="truncate">{displayStr}</span>
                        {isCopied && (
                          <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

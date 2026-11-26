"use client";

import React from "react";
import { QueryHistoryItem } from "@/domain/sql-editor/types";
import { History, Play, Trash2, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface QueryHistoryProps {
  history: QueryHistoryItem[];
  onSelectQuery: (query: string) => void;
  onRunQuery?: (query: string) => void;
  onClearHistory: () => void;
}

export function QueryHistory({
  history,
  onSelectQuery,
  onRunQuery,
  onClearHistory,
}: QueryHistoryProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground/60 select-none">
        <History className="w-8 h-8 stroke-[1.2] mb-1.5" />
        <p className="text-xs font-mono">No query history yet</p>
        <p className="text-[11px] text-muted-foreground/40">
          Queries you execute will be logged here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-background select-none">
      <div className="h-8 shrink-0 border-b border-border px-3 flex items-center justify-between bg-card/40">
        <span className="text-[11px] font-mono font-medium text-muted-foreground">
          History ({history.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearHistory}
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-rose-400 gap-1 rounded font-mono"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </Button>
      </div>

      <div className="flex-1 overflow-auto divide-y divide-border/40 min-h-0">
        {history.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelectQuery(item.query)}
              className="p-2.5 hover:bg-muted/30 cursor-pointer transition-colors group flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  {item.success ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{item.command || `${item.rowCount} rows`}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-destructive font-medium">
                      <AlertCircle className="w-3 h-3" />
                      <span>Failed</span>
                    </span>
                  )}
                  <span>•</span>
                  <span>{item.executionTimeMs}ms</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => handleCopy(e, item.query, item.id)}
                    className="h-5 w-5 text-muted-foreground hover:text-foreground rounded"
                    title="Copy SQL"
                  >
                    {isCopied ? (
                      <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </Button>
                  {onRunQuery && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRunQuery(item.query);
                      }}
                      className="h-5 w-5 text-emerald-600 dark:text-emerald-400 hover:opacity-80 rounded"
                      title="Run immediately"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                    </Button>
                  )}
                </div>
              </div>

              <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap line-clamp-2 bg-card/60 p-1.5 rounded border border-border/50">
                {item.query}
              </pre>

              {item.error && (
                <p className="text-[11px] font-mono text-destructive/90 line-clamp-1">
                  {item.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

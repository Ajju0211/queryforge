"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { CodeMirrorSqlEditor } from "./CodeMirrorSqlEditor";
import { useConnectionManager } from "@/domain/connection/hooks/useConnectionManager";
import { useSqlEditor } from "@/domain/sql-editor/hooks/useSqlEditor";
import { QueryResultsTable } from "./QueryResultsTable";
import { QueryHistory } from "./QueryHistory";
import {
  Play,
  Plus,
  X,
  Trash2,
  Database,
  Terminal,
  Table as TableIcon,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TableMetadata, ColumnMetadata } from "@/domain/connection/models/connection.types";

interface SchemaTableItem {
  name: string;
  schema?: string;
  columns?: { name: string; dataType: string }[];
}

export function SqlEditorWorkspace() {
  const { activeConnection, activeSchema } = useConnectionManager();
  const [activeBottomTab, setActiveBottomTab] = useState<"results" | "history" | "schema">("results");
  const [splitHeightPercent, setSplitHeightPercent] = useState<number>(55); // Top editor height in %
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const newPercent = Math.min(85, Math.max(20, (offsetY / rect.height) * 100));
      setSplitHeightPercent(Math.round(newPercent));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    updateActiveQuery,
    isExecuting,
    lastResult,
    history,
    executeQuery,
    clearQuery,
    clearHistory,
  } = useSqlEditor({
    connectionId: activeConnection?.id,
  });

  // Prepare table and column schema info for SQL autocompletion
  const schemaTables: SchemaTableItem[] = useMemo(() => {
    if (!activeSchema?.tables) return [];
    return activeSchema?.tables?.map((t: TableMetadata) => ({
      name: t.name,
      schema: t.schema,
      columns: t.columns.map((c: ColumnMetadata) => ({
        name: c.name,
        dataType: c.data_type,
      })),
    }));
  }, [activeSchema]);

  const handleFormatSql = () => {
    if (!activeTab?.query) return;
    // Basic smart SQL formatting (keywords uppercase, standard indent)
    const formatted = activeTab.query
      .replace(/\b(select|from|where|left join|right join|inner join|join|group by|order by|having|limit|offset|insert into|values|update|set|delete from|create table|alter table|drop table)\b/gi, (match) => match.toUpperCase());
    updateActiveQuery(formatted);
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden bg-background">
      {/* 1. Main Action & Tabs Bar */}
      <div className="flex h-12 shrink-0 select-none items-center justify-between gap-2 border-b border-border bg-card/60 px-3">
        {/* Tab Switcher */}
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${isActive
                  ? "border-border bg-muted font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
              >
                <Terminal className="h-3 w-3 shrink-0 text-signal" />
                <span className="max-w-[120px] truncate">{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="rounded p-0.5 text-muted-foreground/70 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    title="Close tab"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => addTab()}
            className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
            title="New query tab"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-1.5">
          {activeConnection && (
            <div className="hidden items-center gap-1.5 rounded-md border border-border/80 bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground md:flex">
              <Database className="h-3 w-3 text-signal" />
              <span className="max-w-[120px] truncate">{activeConnection.database}</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormatSql}
            className="h-8 gap-1 rounded-md px-2 font-mono text-xs text-muted-foreground hover:text-foreground"
            title="Format SQL keywords"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Format</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearQuery}
            className="h-8 gap-1 rounded-md px-2 font-mono text-xs text-muted-foreground hover:text-destructive"
            title="Clear editor"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>

          {/* RUN BUTTON */}
          <Button
            variant="primary"
            size="sm"
            disabled={isExecuting || !activeTab?.query?.trim()}
            onClick={() => executeQuery()}
            className="h-8 gap-1.5 rounded-md bg-signal px-3 font-mono text-xs font-semibold text-signal-foreground shadow-xs hover:bg-signal/90"
            title="Execute query (⌘ + Enter)"
          >
            {isExecuting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3 fill-current" />
            )}
            <span>Run</span>
            <span className="hidden font-normal opacity-75 md:inline">
              (⌘↵)
            </span>
          </Button>
        </div>
      </div>

      {/* 2. Resizable Vertical Split Container */}
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Top Pane: CodeMirror SQL Editor */}
        <div
          style={{ height: `${splitHeightPercent}%` }}
          className="w-full min-h-[120px] overflow-hidden"
        >
          <CodeMirrorSqlEditor
            value={activeTab?.query || ""}
            onChange={updateActiveQuery}
            onExecute={() => executeQuery()}
            tables={schemaTables}
          />
        </div>

        {/* Split Divider Bar with Interactive Mouse Dragging */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          className={`h-2.5 border-y border-border flex items-center justify-center shrink-0 cursor-row-resize transition-colors select-none ${
            isDragging ? "bg-primary/20" : "bg-card hover:bg-muted"
          }`}
          title="Drag to resize editor vs results (or use ratio buttons on the right)"
        >
          <div className="w-8 h-1 rounded-full bg-muted-foreground/40" />
        </div>

        {/* Bottom Pane: Results / History / Schema Reference */}
        <div
          style={{ height: `${100 - splitHeightPercent}%` }}
          className="flex-1 flex flex-col min-h-[150px] overflow-hidden bg-background"
        >
          {/* Bottom Tabs Bar */}
          <div className="flex h-9 shrink-0 select-none items-center justify-between gap-2 border-b border-border bg-card/40 px-3">
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveBottomTab("results")}
                className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[11px] font-medium transition-colors ${activeBottomTab === "results"
                  ? "border-border bg-muted font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
              >
                Results {lastResult ? `(${lastResult.rowCount})` : ""}
              </button>

              <button
                onClick={() => setActiveBottomTab("history")}
                className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[11px] font-medium transition-colors ${activeBottomTab === "history"
                  ? "border-border bg-muted font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
              >
                History ({history.length})
              </button>

              <button
                onClick={() => setActiveBottomTab("schema")}
                className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[11px] font-medium transition-colors ${activeBottomTab === "schema"
                  ? "border-border bg-muted font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
              >
                Schema ({schemaTables.length})
              </button>
            </div>

            {/* Split Height Controls */}
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
              <button
                onClick={() => setSplitHeightPercent(35)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${splitHeightPercent === 35
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
                title="Larger results pane"
              >
                1:2
              </button>
              <button
                onClick={() => setSplitHeightPercent(55)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${splitHeightPercent === 55
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
                title="Balanced view"
              >
                1:1
              </button>
              <button
                onClick={() => setSplitHeightPercent(75)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${splitHeightPercent === 75
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
                title="Larger editor pane"
              >
                2:1
              </button>
            </div>
          </div>

          {/* Bottom Content Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeBottomTab === "results" && (
              <QueryResultsTable result={lastResult} isExecuting={isExecuting} />
            )}

            {activeBottomTab === "history" && (
              <QueryHistory
                history={history}
                onSelectQuery={(query) => {
                  updateActiveQuery(query);
                  setActiveBottomTab("results");
                }}
                onRunQuery={(query) => {
                  updateActiveQuery(query);
                  setActiveBottomTab("results");
                  executeQuery(query);
                }}
                onClearHistory={clearHistory}
              />
            )}

            {activeBottomTab === "schema" && (
              <div className="h-full overflow-auto p-3 font-mono text-xs space-y-2 select-none">
                <p className="text-[11px] text-muted-foreground">
                  Click any table to insert <code className="text-foreground">SELECT * FROM ...</code> into the editor:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {schemaTables.map((t) => (
                    <div
                      key={t.name}
                      onClick={() => {
                        updateActiveQuery(`SELECT * FROM ${t.name} LIMIT 25;\n`);
                      }}
                      className="p-2 rounded border border-border bg-card/60 hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <TableIcon className="h-3.5 w-3.5 shrink-0 text-signal" />
                        <span className="truncate">{t.name}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {t.columns?.length || 0} columns
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {t.columns?.slice(0, 3).map((c) => (
                          <span
                            key={c.name}
                            className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {c.name}
                          </span>
                        ))}
                        {(t.columns?.length || 0) > 3 && (
                          <span className="text-[10px] text-muted-foreground/60">
                            +{(t.columns?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

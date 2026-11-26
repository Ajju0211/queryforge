"use client";

/**
 * Custom React hook for SQL Editor state management.
 * 
 * Adheres strictly to SOLID & SSOT principles:
 * - Single source of truth for query editor tabs, execution state, and local query history.
 * - Presentation-agnostic business logic.
 */

import { useState, useCallback, useEffect, useTransition } from "react";
import { EditorTab, QueryExecutionResult, QueryHistoryItem } from "../types";
import { queryExecutionService } from "../services/queryExecutionService";

interface UseSqlEditorProps {
  connectionId?: string;
  initialQuery?: string;
}

const DEFAULT_TABS: EditorTab[] = [
  {
    id: "tab-1",
    name: "Query 1",
    query: "-- Write any SQL query here (SELECT, INSERT, UPDATE, DDL, etc.)\nSELECT * FROM users LIMIT 10;\n",
    isDirty: false,
  },
];

export function useSqlEditor({ connectionId, initialQuery }: UseSqlEditorProps) {
  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    if (initialQuery) {
      return [
        {
          id: "tab-1",
          name: "Query 1",
          query: initialQuery,
          isDirty: false,
        },
      ];
    }
    return DEFAULT_TABS;
  });

  const [activeTabId, setActiveTabId] = useState<string>("tab-1");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<QueryExecutionResult | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [, startTransition] = useTransition();

  // Load history from localStorage on connection mount
  useEffect(() => {
    if (!connectionId || typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(`qf_sql_history_${connectionId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          startTransition(() => {
            setHistory(parsed.slice(0, 50));
          });
        }
      }
    } catch {
      // Ignore localStorage read failures
    }
  }, [connectionId]);

  // Persist history helper
  const saveHistoryItem = useCallback(
    (item: QueryHistoryItem) => {
      setHistory((prev) => {
        const updated = [item, ...prev.filter((h) => h.id !== item.id)].slice(0, 50);
        if (connectionId && typeof window !== "undefined") {
          try {
            localStorage.setItem(`qf_sql_history_${connectionId}`, JSON.stringify(updated));
          } catch {
            // Ignore quota errors
          }
        }
        return updated;
      });
    },
    [connectionId]
  );

  // Active tab object
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Update query content in current tab
  const updateActiveQuery = useCallback(
    (newQuery: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, query: newQuery, isDirty: true } : t
        )
      );
    },
    [activeTabId]
  );

  // Add new tab
  const addTab = useCallback((defaultQuery?: string) => {
    const newId = `tab-${Date.now()}`;
    const newTabNumber = tabs.length + 1;
    const newTab: EditorTab = {
      id: newId,
      name: `Query ${newTabNumber}`,
      query: defaultQuery || "-- New SQL Query\nSELECT 1;\n",
      isDirty: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  }, [tabs.length]);

  // Close tab
  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return; // Keep at least one tab open
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          setActiveTabId(filtered[0]?.id || "tab-1");
        }
        return filtered;
      });
    },
    [tabs.length, activeTabId]
  );

  // Execute query against database
  const executeQuery = useCallback(
    async (queryOverride?: string) => {
      if (!connectionId) return;

      const sqlToExecute = (queryOverride || activeTab?.query || "").trim();
      if (!sqlToExecute) return;

      setIsExecuting(true);
      try {
        const result = await queryExecutionService.executeQuery(
          connectionId,
          sqlToExecute
        );

        setLastResult(result);

        // Record history item
        saveHistoryItem({
          id: `hist-${Date.now()}`,
          query: sqlToExecute,
          executedAt: result.executedAt,
          success: result.success,
          rowCount: result.rowCount,
          executionTimeMs: result.executionTimeMs,
          command: result.command,
          error: result.error,
        });
      } finally {
        setIsExecuting(false);
      }
    },
    [connectionId, activeTab?.query, saveHistoryItem]
  );

  // Clear query editor
  const clearQuery = useCallback(() => {
    updateActiveQuery("");
  }, [updateActiveQuery]);

  // Clear query history
  const clearHistory = useCallback(() => {
    setHistory([]);
    if (connectionId && typeof window !== "undefined") {
      try {
        localStorage.removeItem(`qf_sql_history_${connectionId}`);
      } catch {
        // Ignore
      }
    }
  }, [connectionId]);

  return {
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
  };
}

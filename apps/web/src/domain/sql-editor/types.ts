/**
 * Domain types for SQL Editor and Query Execution.
 * 
 * Adheres strictly to SOLID & SSOT principles:
 * - Decoupled from presentation components.
 * - Single source of truth for query execution results, editor tabs, and history.
 */

export interface QueryExecutionResult {
  success: boolean;
  command: string | null;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  error: string | null;
  executedAt: string;
  query: string;
}

export interface EditorTab {
  id: string;
  name: string;
  query: string;
  isDirty?: boolean;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  executedAt: string;
  success: boolean;
  rowCount: number;
  executionTimeMs: number;
  command: string | null;
  error?: string | null;
}

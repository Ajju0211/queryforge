/**
 * Query Execution Service.
 * 
 * Adheres to Single Responsibility Principle (SRP):
 * Handles HTTP communication with the backend connection execute API,
 * error handling, and response mapping.
 */

import { apiClient } from "@/infrastructure/api/api.client";
import { API_ENDPOINTS } from "@/infrastructure/api/api.endpoints";
import { QueryExecutionResult } from "../types";

export class QueryExecutionService {
  /**
   * Executes any raw SQL query on the target PostgreSQL database without restriction.
   */
  public async executeQuery(
    connectionId: string,
    query: string
  ): Promise<QueryExecutionResult> {
    const executedAt = new Date().toISOString();
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return {
        success: true,
        command: "EMPTY",
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: null,
        executedAt,
        query: cleanQuery,
      };
    }

    try {
      const response = await apiClient.post<{
        success: boolean;
        command: string | null;
        columns: string[];
        rows: Record<string, unknown>[];
        row_count: number;
        execution_time_ms: number;
        error: string | null;
      }>(API_ENDPOINTS.V1.CONNECTIONS.EXECUTE(connectionId), {
        query: cleanQuery,
      });

      return {
        success: response.success,
        command: response.command,
        columns: response.columns || [],
        rows: response.rows || [],
        rowCount: response.row_count || 0,
        executionTimeMs: response.execution_time_ms || 0,
        error: response.error || null,
        executedAt,
        query: cleanQuery,
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to execute query on database.";

      return {
        success: false,
        command: null,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: errorMessage,
        executedAt,
        query: cleanQuery,
      };
    }
  }
}

export const queryExecutionService = new QueryExecutionService();

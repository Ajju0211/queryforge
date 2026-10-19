/**
 * Concrete HTTP Implementation of IConnectionRepository.
 * Lives in the Infrastructure Layer (Clean Architecture / DDD).
 * Interacts with backend API endpoints via the centralized ApiClient and API_ENDPOINTS.
 */

import {
  ConnectionCreatePayload,
  ConnectionEntity,
  ConnectionTestPayload,
  ConnectionTestResult,
  ConnectionWithSchema,
  SchemaGraph,
} from "@/domain/connection/models/connection.types";
import { IConnectionRepository } from "@/domain/connection/repositories/connection.repository";
import { apiClient, API_ENDPOINTS } from "../api";

export class HttpConnectionRepository implements IConnectionRepository {
  /**
   * Tests target database connectivity without persisting credentials.
   */
  async testConnection(payload: ConnectionTestPayload): Promise<ConnectionTestResult> {
    return apiClient.post<ConnectionTestResult>(
      API_ENDPOINTS.V1.CONNECTIONS.TEST,
      payload,
      { timeoutMs: 15000 }
    );
  }

  /**
   * Onboards and persists an encrypted database connection with atomic schema introspection.
   */
  async createConnection(payload: ConnectionCreatePayload): Promise<ConnectionWithSchema> {
    return apiClient.post<ConnectionWithSchema>(
      API_ENDPOINTS.V1.CONNECTIONS.BASE,
      payload,
      { timeoutMs: 45000 } // Extended timeout for initial schema catalog introspection
    );
  }

  /**
   * Retrieves all configured database connections.
   */
  async listConnections(): Promise<ConnectionEntity[]> {
    return apiClient.get<ConnectionEntity[]>(API_ENDPOINTS.V1.CONNECTIONS.BASE);
  }

  /**
   * Fetches metadata for a single database connection.
   */
  async getConnection(id: string): Promise<ConnectionEntity> {
    return apiClient.get<ConnectionEntity>(API_ENDPOINTS.V1.CONNECTIONS.BY_ID(id));
  }

  /**
   * Fetches the introspected table and column schema graph.
   */
  async getSchema(id: string): Promise<SchemaGraph> {
    return apiClient.get<SchemaGraph>(API_ENDPOINTS.V1.CONNECTIONS.SCHEMA(id));
  }

  /**
   * Triggers on-demand schema catalog re-introspection.
   */
  async refreshSchema(id: string): Promise<SchemaGraph> {
    return apiClient.post<SchemaGraph>(
      API_ENDPOINTS.V1.CONNECTIONS.REFRESH_SCHEMA(id),
      {},
      { timeoutMs: 45000 }
    );
  }

  /**
   * Toggles whether a specific table is excluded from AI prompts and context.
   */
  async toggleTableExclusion(
    connectionId: string,
    tableName: string,
    isExcluded: boolean,
    schema: string = "public"
  ): Promise<boolean> {
    const res = await apiClient.patch<{ success: boolean }>(
      API_ENDPOINTS.V1.CONNECTIONS.EXCLUDE_TABLE(connectionId, tableName, schema),
      { is_excluded: isExcluded }
    );
    return res.success;
  }

  /**
   * Deletes a connection and cleans up all associated resources and pools.
   */
  async deleteConnection(id: string): Promise<boolean> {
    const res = await apiClient.delete<{ success: boolean }>(
      API_ENDPOINTS.V1.CONNECTIONS.BY_ID(id)
    );
    return res.success;
  }
}

// Global default singleton instance
export const defaultConnectionRepository = new HttpConnectionRepository();

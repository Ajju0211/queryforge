import {
  ConnectionCreatePayload,
  ConnectionEntity,
  ConnectionTestPayload,
  ConnectionTestResult,
  ConnectionWithSchema,
  SchemaGraph,
} from "../models/connection.types";

/**
 * Dependency Inversion Principle (DIP) abstraction for Connection operations.
 * Isolates UI and Store from direct HTTP or transport concerns.
 */
export interface IConnectionRepository {
  /**
   * Test target PostgreSQL reachability and credentials without persisting.
   */
  testConnection(payload: ConnectionTestPayload): Promise<ConnectionTestResult>;

  /**
   * Register, verify, encrypt, and introspect a target database connection.
   */
  createConnection(payload: ConnectionCreatePayload): Promise<ConnectionWithSchema>;

  /**
   * List all saved connections.
   */
  listConnections(): Promise<ConnectionEntity[]>;

  /**
   * Get metadata for a specific connection.
   */
  getConnection(id: string): Promise<ConnectionEntity>;

  /**
   * Get cached relational schema graph for a connection.
   */
  getSchema(id: string): Promise<SchemaGraph>;

  /**
   * Trigger manual schema re-introspection on the target database.
   */
  refreshSchema(id: string): Promise<SchemaGraph>;

  /**
   * Toggle table exclusion for AI query generation context.
   */
  toggleTableExclusion(
    connectionId: string,
    tableName: string,
    isExcluded: boolean,
    schema?: string
  ): Promise<boolean>;

  /**
   * Delete connection and associated schema cache.
   */
  deleteConnection(id: string): Promise<boolean>;
}

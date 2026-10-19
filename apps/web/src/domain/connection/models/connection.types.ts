/**
 * Domain models and value objects for database connections and schema discovery.
 * Single Source of Truth (SSOT) mirroring backend contracts in apps/api/app/schemas/connection.py.
 */

export type SSLMode =
  | "disable"
  | "prefer"
  | "require"
  | "verify-ca"
  | "verify-full";

export type ConnectionStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "INTROSPECTION_FAILED"
  | "UNREACHABLE"
  | "DISABLED";

export type ConnectionPresetType = "local" | "cloud" | "custom";

export interface ColumnMetadata {
  name: string;
  data_type: string;
  nullable: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
}

export interface ForeignKeyMetadata {
  column: string;
  target_table: string;
  target_column: string;
}

export interface TableMetadata {
  name: string;
  schema: string;
  estimated_row_count: number;
  is_excluded: boolean;
  columns: ColumnMetadata[];
  foreign_keys: ForeignKeyMetadata[];
}

export interface SchemaGraph {
  connection_id: string;
  database_name: string;
  introspected_at: string;
  tables: TableMetadata[];
}

export interface ConnectionEntity {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl_mode: SSLMode;
  status: ConnectionStatus;
  created_at: string;
  updated_at?: string | null;
}

export interface ConnectionWithSchema {
  connection: ConnectionEntity;
  schema_graph?: SchemaGraph | null;
}

export interface ConnectionCreatePayload {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl_mode: SSLMode;
  custom_ca_cert?: string | null;
}

export interface ConnectionTestPayload {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl_mode: SSLMode;
  custom_ca_cert?: string | null;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error_category?: string | null;
  latency_ms?: number | null;
}

export interface TableExclusionPayload {
  is_excluded: boolean;
}

"""Pydantic models and schemas for database connections and schema discovery.

Adheres strictly to docs/architecture/database-connections.md (§4.1 and §4.3).
Guarantees password is NEVER serialized or returned in any response.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SSLMode(str, Enum):
    """Supported SSL/TLS modes for PostgreSQL connections."""
    DISABLE = "disable"          # Plaintext TCP (Standard for localhost / Docker dev)
    PREFER = "prefer"            # Try SSL first, fallback to plaintext if unsupported
    REQUIRE = "require"          # Enforce SSL/TLS (Standard for Supabase, Neon, AWS RDS)
    VERIFY_CA = "verify-ca"      # Enforce SSL and verify CA certificate chain
    VERIFY_FULL = "verify-full"  # Enforce SSL, verify CA chain and hostname match


class ConnectionStatus(str, Enum):
    """Lifecycle states of a registered database connection."""
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    ACTIVE = "ACTIVE"
    INTROSPECTION_FAILED = "INTROSPECTION_FAILED"
    UNREACHABLE = "UNREACHABLE"
    DISABLED = "DISABLED"


# ==============================================================================
# Connection Request Schemas
# ==============================================================================

class ConnectionCreateRequest(BaseModel):
    """Payload to register and verify a new PostgreSQL database connection."""
    name: str = Field(..., min_length=1, max_length=255, description="Friendly connection label", examples=["Local Dev DB"])
    host: str = Field(..., min_length=1, max_length=255, description="Database host or IP", examples=["localhost"])
    port: int = Field(default=5432, ge=1, le=65535, description="Port number (1-65535)")
    database: str = Field(..., min_length=1, max_length=255, description="Database name", examples=["myapp_dev"])
    username: str = Field(..., min_length=1, max_length=255, description="Database user name", examples=["postgres"])
    password: str = Field(..., min_length=1, description="Database user password", examples=["secret"])
    ssl_mode: SSLMode = Field(default=SSLMode.DISABLE, description="SSL negotiation mode")
    custom_ca_cert: Optional[str] = Field(
        default=None,
        description="Optional PEM CA certificate for custom/self-signed roots",
    )


class ConnectionUpdateRequest(BaseModel):
    """Payload to update an existing database connection configuration."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    host: Optional[str] = Field(default=None, min_length=1, max_length=255)
    port: Optional[int] = Field(default=None, ge=1, le=65535)
    database: Optional[str] = Field(default=None, min_length=1, max_length=255)
    username: Optional[str] = Field(default=None, min_length=1, max_length=255)
    password: Optional[str] = Field(default=None, min_length=1)
    ssl_mode: Optional[SSLMode] = None
    custom_ca_cert: Optional[str] = None
    status: Optional[ConnectionStatus] = None


class ConnectionTestRequest(BaseModel):
    """Payload to test reachability of database parameters without persisting."""
    host: str = Field(..., min_length=1, max_length=255, examples=["localhost"])
    port: int = Field(default=5432, ge=1, le=65535)
    database: str = Field(..., min_length=1, max_length=255, examples=["myapp_dev"])
    username: str = Field(..., min_length=1, max_length=255, examples=["postgres"])
    password: str = Field(..., min_length=1, examples=["secret"])
    ssl_mode: SSLMode = Field(default=SSLMode.DISABLE)
    custom_ca_cert: Optional[str] = None


class ConnectionTestResponse(BaseModel):
    """Result of an ad-hoc connection test."""
    success: bool
    message: str
    error_category: Optional[str] = Field(
        default=None,
        description="Categorized error identifier (authentication, unreachable, ssl_mismatch, database_not_found, catalog_permission)",
    )
    latency_ms: Optional[float] = None


# ==============================================================================
# Schema Introspection & Metadata Schemas (§4.3)
# ==============================================================================

class ColumnMetadata(BaseModel):
    """Metadata for an individual table column."""
    name: str
    data_type: str
    nullable: bool
    is_primary_key: bool = False
    is_foreign_key: bool = False


class ForeignKeyMetadata(BaseModel):
    """Metadata for a foreign key relationship between tables."""
    column: str
    target_table: str
    target_column: str


class TableMetadata(BaseModel):
    """Normalized schema representation for a database table."""
    name: str
    schema_name: str = Field(..., alias="schema", serialization_alias="schema")
    estimated_row_count: int = 0
    is_excluded: bool = False
    columns: List[ColumnMetadata] = Field(default_factory=list)
    foreign_keys: List[ForeignKeyMetadata] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class SchemaGraph(BaseModel):
    """Full introspected schema graph for a target database."""
    connection_id: str
    database_name: str
    introspected_at: str
    tables: List[TableMetadata] = Field(default_factory=list)


class TableExclusionUpdateRequest(BaseModel):
    """Request payload to toggle a table's exclusion from AI query generation."""
    is_excluded: bool


# ==============================================================================
# Response Schemas (Guarantees zero password exposure)
# ==============================================================================

class ConnectionResponse(BaseModel):
    """Public connection details returned to clients. Password is never included."""
    id: str
    name: str
    host: str
    port: int
    database: str
    username: str
    ssl_mode: SSLMode
    status: ConnectionStatus
    created_at: str
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConnectionWithSchemaResponse(BaseModel):
    """Connection response paired with its introspected schema graph."""
    connection: ConnectionResponse
    schema_graph: Optional[SchemaGraph] = None

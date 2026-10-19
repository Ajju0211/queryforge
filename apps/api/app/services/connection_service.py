"""Service layer orchestrator for target PostgreSQL database connections.

Adheres strictly to docs/architecture/database-connections.md (§3, §7, and §8 Invariants):
1. No credential persistence before validation.
2. No early background tasks; all dependent tasks wait for atomic commit.
3. Single atomic database transaction saving encrypted connection and schema metadata together.
4. Clear separation of connection validity from schema catalog permissions.
5. Immediate release of temporary test connections on success and failure.
6. Safe, sanitized error messages with zero credential exposure.
"""

import logging
import uuid
from typing import List, Optional, Set, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security.crypto import CryptoVault, default_crypto_vault
from app.models.connection import DatabaseConnection
from app.schemas.connection import (
    ConnectionCreateRequest,
    ConnectionResponse,
    ConnectionStatus,
    ConnectionTestRequest,
    ConnectionTestResponse,
    ConnectionWithSchemaResponse,
    SchemaGraph,
    TableMetadata,
)
from app.services.connection_repository import ConnectionRepository
from app.services.pool_manager import (
    ConnectionPoolManager,
    ConnectionTargetError,
    default_pool_manager,
)
from app.services.schema_extractor import (
    CatalogPermissionError,
    PostgresSchemaExtractor,
    default_schema_extractor,
)
from app.utils.network_guard import NetworkGuard, SecurityError, default_network_guard

logger = logging.getLogger(__name__)


class ConnectionService:
    """Orchestrates onboarding, testing, encryption, and introspection of target databases.

    Single Responsibility:
        Business workflow orchestrator coordinating network validation, connection pooling,
        cryptographic operations, schema extraction, and atomic repository persistence.
    """

    def __init__(
        self,
        session: AsyncSession,
        network_guard: NetworkGuard = default_network_guard,
        crypto_vault: CryptoVault = default_crypto_vault,
        pool_manager: ConnectionPoolManager = default_pool_manager,
        schema_extractor: PostgresSchemaExtractor = default_schema_extractor,
    ) -> None:
        self.repository = ConnectionRepository(session)
        self.network_guard = network_guard
        self.crypto_vault = crypto_vault
        self.pool_manager = pool_manager
        self.schema_extractor = schema_extractor

    async def create_connection(
        self, request: ConnectionCreateRequest
    ) -> ConnectionWithSchemaResponse:
        """Register, verify, encrypt, and introspect a new target database connection.

        Workflow (Rules 1-6):
            1. Validate destination host against SSRF & cloud metadata rules (Rule 1 & 6).
            2. Open temporary target connection, authenticate, and introspect schema (Rule 4 & 5).
            3. Close temporary target connection immediately upon extraction (Rule 5).
            4. Encrypt password with Fernet and save connection + schema metadata together
               in a single atomic database transaction (Rule 3).
            5. Return sanitized response. Only after successful commit may dependent background
               tasks be triggered (Rule 2).

        Args:
            request: Connection parameters including host, port, credentials, and SSLMode.

        Returns:
            ConnectionWithSchemaResponse with sanitized connection data and cached schema graph.

        Raises:
            HTTPException: 400 for validation/connectivity/catalog errors, 500 for persistence failure.
        """
        # Step 0: Edge Case Validations - Prevent duplicate connections
        clean_name = request.name.strip()
        clean_host = request.host.strip()
        clean_db = request.database.strip()

        existing_name = await self.repository.find_by_name(clean_name)
        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A connection named '{clean_name}' already exists. Please choose a different name.",
            )

        existing_endpoint = await self.repository.find_by_endpoint(
            host=clean_host, port=request.port, database=clean_db
        )
        if existing_endpoint:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Database '{clean_db}' on {clean_host}:{request.port} is already connected as '{existing_endpoint.name}'.",
            )

        # Step 1: Validate destination host against SSRF & cloud metadata policy (Rule 1)
        try:
            await self.network_guard.validate_host(clean_host, request.port)
        except SecurityError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            ) from e
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid target host: {e}",
            ) from e

        # Step 2: Open temporary connection to verify reachability and introspect schema (Rule 4 & 5).
        # Credentials remain only in request-scoped memory; temporary connection closes in finally.
        schema_graph: Optional[SchemaGraph] = None
        temp_conn_id = str(uuid.uuid4())

        try:
            async with self.pool_manager.open_temporary_connection(
                host=request.host,
                port=request.port,
                database=request.database,
                username=request.username,
                password=request.password,
                ssl_mode=request.ssl_mode,
                custom_ca_cert=request.custom_ca_cert,
            ) as conn:
                # Probe query
                await conn.fetchval("SELECT 1;")

                # Introspect catalog
                schema_graph = await self.schema_extractor.extract_schema(
                    connection=conn,
                    connection_id=temp_conn_id,
                    database_name=request.database,
                )
        except ConnectionTargetError as e:
            # Rule 4: Distinct, actionable connection errors (auth, unreachable, SSL)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=e.message,
            ) from e
        except CatalogPermissionError as e:
            # Rule 4: Distinct catalog permission error
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=e.message,
            ) from e
        except Exception as e:
            cat, msg = self.pool_manager.categorize_error(e, request.password)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg,
            ) from e

        # Step 3: Encrypt raw credentials at rest using Fernet
        encrypted_pass = self.crypto_vault.encrypt(request.password)

        # Step 4: Atomic database transaction (Rule 3)
        # Persist connection record and schema metadata together. Rollback if persistence fails.
        try:
            connection, _ = await self.repository.create_connection_with_schema(
                name=clean_name,
                host=clean_host,
                port=request.port,
                database=clean_db,
                username=request.username.strip(),
                encrypted_password=encrypted_pass,
                ssl_mode=request.ssl_mode.value,
                status=ConnectionStatus.ACTIVE.value,
                schema_graph_dict=schema_graph.model_dump(),
                custom_ca_cert=request.custom_ca_cert,
            )
            schema_graph.connection_id = connection.id
        except Exception as e:
            logger.error(f"Failed to atomically persist connection and schema: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist connection record in internal application database.",
            ) from e

        # Rule 2: All dependent background tasks (AI query generation, vector embeddings)
        # must only run after the atomic transaction has successfully committed.

        return ConnectionWithSchemaResponse(
            connection=self._serialize_connection(connection),
            schema_graph=schema_graph,
        )

    async def test_adhoc_connection(
        self, request: ConnectionTestRequest
    ) -> ConnectionTestResponse:
        """Test target database connection parameters without persisting (Rule 1 & 5)."""
        try:
            await self.network_guard.validate_host(request.host, request.port)
        except SecurityError as e:
            return ConnectionTestResponse(
                success=False, message=str(e), error_category="security_violation", latency_ms=None
            )
        except ValueError as e:
            return ConnectionTestResponse(
                success=False, message=str(e), error_category="invalid_host", latency_ms=None
            )

        success, msg, latency, category = await self.pool_manager.test_connection(
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password,
            ssl_mode=request.ssl_mode,
            custom_ca_cert=request.custom_ca_cert,
        )
        return ConnectionTestResponse(
            success=success,
            message=msg,
            error_category=category,
            latency_ms=latency,
        )

    async def list_connections(self) -> List[ConnectionResponse]:
        """List all saved database connections with sanitized credentials."""
        connections = await self.repository.list_all()
        return [self._serialize_connection(c) for c in connections]

    async def get_connection_by_id(self, connection_id: str) -> ConnectionResponse:
        """Fetch connection metadata by ID."""
        connection = await self.repository.get_by_id(connection_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection '{connection_id}' not found.",
            )
        return self._serialize_connection(connection)

    async def get_connection_schema(self, connection_id: str) -> SchemaGraph:
        """Retrieve cached schema graph for a connection."""
        connection = await self.repository.get_by_id(connection_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection '{connection_id}' not found.",
            )

        cache = await self.repository.get_schema_cache(connection_id)
        if not cache or not cache.schema_graph:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No cached schema found for connection '{connection_id}'. Refresh required.",
            )

        return SchemaGraph(**cache.schema_graph)

    async def refresh_schema(self, connection_id: str) -> SchemaGraph:
        """Re-introspect target database and update cached schema graph (Rule 4 & 5)."""
        connection = await self.repository.get_by_id(connection_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection '{connection_id}' not found.",
            )

        password = self.crypto_vault.decrypt(connection.encrypted_password)
        excluded_tables = await self.repository.get_excluded_tables(connection_id)

        try:
            async with self.pool_manager.open_temporary_connection(
                host=connection.host,
                port=connection.port,
                database=connection.database,
                username=connection.username,
                password=password,
                ssl_mode=connection.ssl_mode,
                custom_ca_cert=connection.custom_ca_cert,
            ) as conn:
                schema_graph = await self.schema_extractor.extract_schema(
                    connection=conn,
                    connection_id=connection.id,
                    database_name=connection.database,
                    excluded_tables=excluded_tables,
                )

            await self.repository.save_schema_cache(
                connection_id=connection.id,
                database_name=connection.database,
                schema_graph_dict=schema_graph.model_dump(),
            )
            await self.repository.update_status(connection.id, ConnectionStatus.ACTIVE.value)
            return schema_graph

        except CatalogPermissionError as e:
            # Rule 4: Distinct catalog permission error
            await self.repository.update_status(
                connection.id, ConnectionStatus.INTROSPECTION_FAILED.value
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=e.message,
            ) from e
        except ConnectionTargetError as e:
            # Rule 4: Distinct connection error
            await self.repository.update_status(
                connection.id, ConnectionStatus.UNREACHABLE.value
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=e.message,
            ) from e
        except Exception as e:
            logger.error(f"Failed to refresh schema for {connection_id}: {e}")
            await self.repository.update_status(
                connection.id, ConnectionStatus.INTROSPECTION_FAILED.value
            )
            cat, msg = self.pool_manager.categorize_error(e, password)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=msg,
            ) from e

    async def delete_connection(self, connection_id: str) -> bool:
        """Delete connection record and terminate active connection pools (Rule 5)."""
        await self.pool_manager.close_pool(connection_id)
        deleted = await self.repository.delete(connection_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection '{connection_id}' not found.",
            )
        return True

    async def toggle_table_exclusion(
        self, connection_id: str, table_schema: str, table_name: str, is_excluded: bool
    ) -> bool:
        """Update table exclusion preference and update cached schema graph."""
        connection = await self.repository.get_by_id(connection_id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connection '{connection_id}' not found.",
            )

        await self.repository.set_table_exclusion(
            connection_id=connection_id,
            table_schema=table_schema,
            table_name=table_name,
            is_excluded=is_excluded,
        )

        # Update cache in-memory if present
        cache = await self.repository.get_schema_cache(connection_id)
        if cache and cache.schema_graph:
            graph_dict = dict(cache.schema_graph)
            tables = graph_dict.get("tables", [])
            for t in tables:
                if t.get("name") == table_name and (
                    t.get("schema") == table_schema or not table_schema
                ):
                    t["is_excluded"] = is_excluded
            await self.repository.save_schema_cache(
                connection_id=connection_id,
                database_name=connection.database,
                schema_graph_dict=graph_dict,
            )

        return True

    def _serialize_connection(self, connection: DatabaseConnection) -> ConnectionResponse:
        """Convert SQLAlchemy model to public Pydantic model (omitting password)."""
        return ConnectionResponse(
            id=connection.id,
            name=connection.name,
            host=connection.host,
            port=connection.port,
            database=connection.database,
            username=connection.username,
            ssl_mode=connection.ssl_mode,
            status=connection.status,
            created_at=connection.created_at.isoformat()
            if connection.created_at
            else "",
            updated_at=connection.updated_at.isoformat()
            if connection.updated_at
            else None,
        )

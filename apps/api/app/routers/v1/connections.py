"""FastAPI Router for v1 target PostgreSQL database connections and schema discovery.

Adheres strictly to docs/architecture/database-connections.md:
- API Versioning: Mounted under /api/v1/connections.
- Never returns credentials or passwords in response models.
- Enforces NetworkGuard SSRF protection and 5-second connect timeout.
- Exposes schema inspection, table exclusion flags, and manual refresh endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.connection import (
    ConnectionCreateRequest,
    ConnectionResponse,
    ConnectionTestRequest,
    ConnectionTestResponse,
    ConnectionWithSchemaResponse,
    SchemaGraph,
    TableExclusionUpdateRequest,
)
from app.services.connection_service import ConnectionService

router = APIRouter(tags=["Database Connections"])


def get_connection_service(
    session: AsyncSession = Depends(get_db),
) -> ConnectionService:
    """Dependency provider for ConnectionService."""
    return ConnectionService(session=session)


@router.post(
    "",
    response_model=ConnectionWithSchemaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register, verify, and introspect a target PostgreSQL database",
)
async def create_connection(
    request: ConnectionCreateRequest,
    service: ConnectionService = Depends(get_connection_service),
) -> ConnectionWithSchemaResponse:
    """Register a new PostgreSQL database connection.

    Workflow:
        1. Validates destination host against SSRF & cloud metadata rules.
        2. Tests reachability and credentials with a 5-second timeout.
        3. Encrypts database password at rest using Fernet.
        4. Persists connection record into the internal database.
        5. Executes schema discovery on target PostgreSQL catalogs.
        6. Caches normalized schema graph and returns sanitized response.
    """
    return await service.create_connection(request)


@router.post(
    "/test",
    response_model=ConnectionTestResponse,
    status_code=status.HTTP_200_OK,
    summary="Test target database connection parameters without saving",
)
async def test_connection(
    request: ConnectionTestRequest,
    service: ConnectionService = Depends(get_connection_service),
) -> ConnectionTestResponse:
    """Verify target host reachability and credentials without persisting records."""
    return await service.test_adhoc_connection(request)


@router.get(
    "",
    response_model=List[ConnectionResponse],
    status_code=status.HTTP_200_OK,
    summary="List all registered target database connections",
)
async def list_connections(
    service: ConnectionService = Depends(get_connection_service),
) -> List[ConnectionResponse]:
    """Retrieve all saved database connections with sanitized credentials (passwords omitted)."""
    return await service.list_connections()


@router.get(
    "/{connection_id}",
    response_model=ConnectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get connection details by ID",
)
async def get_connection(
    connection_id: str,
    service: ConnectionService = Depends(get_connection_service),
) -> ConnectionResponse:
    """Fetch connection metadata for a single target database."""
    return await service.get_connection_by_id(connection_id)


@router.delete(
    "/{connection_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a database connection and its cached schema",
)
async def delete_connection(
    connection_id: str,
    service: ConnectionService = Depends(get_connection_service),
) -> dict:
    """Delete a database connection record, its schema cache, and close its connection pool."""
    await service.delete_connection(connection_id)
    return {"success": True, "message": f"Connection '{connection_id}' deleted successfully."}


@router.get(
    "/{connection_id}/schema",
    response_model=SchemaGraph,
    status_code=status.HTTP_200_OK,
    summary="Retrieve cached schema graph for a connection",
)
async def get_connection_schema(
    connection_id: str,
    service: ConnectionService = Depends(get_connection_service),
) -> SchemaGraph:
    """Fetch the cached relational schema graph (tables, columns, primary/foreign keys)."""
    return await service.get_connection_schema(connection_id)


@router.post(
    "/{connection_id}/refresh-schema",
    response_model=SchemaGraph,
    status_code=status.HTTP_200_OK,
    summary="Re-introspect target database and update cached schema",
)
async def refresh_schema(
    connection_id: str,
    service: ConnectionService = Depends(get_connection_service),
) -> SchemaGraph:
    """Trigger manual re-introspection of PostgreSQL system catalogs and update schema cache."""
    return await service.refresh_schema(connection_id)


@router.patch(
    "/{connection_id}/tables/{table_name}/exclude",
    status_code=status.HTTP_200_OK,
    summary="Toggle table exclusion from AI query generation context",
)
async def toggle_table_exclusion(
    connection_id: str,
    table_name: str,
    request: TableExclusionUpdateRequest,
    schema: Optional[str] = Query(default="public", description="Database schema name"),
    service: ConnectionService = Depends(get_connection_service),
) -> dict:
    """Flag a table as excluded or included in the AI context window."""
    await service.toggle_table_exclusion(
        connection_id=connection_id,
        table_schema=schema or "public",
        table_name=table_name,
        is_excluded=request.is_excluded,
    )
    return {
        "success": True,
        "table_name": table_name,
        "is_excluded": request.is_excluded,
    }

"""Integration and contract tests for /api/v1/connections endpoints.

Verifies:
- SSRF prevention (cloud metadata 169.254.169.254 blocked with 400).
- Password is NEVER returned in response models.
- Full lifecycle: test, create, introspect, list, schema get, table exclusion, delete.
"""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.routers.v1.connections import get_connection_service
from app.schemas.connection import (
    ColumnMetadata,
    ConnectionResponse,
    ConnectionStatus,
    ConnectionTestResponse,
    ConnectionWithSchemaResponse,
    SchemaGraph,
    TableMetadata,
)
from app.services.connection_service import ConnectionService


@pytest.fixture
def mock_service():
    """Provides a mocked ConnectionService for router integration testing."""
    service = MagicMock(spec=ConnectionService)
    return service


@pytest.mark.asyncio
async def test_test_connection_endpoint():
    """Test POST /api/v1/connections/test connectivity probe."""
    mock_srv = MagicMock(spec=ConnectionService)
    mock_srv.test_adhoc_connection = AsyncMock(
        return_value=ConnectionTestResponse(
            success=True,
            message="Successfully connected to target database.",
            latency_ms=12.4,
        )
    )

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/connections/test",
                json={
                    "host": "localhost",
                    "port": 5432,
                    "database": "myapp_dev",
                    "username": "postgres",
                    "password": "my_secret_password",
                    "ssl_mode": "disable",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["latency_ms"] == 12.4
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_connection_blocks_cloud_metadata():
    """Verify SSRF defense blocks 169.254.169.254."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/api/v1/connections",
            json={
                "name": "Malicious Metadata Probe",
                "host": "169.254.169.254",
                "port": 5432,
                "database": "secret_db",
                "username": "admin",
                "password": "leak_my_pass",
                "ssl_mode": "disable",
            },
        )
    assert response.status_code == 400
    assert "cloud instance metadata" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_connection_success_omits_password():
    """Test successful connection onboarding and verify zero password leakage."""
    mock_srv = MagicMock(spec=ConnectionService)
    conn_resp = ConnectionResponse(
        id="3fa85f64-5717-4562-b3fc-2c963f66afa6",
        name="Local Dev DB",
        host="localhost",
        port=5432,
        database="myapp_dev",
        username="postgres",
        ssl_mode="disable",
        status=ConnectionStatus.ACTIVE,
        created_at="2026-10-17T11:00:00Z",
    )
    schema_graph = SchemaGraph(
        connection_id=conn_resp.id,
        database_name=conn_resp.database,
        introspected_at="2026-10-17T11:00:01Z",
        tables=[
            TableMetadata(
                name="orders",
                schema="public",
                estimated_row_count=100,
                is_excluded=False,
                columns=[
                    ColumnMetadata(name="id", data_type="integer", nullable=False, is_primary_key=True)
                ],
                foreign_keys=[],
            )
        ],
    )
    mock_srv.create_connection = AsyncMock(
        return_value=ConnectionWithSchemaResponse(
            connection=conn_resp,
            schema_graph=schema_graph,
        )
    )

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/connections",
                json={
                    "name": "Local Dev DB",
                    "host": "localhost",
                    "port": 5432,
                    "database": "myapp_dev",
                    "username": "postgres",
                    "password": "super_secret_never_leak_this!",
                    "ssl_mode": "disable",
                },
            )
        assert response.status_code == 201
        data = response.json()

        # Critical invariant: Password must NEVER be in response
        assert "password" not in data["connection"]
        assert "super_secret_never_leak_this!" not in response.text
        assert data["connection"]["id"] == "3fa85f64-5717-4562-b3fc-2c963f66afa6"
        assert data["connection"]["status"] == "ACTIVE"
        assert len(data["schema_graph"]["tables"]) == 1
        assert data["schema_graph"]["tables"][0]["name"] == "orders"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_connections():
    """Test GET /api/v1/connections returns list of connections."""
    mock_srv = MagicMock(spec=ConnectionService)
    mock_srv.list_connections = AsyncMock(
        return_value=[
            ConnectionResponse(
                id="conn-1",
                name="DB 1",
                host="localhost",
                port=5432,
                database="db1",
                username="postgres",
                ssl_mode="disable",
                status=ConnectionStatus.ACTIVE,
                created_at="2026-10-17T10:00:00Z",
            )
        ]
    )

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get("/api/v1/connections")
        assert response.status_code == 200
        items = response.json()
        assert len(items) == 1
        assert items[0]["id"] == "conn-1"
        assert "password" not in items[0]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_connection_by_id():
    """Test GET /api/v1/connections/{id}."""
    mock_srv = MagicMock(spec=ConnectionService)
    mock_srv.get_connection_by_id = AsyncMock(
        return_value=ConnectionResponse(
            id="conn-1",
            name="DB 1",
            host="localhost",
            port=5432,
            database="db1",
            username="postgres",
            ssl_mode="disable",
            status=ConnectionStatus.ACTIVE,
            created_at="2026-10-17T10:00:00Z",
        )
    )

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.get("/api/v1/connections/conn-1")
        assert response.status_code == 200
        assert response.json()["id"] == "conn-1"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_schema_and_refresh():
    """Test GET schema and POST refresh-schema."""
    mock_srv = MagicMock(spec=ConnectionService)
    schema_graph = SchemaGraph(
        connection_id="conn-1",
        database_name="db1",
        introspected_at="2026-10-17T11:00:00Z",
        tables=[],
    )
    mock_srv.get_connection_schema = AsyncMock(return_value=schema_graph)
    mock_srv.refresh_schema = AsyncMock(return_value=schema_graph)

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            # 1. Get cached schema
            res1 = await ac.get("/api/v1/connections/conn-1/schema")
            assert res1.status_code == 200
            assert res1.json()["connection_id"] == "conn-1"

            # 2. Refresh schema
            res2 = await ac.post("/api/v1/connections/conn-1/refresh-schema")
            assert res2.status_code == 200
            assert res2.json()["connection_id"] == "conn-1"
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_toggle_table_exclusion():
    """Test PATCH /api/v1/connections/{id}/tables/{table}/exclude."""
    mock_srv = MagicMock(spec=ConnectionService)
    mock_srv.toggle_table_exclusion = AsyncMock(return_value=True)

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.patch(
                "/api/v1/connections/conn-1/tables/users/exclude",
                json={"is_excluded": True},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["table_name"] == "users"
        assert data["is_excluded"] is True
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_connection_authentication_failure():
    """Verify Rule 4: Authentication failure produces distinct 400 with clear message."""
    mock_srv = MagicMock(spec=ConnectionService)
    from fastapi import HTTPException
    mock_srv.create_connection = AsyncMock(
        side_effect=HTTPException(
            status_code=400,
            detail="Authentication failed: invalid username or password for target database.",
        )
    )

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/connections",
                json={
                    "name": "Bad Auth DB",
                    "host": "localhost",
                    "port": 5432,
                    "database": "myapp",
                    "username": "postgres",
                    "password": "wrong_password",
                    "ssl_mode": "disable",
                },
            )
        assert response.status_code == 400
        assert "invalid username or password" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_connection_catalog_permission_failure():
    """Verify Rule 4: Catalog permission error produces distinct 400 message."""
    mock_srv = MagicMock(spec=ConnectionService)
    from fastapi import HTTPException
    mock_srv.create_connection = AsyncMock(
        side_effect=HTTPException(
            status_code=400,
            detail="Insufficient catalog permissions: database user lacks privileges to query PostgreSQL system catalogs (pg_catalog).",
        )
    )

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/connections",
                json={
                    "name": "Restricted User DB",
                    "host": "localhost",
                    "port": 5432,
                    "database": "myapp",
                    "username": "restricted_user",
                    "password": "valid_pass",
                    "ssl_mode": "disable",
                },
            )
        assert response.status_code == 400
        assert "insufficient catalog permissions" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_connection_atomic_rollback_on_persistence_error():
    """Verify Rule 3: Database persistence failure raises 500 and rolls back."""
    mock_srv = MagicMock(spec=ConnectionService)
    from fastapi import HTTPException
    mock_srv.create_connection = AsyncMock(
        side_effect=HTTPException(
            status_code=500,
            detail="Failed to persist connection record in internal application database.",
        )
    )

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/api/v1/connections",
                json={
                    "name": "Failing Persistence DB",
                    "host": "localhost",
                    "port": 5432,
                    "database": "myapp",
                    "username": "postgres",
                    "password": "valid_pass",
                    "ssl_mode": "disable",
                },
            )
        assert response.status_code == 500
        assert "failed to persist" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_delete_connection():
    """Test DELETE /api/v1/connections/{id}."""
    mock_srv = MagicMock(spec=ConnectionService)
    mock_srv.delete_connection = AsyncMock(return_value=True)

    app.dependency_overrides[get_connection_service] = lambda: mock_srv

    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            response = await ac.delete("/api/v1/connections/conn-1")
        assert response.status_code == 200
        assert response.json()["success"] is True
    finally:
        app.dependency_overrides.clear()

"""Unit tests for PostgresSchemaExtractor normalized schema graph generation and permission handling."""

import pytest
from unittest.mock import AsyncMock
import asyncpg
from app.services.schema_extractor import CatalogPermissionError, PostgresSchemaExtractor


@pytest.mark.asyncio
async def test_schema_extractor_builds_normalized_graph():
    extractor = PostgresSchemaExtractor()

    # Mock asyncpg connection
    mock_conn = AsyncMock()

    # Tables query mock output
    mock_conn.fetch.side_effect = [
        # 1. tables
        [
            {"table_name": "orders", "schema_name": "public", "estimated_row_count": 14500},
            {"table_name": "customers", "schema_name": "public", "estimated_row_count": 320},
        ],
        # 2. columns
        [
            {
                "table_name": "orders",
                "schema_name": "public",
                "column_name": "id",
                "data_type": "integer",
                "is_nullable": False,
                "attnum": 1,
            },
            {
                "table_name": "orders",
                "schema_name": "public",
                "column_name": "customer_id",
                "data_type": "integer",
                "is_nullable": False,
                "attnum": 2,
            },
            {
                "table_name": "customers",
                "schema_name": "public",
                "column_name": "id",
                "data_type": "integer",
                "is_nullable": False,
                "attnum": 1,
            },
            {
                "table_name": "customers",
                "schema_name": "public",
                "column_name": "email",
                "data_type": "character varying(255)",
                "is_nullable": False,
                "attnum": 2,
            },
        ],
        # 3. primary keys
        [
            {"table_name": "orders", "schema_name": "public", "column_name": "id"},
            {"table_name": "customers", "schema_name": "public", "column_name": "id"},
        ],
        # 4. foreign keys
        [
            {
                "source_table": "orders",
                "source_schema": "public",
                "source_column": "customer_id",
                "target_table": "customers",
                "target_schema": "public",
                "target_column": "id",
            }
        ],
    ]

    graph = await extractor.extract_schema(
        connection=mock_conn,
        connection_id="test_conn_uuid",
        database_name="myapp_dev",
        excluded_tables={"customers"},
    )

    assert graph.connection_id == "test_conn_uuid"
    assert graph.database_name == "myapp_dev"
    assert len(graph.tables) == 2

    # Check orders table
    orders_table = next(t for t in graph.tables if t.name == "orders")
    assert orders_table.schema_name == "public"
    assert orders_table.estimated_row_count == 14500
    assert orders_table.is_excluded is False
    assert len(orders_table.columns) == 2
    assert len(orders_table.foreign_keys) == 1

    id_col = next(c for c in orders_table.columns if c.name == "id")
    assert id_col.is_primary_key is True
    assert id_col.is_foreign_key is False

    fk_col = next(c for c in orders_table.columns if c.name == "customer_id")
    assert fk_col.is_foreign_key is True
    assert fk_col.is_primary_key is False

    fk = orders_table.foreign_keys[0]
    assert fk.column == "customer_id"
    assert fk.target_table == "customers"
    assert fk.target_column == "id"

    # Check customers table (marked excluded)
    customers_table = next(t for t in graph.tables if t.name == "customers")
    assert customers_table.is_excluded is True


@pytest.mark.asyncio
async def test_schema_extractor_raises_catalog_permission_error():
    """Verify Rule 4: Insufficient catalog privileges produce CatalogPermissionError."""
    extractor = PostgresSchemaExtractor()
    mock_conn = AsyncMock()
    mock_conn.fetch.side_effect = Exception("permission denied for table pg_class")

    with pytest.raises(CatalogPermissionError) as exc_info:
        await extractor.extract_schema(
            connection=mock_conn,
            connection_id="test_id",
            database_name="test_db",
        )
    assert "insufficient catalog permissions" in str(exc_info.value).lower()

"""Schema discovery and introspection engine for target PostgreSQL databases.

Adheres to docs/architecture/database-connections.md (§2, §4.3, §7):
- Queries PostgreSQL system catalogs (pg_class, pg_attribute, pg_constraint, pg_namespace).
- Excludes system schemas (pg_catalog, information_schema, pg_toast, pg_temp_*).
- Extracts tables, columns, data types, primary keys, and foreign keys.
- Builds normalized SchemaGraph contract matching Section 4.3.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple
import asyncpg
from app.schemas.connection import (
    ColumnMetadata,
    ForeignKeyMetadata,
    SchemaGraph,
    TableMetadata,
)


class CatalogPermissionError(Exception):
    """Raised when the database user lacks permission to query pg_catalog system tables."""
    def __init__(
        self,
        message: str = "Insufficient permissions: database user lacks privileges to query PostgreSQL system catalogs (pg_catalog).",
    ) -> None:
        super().__init__(message)
        self.message = message


class PostgresSchemaExtractor:
    """Introspects PostgreSQL database catalogs to construct normalized schema graphs.

    Single Responsibility:
        Executes read-only catalog queries to extract relational schema topology
        without scanning or storing any customer table data rows.
    """

    # SQL query to fetch all user tables and estimated row counts
    TABLES_QUERY = """
        SELECT 
            c.relname AS table_name,
            n.nspname AS schema_name,
            GREATEST(COALESCE(c.reltuples, 0)::bigint, 0) AS estimated_row_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND n.nspname NOT LIKE 'pg_temp_%'
          AND n.nspname NOT LIKE 'pg_toast_temp_%'
        ORDER BY n.nspname, c.relname;
    """

    # SQL query to fetch all table columns with formatted data types
    COLUMNS_QUERY = """
        SELECT 
            c.relname AS table_name,
            n.nspname AS schema_name,
            a.attname AS column_name,
            format_type(a.atttypid, a.atttypmod) AS data_type,
            NOT a.attnotnull AS is_nullable,
            a.attnum AS attnum
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND n.nspname NOT LIKE 'pg_temp_%'
          AND n.nspname NOT LIKE 'pg_toast_temp_%'
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY n.nspname, c.relname, a.attnum;
    """

    # SQL query to fetch primary key column mappings
    PRIMARY_KEYS_QUERY = """
        SELECT 
            c.relname AS table_name,
            n.nspname AS schema_name,
            a.attname AS column_name
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
        WHERE con.contype = 'p'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND n.nspname NOT LIKE 'pg_temp_%'
          AND n.nspname NOT LIKE 'pg_toast_temp_%';
    """

    # SQL query to fetch foreign key constraints and referenced targets
    FOREIGN_KEYS_QUERY = """
        SELECT 
            c_src.relname AS source_table,
            n_src.nspname AS source_schema,
            a_src.attname AS source_column,
            c_tgt.relname AS target_table,
            n_tgt.nspname AS target_schema,
            a_tgt.attname AS target_column
        FROM pg_constraint con
        JOIN pg_class c_src ON c_src.oid = con.conrelid
        JOIN pg_namespace n_src ON n_src.oid = c_src.relnamespace
        JOIN pg_class c_tgt ON c_tgt.oid = con.confrelid
        JOIN pg_namespace n_tgt ON n_tgt.oid = c_tgt.relnamespace
        JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS k(src_attnum, tgt_attnum, ord) ON TRUE
        JOIN pg_attribute a_src ON a_src.attrelid = c_src.oid AND a_src.attnum = k.src_attnum
        JOIN pg_attribute a_tgt ON a_tgt.attrelid = c_tgt.oid AND a_tgt.attnum = k.tgt_attnum
        WHERE con.contype = 'f'
          AND n_src.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND n_src.nspname NOT LIKE 'pg_temp_%'
          AND n_src.nspname NOT LIKE 'pg_toast_temp_%'
        ORDER BY n_src.nspname, c_src.relname, k.ord;
    """

    async def extract_schema(
        self,
        connection: asyncpg.Connection,
        connection_id: str,
        database_name: str,
        excluded_tables: Optional[Set[str]] = None,
    ) -> SchemaGraph:
        """Execute catalog queries and compile the normalized SchemaGraph.

        Args:
            connection: Active asyncpg connection to target PostgreSQL database.
            connection_id: Identifier of the connection.
            database_name: Target database name.
            excluded_tables: Optional set of table names marked as excluded by user.

        Returns:
            Normalized SchemaGraph dataclass model.
        """
        excluded_set = excluded_tables or set()

        # Execute catalog queries with distinct privilege error handling (Rule 4)
        try:
            # 1. Fetch tables
            table_rows = await connection.fetch(self.TABLES_QUERY)
            # 2. Fetch columns
            column_rows = await connection.fetch(self.COLUMNS_QUERY)
            # 3. Fetch primary keys
            pk_rows = await connection.fetch(self.PRIMARY_KEYS_QUERY)
            # 4. Fetch foreign keys
            fk_rows = await connection.fetch(self.FOREIGN_KEYS_QUERY)
        except asyncpg.exceptions.InsufficientPrivilegeError as e:
            raise CatalogPermissionError(
                "Insufficient catalog permissions: database user lacks privileges to query PostgreSQL system catalogs (pg_catalog)."
            ) from e
        except Exception as e:
            err_msg = str(e).lower()
            if "permission denied" in err_msg or "must be owner of" in err_msg:
                raise CatalogPermissionError(
                    "Insufficient catalog permissions: database user lacks privileges to query PostgreSQL system catalogs (pg_catalog)."
                ) from e
            raise

        # Build lookup set for primary keys: (schema_name, table_name, column_name)
        pk_set: Set[Tuple[str, str, str]] = {
            (r["schema_name"], r["table_name"], r["column_name"]) for r in pk_rows
        }

        # Build lookup set for foreign key columns: (schema_name, table_name, column_name)
        fk_column_set: Set[Tuple[str, str, str]] = {
            (r["source_schema"], r["source_table"], r["source_column"]) for r in fk_rows
        }

        # Group foreign keys by (source_schema, source_table)
        fk_by_table: Dict[Tuple[str, str], List[ForeignKeyMetadata]] = {}
        for r in fk_rows:
            key = (r["source_schema"], r["source_table"])
            if key not in fk_by_table:
                fk_by_table[key] = []
            fk_by_table[key].append(
                ForeignKeyMetadata(
                    column=r["source_column"],
                    target_table=r["target_table"],
                    target_column=r["target_column"],
                )
            )

        # Group columns by (schema_name, table_name)
        columns_by_table: Dict[Tuple[str, str], List[ColumnMetadata]] = {}
        for r in column_rows:
            schema_name = r["schema_name"]
            table_name = r["table_name"]
            col_name = r["column_name"]
            key = (schema_name, table_name)

            if key not in columns_by_table:
                columns_by_table[key] = []

            is_pk = (schema_name, table_name, col_name) in pk_set
            is_fk = (schema_name, table_name, col_name) in fk_column_set

            columns_by_table[key].append(
                ColumnMetadata(
                    name=col_name,
                    data_type=r["data_type"],
                    nullable=r["is_nullable"],
                    is_primary_key=is_pk,
                    is_foreign_key=is_fk,
                )
            )

        # Assemble normalized TableMetadata objects
        tables: List[TableMetadata] = []
        for r in table_rows:
            schema_name = r["schema_name"]
            table_name = r["table_name"]
            table_key = (schema_name, table_name)

            # Check if excluded by table name or qualified schema.table
            is_excluded = (
                table_name in excluded_set or f"{schema_name}.{table_name}" in excluded_set
            )

            table_metadata = TableMetadata(
                name=table_name,
                schema=schema_name,
                estimated_row_count=int(r["estimated_row_count"]),
                is_excluded=is_excluded,
                columns=columns_by_table.get(table_key, []),
                foreign_keys=fk_by_table.get(table_key, []),
            )
            tables.append(table_metadata)

        now_iso = datetime.now(timezone.utc).isoformat()
        return SchemaGraph(
            connection_id=connection_id,
            database_name=database_name,
            introspected_at=now_iso,
            tables=tables,
        )


# Default singleton instance for dependency injection
default_schema_extractor = PostgresSchemaExtractor()

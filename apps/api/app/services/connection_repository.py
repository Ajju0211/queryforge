"""Repository for database connection persistence and schema caching.

Adheres to Single Responsibility Principle (SRP) by isolating database access
queries from business logic.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.connection import DatabaseConnection, SchemaCache, TablePreference


class ConnectionRepository:
    """Data access layer for internal database connection models.

    Single Responsibility:
        Executes SQLAlchemy queries for storing, updating, retrieving, and deleting
        connection records, schema caches, and table preferences.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize repository with an active SQLAlchemy AsyncSession.

        Args:
            session: AsyncSession bound to the internal database.
        """
        self.session = session

    async def create_connection_with_schema(
        self,
        name: str,
        host: str,
        port: int,
        database: str,
        username: str,
        encrypted_password: str,
        ssl_mode: str,
        status: str,
        schema_graph_dict: Dict[str, Any],
        custom_ca_cert: Optional[str] = None,
    ) -> Tuple[DatabaseConnection, SchemaCache]:
        """Atomically persist connection record and schema metadata in a single transaction (Rule 3).

        If any error occurs during persistence, rollback is executed to guarantee zero orphan records.
        """
        try:
            connection = DatabaseConnection(
                name=name,
                host=host,
                port=port,
                database=database,
                username=username,
                encrypted_password=encrypted_password,
                ssl_mode=ssl_mode,
                status=status,
                custom_ca_cert=custom_ca_cert,
            )
            self.session.add(connection)
            await self.session.flush()

            schema_cache = SchemaCache(
                connection_id=connection.id,
                database_name=database,
                schema_graph=schema_graph_dict,
            )
            self.session.add(schema_cache)
            await self.session.commit()
            await self.session.refresh(connection)
            await self.session.refresh(schema_cache)
            return connection, schema_cache
        except Exception:
            await self.session.rollback()
            raise

    async def create_connection(
        self,
        name: str,
        host: str,
        port: int,
        database: str,
        username: str,
        encrypted_password: str,
        ssl_mode: str,
        status: str,
        custom_ca_cert: Optional[str] = None,
    ) -> DatabaseConnection:
        """Create and persist a new DatabaseConnection record."""
        connection = DatabaseConnection(
            name=name,
            host=host,
            port=port,
            database=database,
            username=username,
            encrypted_password=encrypted_password,
            ssl_mode=ssl_mode,
            status=status,
            custom_ca_cert=custom_ca_cert,
        )
        self.session.add(connection)
        await self.session.commit()
        await self.session.refresh(connection)
        return connection

    async def get_by_id(self, connection_id: str) -> Optional[DatabaseConnection]:
        """Retrieve connection by its UUID string."""
        stmt = select(DatabaseConnection).where(DatabaseConnection.id == connection_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_name(self, name: str) -> Optional[DatabaseConnection]:
        """Find an existing connection with the same friendly name (case-insensitive)."""
        clean_name = name.strip()
        stmt = select(DatabaseConnection).where(
            func.lower(DatabaseConnection.name) == clean_name.lower()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_endpoint(
        self, host: str, port: int, database: str
    ) -> Optional[DatabaseConnection]:
        """Find an existing connection pointing to the same target database instance.

        Normalizes local host aliases (localhost, 127.0.0.1, 0.0.0.0) and database names.
        """
        clean_host = host.strip().lower()
        clean_db = database.strip().lower()
        local_aliases = {"localhost", "127.0.0.1", "0.0.0.0", "host.docker.internal"}

        if clean_host in local_aliases:
            stmt = select(DatabaseConnection).where(
                func.lower(DatabaseConnection.host).in_(local_aliases),
                DatabaseConnection.port == port,
                func.lower(DatabaseConnection.database) == clean_db,
            )
        else:
            stmt = select(DatabaseConnection).where(
                func.lower(DatabaseConnection.host) == clean_host,
                DatabaseConnection.port == port,
                func.lower(DatabaseConnection.database) == clean_db,
            )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self) -> List[DatabaseConnection]:
        """List all registered database connections ordered by creation date."""
        stmt = select(DatabaseConnection).order_by(DatabaseConnection.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_status(self, connection_id: str, status: str) -> Optional[DatabaseConnection]:
        """Update connection lifecycle status (e.g. ACTIVE, INTROSPECTION_FAILED)."""
        connection = await self.get_by_id(connection_id)
        if connection:
            connection.status = status
            await self.session.commit()
            await self.session.refresh(connection)
        return connection

    async def delete(self, connection_id: str) -> bool:
        """Delete connection record and associated schema caches."""
        connection = await self.get_by_id(connection_id)
        if not connection:
            return False
        await self.session.delete(connection)
        await self.session.commit()
        return True

    async def save_schema_cache(
        self, connection_id: str, database_name: str, schema_graph_dict: Dict[str, Any]
    ) -> SchemaCache:
        """Persist or update the discovered schema graph in cache."""
        stmt = select(SchemaCache).where(SchemaCache.connection_id == connection_id)
        result = await self.session.execute(stmt)
        cache = result.scalar_one_or_none()

        if cache:
            cache.database_name = database_name
            cache.schema_graph = schema_graph_dict
        else:
            cache = SchemaCache(
                connection_id=connection_id,
                database_name=database_name,
                schema_graph=schema_graph_dict,
            )
            self.session.add(cache)

        await self.session.commit()
        await self.session.refresh(cache)
        return cache

    async def get_schema_cache(self, connection_id: str) -> Optional[SchemaCache]:
        """Retrieve cached schema graph for a connection."""
        stmt = select(SchemaCache).where(SchemaCache.connection_id == connection_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_excluded_tables(self, connection_id: str) -> Set[str]:
        """Get set of excluded table names for a connection."""
        stmt = (
            select(TablePreference.table_name)
            .where(TablePreference.connection_id == connection_id)
            .where(TablePreference.is_excluded.is_(True))
        )
        result = await self.session.execute(stmt)
        return set(result.scalars().all())

    async def set_table_exclusion(
        self,
        connection_id: str,
        table_schema: str,
        table_name: str,
        is_excluded: bool,
    ) -> TablePreference:
        """Create or update table exclusion flag."""
        stmt = (
            select(TablePreference)
            .where(TablePreference.connection_id == connection_id)
            .where(TablePreference.table_schema == table_schema)
            .where(TablePreference.table_name == table_name)
        )
        result = await self.session.execute(stmt)
        pref = result.scalar_one_or_none()

        if pref:
            pref.is_excluded = is_excluded
        else:
            pref = TablePreference(
                connection_id=connection_id,
                table_schema=table_schema,
                table_name=table_name,
                is_excluded=is_excluded,
            )
            self.session.add(pref)

        await self.session.commit()
        await self.session.refresh(pref)
        return pref

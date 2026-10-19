"""Compatibility bridge for v1 database connections router.

Canonical location: app.routers.v1.connections
"""

from app.routers.v1.connections import (
    create_connection,
    delete_connection,
    get_connection,
    get_connection_schema,
    get_connection_service,
    list_connections,
    refresh_schema,
    router,
    test_connection,
    toggle_table_exclusion,
)

__all__ = [
    "router",
    "get_connection_service",
    "create_connection",
    "test_connection",
    "list_connections",
    "get_connection",
    "delete_connection",
    "get_connection_schema",
    "refresh_schema",
    "toggle_table_exclusion",
]

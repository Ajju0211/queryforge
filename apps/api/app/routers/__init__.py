"""FastAPI APIRouter modules for QueryForge AI.

Organized by API release version:
- app.routers.router.api_router: Master router mounting all version prefixes (/api/v1, /api/v2)
- app.routers.v1.router.v1_router: Version 1 router
"""

from app.routers.router import api_router
from app.routers.v1 import connections_router, get_connection_service, v1_router

__all__ = [
    "api_router",
    "v1_router",
    "connections_router",
    "get_connection_service",
]

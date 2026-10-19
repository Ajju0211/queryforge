"""Aggregation router for API Version 1 (v1).

Mounts all v1 domain routers (e.g. connections, future chat, write-actions).
"""

from fastapi import APIRouter
from app.routers.v1.connections import router as connections_router

v1_router = APIRouter()

# Mount connections router under /connections (resulting in /api/v1/connections)
v1_router.include_router(connections_router, prefix="/connections")

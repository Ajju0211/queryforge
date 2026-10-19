"""Master API router aggregating all versioned endpoints (/api/v1, future /api/v2)."""

from fastapi import APIRouter
from app.routers.v1.router import v1_router

api_router = APIRouter(prefix="/api")

# Mount Version 1 under /v1 -> /api/v1/...
api_router.include_router(v1_router, prefix="/v1")

# Future versions can be cleanly registered here:
# from app.routers.v2.router import v2_router
# api_router.include_router(v2_router, prefix="/v2")

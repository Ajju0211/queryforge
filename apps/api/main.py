"""QueryForge AI API entrypoint.

Exposes the FastAPI application instance for ASGI servers (Uvicorn).
"""

from app.main import app

__all__ = ["app"]

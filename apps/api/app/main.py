from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import api_router
from app.services.pool_manager import default_pool_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler to gracefully clean up target connection pools."""
    yield
    await default_pool_manager.close_all()


app = FastAPI(
    title="QueryForge AI API",
    description="Backend API for AI Database Workspace",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount master versioned API router (/api/v1, /api/v2, etc.)
app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "queryforge-ai-api",
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to QueryForge AI API",
        "docs_url": "/docs",
        "health_url": "/health",
    }

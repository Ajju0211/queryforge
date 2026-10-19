from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    LOG_LEVEL: str = "info"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Application Database (Internal State)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/queryforge_internal"

    # Security & Auth
    SECRET_KEY: str = "default-insecure-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ENCRYPTION_MASTER_KEY: Optional[str] = None
    ENCRYPTION_SECONDARY_KEYS: Optional[str] = None

    # Connection & Safeguards
    ALLOW_PRIVATE_NETWORKS: bool = True
    CUSTOMER_DB_CONNECT_TIMEOUT_SECONDS: int = 5
    STATEMENT_TIMEOUT_MS: int = 15000
    MAX_RESULT_ROWS: int = 500

    # AI Provider
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

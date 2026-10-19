"""SQLAlchemy ORM models for database connections, schema cache, and table preferences.

Single Source of Truth for internal application database persistence.
Never stores target customer rows; stores only encrypted credentials and schema metadata graphs.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON
from app.models.base import Base


class DatabaseConnection(Base):
    """Stores target database connection parameters and encrypted credentials.

    Passwords are encrypted at rest using Fernet symmetric encryption and never
    stored in plaintext.
    """

    __tablename__ = "database_connections"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        doc="Unique identifier for the connection (UUID4)",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="User-facing friendly name for the target database",
    )
    host: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Target hostname or IP address",
    )
    port: Mapped[int] = mapped_column(
        Integer,
        default=5432,
        nullable=False,
        doc="Target PostgreSQL port",
    )
    database: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Target PostgreSQL database name",
    )
    username: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Target PostgreSQL user name",
    )
    encrypted_password: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Fernet-encrypted ciphertext of the target database password",
    )
    ssl_mode: Mapped[str] = mapped_column(
        String(50),
        default="disable",
        nullable=False,
        doc="SSL mode (disable, prefer, require, verify-ca, verify-full)",
    )
    custom_ca_cert: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Optional PEM-formatted custom CA root certificate",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="PENDING_VERIFICATION",
        nullable=False,
        doc="Connection status (ACTIVE, INTROSPECTION_FAILED, UNREACHABLE, DISABLED)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Timestamp when connection was created",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp when connection was last updated",
    )

    # Relationships
    schema_cache: Mapped[Optional["SchemaCache"]] = relationship(
        "SchemaCache",
        back_populates="connection",
        uselist=False,
        cascade="all, delete-orphan",
    )
    table_preferences: Mapped[List["TablePreference"]] = relationship(
        "TablePreference",
        back_populates="connection",
        cascade="all, delete-orphan",
    )


class SchemaCache(Base):
    """Caches normalized schema graphs discovered from target PostgreSQL databases."""

    __tablename__ = "schema_caches"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    connection_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("database_connections.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        doc="Referenced database connection ID",
    )
    database_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Name of the target database introspected",
    )
    schema_graph: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        doc="Normalized JSON schema graph containing tables, columns, and relations",
    )
    introspected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Timestamp of the most recent schema introspection",
    )

    # Relationships
    connection: Mapped["DatabaseConnection"] = relationship(
        "DatabaseConnection",
        back_populates="schema_cache",
    )


class TablePreference(Base):
    """User-configured table visibility and inclusion preferences."""

    __tablename__ = "table_preferences"
    __table_args__ = (
        UniqueConstraint("connection_id", "table_schema", "table_name", name="uq_connection_table"),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    connection_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("database_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    table_schema: Mapped[str] = mapped_column(
        String(255),
        default="public",
        nullable=False,
    )
    table_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    is_excluded: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="If True, table is excluded from AI query generation context",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    connection: Mapped["DatabaseConnection"] = relationship(
        "DatabaseConnection",
        back_populates="table_preferences",
    )

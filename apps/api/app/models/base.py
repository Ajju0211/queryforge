"""SQLAlchemy declarative base and metadata for internal application DB."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all internal database models."""
    pass

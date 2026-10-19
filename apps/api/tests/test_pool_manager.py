"""Unit tests for ConnectionPoolManager SSL negotiation, error categorization, and credential redaction."""

import ssl
import pytest
import asyncpg
from app.schemas.connection import SSLMode
from app.services.pool_manager import (
    AuthenticationError,
    ConnectionPoolManager,
    ConnectionTargetError,
    DatabaseNotFoundError,
    HostUnreachableError,
    SSLNegotiationError,
)


def test_build_ssl_context_disable():
    manager = ConnectionPoolManager()
    ctx = manager.build_ssl_context(SSLMode.DISABLE)
    assert ctx is False


def test_build_ssl_context_require():
    manager = ConnectionPoolManager()
    ctx = manager.build_ssl_context(SSLMode.REQUIRE)
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.check_hostname is False


def test_build_ssl_context_verify_ca():
    manager = ConnectionPoolManager()
    ctx = manager.build_ssl_context(SSLMode.VERIFY_CA)
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.check_hostname is False
    assert ctx.verify_mode == ssl.CERT_REQUIRED


def test_build_ssl_context_verify_full():
    manager = ConnectionPoolManager()
    ctx = manager.build_ssl_context(SSLMode.VERIFY_FULL)
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.check_hostname is True
    assert ctx.verify_mode == ssl.CERT_REQUIRED


def test_categorize_error_authentication():
    manager = ConnectionPoolManager()
    cat, msg = manager.categorize_error(
        Exception("password authentication failed for user 'postgres'"),
        password="my_secret_pass",
    )
    assert cat == "authentication"
    assert "invalid username or password" in msg
    assert "my_secret_pass" not in msg


def test_categorize_error_ssl_mismatch():
    manager = ConnectionPoolManager()
    cat, msg = manager.categorize_error(
        Exception("SSL error: EOF detected during handshake"),
        password="my_secret_pass",
    )
    assert cat == "ssl_mismatch"
    assert "SSL/TLS handshake failed" in msg


def test_categorize_error_unreachable():
    manager = ConnectionPoolManager()
    cat, msg = manager.categorize_error(
        ConnectionRefusedError("Connection refused on port 5432"),
        password="my_secret_pass",
    )
    assert cat == "unreachable"
    assert "unreachable" in msg.lower()


def test_categorize_error_database_not_found():
    manager = ConnectionPoolManager()
    cat, msg = manager.categorize_error(
        Exception('database "nonexistent_db" does not exist'),
        password="my_secret_pass",
    )
    assert cat == "database_not_found"
    assert "does not exist" in msg


def test_sanitize_error_message_redacts_password_and_connection_string():
    manager = ConnectionPoolManager()
    raw_error = Exception("Error connecting to postgresql://user:secret_123@localhost:5432/db")
    cat, sanitized = manager.categorize_error(raw_error, password="secret_123")
    assert "secret_123" not in sanitized
    assert "postgresql://" not in sanitized


@pytest.mark.asyncio
async def test_test_connection_timeout():
    # Attempting to connect to an unreachable black-hole IP with a 1s timeout
    manager = ConnectionPoolManager(connect_timeout=1)
    # 192.0.2.1 is TEST-NET-1 (RFC 5737), which drops packets
    success, msg, latency, category = await manager.test_connection(
        host="192.0.2.1",
        port=5432,
        database="testdb",
        username="postgres",
        password="any_password",
    )
    assert success is False
    assert "timed out" in msg.lower() or "unreachable" in msg.lower()
    assert latency is None
    assert category == "unreachable"

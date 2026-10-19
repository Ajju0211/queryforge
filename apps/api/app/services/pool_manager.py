"""Connection pool manager for target PostgreSQL databases.

Adheres strictly to docs/architecture/database-connections.md (§2, §5.2, §5.4, §8):
- Rule 1: No credential persistence before validation.
- Rule 4: Distinct, actionable errors (authentication, unreachable, SSL mismatch, catalog permissions).
- Rule 5: Immediate resource cleanup on success and failure (try ... finally).
- Rule 6: Absolute error sanitization (no passwords, connection strings, or raw driver tracebacks).
"""

import asyncio
import logging
import ssl
import time
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict, Optional, Tuple, Union
import asyncpg
from app.core.config import settings
from app.schemas.connection import SSLMode

logger = logging.getLogger(__name__)


# ==============================================================================
# Distinct Actionable Target Connection Exceptions (Rule 4)
# ==============================================================================

class ConnectionTargetError(Exception):
    """Base exception for all target database connection failures."""
    def __init__(self, message: str, category: str = "general") -> None:
        super().__init__(message)
        self.message = message
        self.category = category


class AuthenticationError(ConnectionTargetError):
    """Raised when username or password authentication fails."""
    def __init__(
        self,
        message: str = "Authentication failed: invalid username or password for target database.",
    ) -> None:
        super().__init__(message, category="authentication")


class HostUnreachableError(ConnectionTargetError):
    """Raised when host is unreachable, DNS fails, or port is closed."""
    def __init__(
        self,
        message: str = "Target database is unreachable: verify host address, port, and network connectivity.",
    ) -> None:
        super().__init__(message, category="unreachable")


class SSLNegotiationError(ConnectionTargetError):
    """Raised when SSL/TLS handshake or certificate verification fails."""
    def __init__(
        self,
        message: str = "SSL/TLS handshake failed: verify the SSL mode (e.g. 'disable' for local or 'require' for cloud) or check custom CA certificate.",
    ) -> None:
        super().__init__(message, category="ssl_mismatch")


class DatabaseNotFoundError(ConnectionTargetError):
    """Raised when specified target database does not exist."""
    def __init__(self, database_name: str = "") -> None:
        detail = f"Database '{database_name}' does not exist on the target server." if database_name else "Target database does not exist on the server."
        super().__init__(detail, category="database_not_found")


# ==============================================================================
# ConnectionPoolManager
# ==============================================================================

class ConnectionPoolManager:
    """Manages asyncpg connections and pools for target PostgreSQL databases.

    Single Responsibility:
        Orchestrates target database connectivity, SSL negotiation, resource cleanup,
        and safe categorized error diagnostics.
    """

    def __init__(
        self,
        connect_timeout: Optional[int] = None,
        statement_timeout_ms: Optional[int] = None,
        max_pool_size: int = 5,
    ) -> None:
        """Initialize ConnectionPoolManager with timeout and pool size constraints.

        Args:
            connect_timeout: Connect timeout in seconds (default: settings.CUSTOMER_DB_CONNECT_TIMEOUT_SECONDS).
            statement_timeout_ms: Statement execution timeout in milliseconds (default: settings.STATEMENT_TIMEOUT_MS).
            max_pool_size: Maximum concurrent connections per database pool (default: 5).
        """
        self.connect_timeout = (
            connect_timeout
            if connect_timeout is not None
            else settings.CUSTOMER_DB_CONNECT_TIMEOUT_SECONDS
        )
        self.statement_timeout_ms = (
            statement_timeout_ms
            if statement_timeout_ms is not None
            else settings.STATEMENT_TIMEOUT_MS
        )
        self.max_pool_size = max_pool_size
        self._pools: Dict[str, asyncpg.Pool] = {}
        self._lock = asyncio.Lock()

    def build_ssl_context(
        self, ssl_mode: SSLMode, custom_ca_cert: Optional[str] = None
    ) -> Union[bool, ssl.SSLContext]:
        """Construct the appropriate Python SSLContext or bool flag for asyncpg.

        Args:
            ssl_mode: SSL negotiation mode (disable, prefer, require, verify-ca, verify-full).
            custom_ca_cert: Optional PEM certificate string for self-signed or custom CA roots.

        Returns:
            False for plaintext TCP; SSLContext instance for TLS connections.
        """
        if ssl_mode == SSLMode.DISABLE:
            return False

        # Create standard TLS client context with system CA certificates
        context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)

        # Load custom CA certificate if provided
        if custom_ca_cert and custom_ca_cert.strip():
            try:
                context.load_verify_locations(cadata=custom_ca_cert.strip())
            except Exception as e:
                raise SSLNegotiationError(f"Failed to load custom CA certificate: {e}") from e

        if ssl_mode in (SSLMode.REQUIRE, SSLMode.PREFER):
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE if not custom_ca_cert else ssl.CERT_REQUIRED
        elif ssl_mode == SSLMode.VERIFY_CA:
            context.check_hostname = False
            context.verify_mode = ssl.CERT_REQUIRED
        elif ssl_mode == SSLMode.VERIFY_FULL:
            context.check_hostname = True
            context.verify_mode = ssl.CERT_REQUIRED

        return context

    def categorize_error(
        self, error: Exception, password: Optional[str] = None
    ) -> Tuple[str, str]:
        """Categorize exception into distinct, actionable, safe error message (Rule 4 & 6).

        Guarantees:
            - Passwords, connection strings, and raw stack traces are never exposed.
            - Errors are classified into distinct categories:
              'authentication', 'unreachable', 'ssl_mismatch', 'database_not_found', 'general'.

        Args:
            error: Caught exception.
            password: Raw password to redact if present in error string.

        Returns:
            Tuple of (category: str, sanitized_actionable_message: str).
        """
        err_str = str(error).lower()

        # 1. Authentication failure
        if isinstance(
            error,
            (
                asyncpg.exceptions.InvalidPasswordError,
                asyncpg.exceptions.InvalidAuthorizationSpecificationError,
            ),
        ) or "password authentication failed" in err_str:
            return (
                "authentication",
                "Authentication failed: invalid username or password for target database.",
            )

        # 2. Database not found
        if isinstance(error, asyncpg.exceptions.InvalidCatalogNameError) or "database" in err_str and "does not exist" in err_str:
            return (
                "database_not_found",
                "Target database does not exist on the server.",
            )

        # 3. SSL / TLS Handshake failure
        if (
            isinstance(error, (ssl.SSLError, SSLNegotiationError))
            or "ssl" in err_str
            and any(w in err_str for w in ("eof", "handshake", "certificate", "protocol", "cipher", "alert", "rejected", "upgrade", "closed"))
        ):
            return (
                "ssl_mismatch",
                "SSL/TLS handshake failed: target PostgreSQL server rejected SSL. For local Docker databases, set SSL Mode to 'disable'. For cloud databases (Neon, Supabase), use 'require'.",
            )

        # 4. Unreachable / Timeout / Network refusal
        if isinstance(error, (asyncio.TimeoutError, TimeoutError)):
            return (
                "unreachable",
                f"Connection timed out after {self.connect_timeout} seconds: target host or port is unreachable.",
            )
        if (
            isinstance(error, (ConnectionRefusedError, ConnectionResetError, OSError, asyncpg.exceptions.ConnectionDoesNotExistError))
            or any(
                w in err_str
                for w in (
                    "connection refused",
                    "network is unreachable",
                    "no route to host",
                    "name or service not known",
                    "connection was closed in the middle of operation",
                    "closed in the middle of operation",
                    "connection reset by peer",
                )
            )
        ):
            return (
                "unreachable",
                "Target database is unreachable or connection was closed. For local Docker PostgreSQL, set SSL Mode to 'disable' and verify the container is running.",
            )

        # 5. Fallback safe sanitized message (Rule 6)
        sanitized = str(error)
        if password and password in sanitized:
            sanitized = sanitized.replace(password, "******")
        # Strip common connection string patterns if present
        if "postgresql://" in sanitized:
            sanitized = "Database driver encountered an unexpected error during connection."

        return ("general", f"Connection failed: {sanitized}")

    @asynccontextmanager
    async def open_temporary_connection(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_mode: SSLMode = SSLMode.DISABLE,
        custom_ca_cert: Optional[str] = None,
    ) -> AsyncGenerator[asyncpg.Connection, None]:
        """Open a temporary asyncpg connection with guaranteed closure on exit (Rule 5).

        Used during connection validation and schema onboarding so that no persistent
        pools or socket leaks occur before internal commit succeeds.

        Yields:
            Active asyncpg.Connection.

        Raises:
            ConnectionTargetError (AuthenticationError, HostUnreachableError, SSLNegotiationError, etc.)
        """
        ssl_ctx = self.build_ssl_context(ssl_mode, custom_ca_cert)
        conn: Optional[asyncpg.Connection] = None

        try:
            conn = await asyncio.wait_for(
                asyncpg.connect(
                    host=host,
                    port=port,
                    database=database,
                    user=username,
                    password=password,
                    ssl=ssl_ctx,
                    timeout=self.connect_timeout,
                    server_settings={"statement_timeout": str(self.statement_timeout_ms)},
                ),
                timeout=self.connect_timeout,
            )
            yield conn
        except Exception as e:
            # If mode is PREFER and SSL handshake failed, attempt plaintext fallback
            if ssl_mode == SSLMode.PREFER and ssl_ctx is not False:
                logger.info("SSLMode PREFER: attempting plaintext fallback connection.")
                try:
                    conn = await asyncio.wait_for(
                        asyncpg.connect(
                            host=host,
                            port=port,
                            database=database,
                            user=username,
                            password=password,
                            ssl=False,
                            timeout=self.connect_timeout,
                            server_settings={"statement_timeout": str(self.statement_timeout_ms)},
                        ),
                        timeout=self.connect_timeout,
                    )
                    yield conn
                    return
                except Exception as fallback_err:
                    cat, msg = self.categorize_error(fallback_err, password)
                    self._raise_typed_error(cat, msg)

            category, message = self.categorize_error(e, password)
            self._raise_typed_error(category, message)
        finally:
            # Rule 5: Guaranteed closure of temporary connection
            if conn is not None and not conn.is_closed():
                await conn.close()

    def _raise_typed_error(self, category: str, message: str) -> None:
        """Helper to raise distinct typed exceptions based on error category."""
        if category == "authentication":
            raise AuthenticationError(message)
        elif category == "unreachable":
            raise HostUnreachableError(message)
        elif category == "ssl_mismatch":
            raise SSLNegotiationError(message)
        elif category == "database_not_found":
            raise DatabaseNotFoundError()
        else:
            raise ConnectionTargetError(message, category=category)

    async def test_connection(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_mode: SSLMode = SSLMode.DISABLE,
        custom_ca_cert: Optional[str] = None,
    ) -> Tuple[bool, str, Optional[float], Optional[str]]:
        """Perform an ad-hoc connectivity and authentication test against target PostgreSQL.

        Executes a 5-second bounded connection attempt and runs 'SELECT 1'.
        Releases the temporary connection immediately in all cases (Rule 5).

        Returns:
            Tuple of (success: bool, message: str, latency_ms: Optional[float], category: Optional[str]).
        """
        start_time = time.perf_counter()

        try:
            async with self.open_temporary_connection(
                host=host,
                port=port,
                database=database,
                username=username,
                password=password,
                ssl_mode=ssl_mode,
                custom_ca_cert=custom_ca_cert,
            ) as conn:
                await conn.fetchval("SELECT 1;")
                latency_ms = (time.perf_counter() - start_time) * 1000.0
                return True, "Successfully connected to target database.", round(latency_ms, 2), None
        except ConnectionTargetError as target_err:
            return False, target_err.message, None, target_err.category
        except Exception as e:
            cat, msg = self.categorize_error(e, password)
            return False, msg, None, cat

    async def get_or_create_pool(
        self,
        connection_id: str,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_mode: SSLMode = SSLMode.DISABLE,
        custom_ca_cert: Optional[str] = None,
    ) -> asyncpg.Pool:
        """Retrieve existing cached pool or create a new bounded connection pool.

        Used only for committed, active connections.
        """
        async with self._lock:
            existing = self._pools.get(connection_id)
            if existing is not None and not existing._closed:
                return existing

            ssl_ctx = self.build_ssl_context(ssl_mode, custom_ca_cert)

            try:
                pool = await asyncio.wait_for(
                    asyncpg.create_pool(
                        host=host,
                        port=port,
                        database=database,
                        user=username,
                        password=password,
                        ssl=ssl_ctx,
                        min_size=1,
                        max_size=self.max_pool_size,
                        timeout=self.connect_timeout,
                        command_timeout=self.statement_timeout_ms / 1000.0,
                        server_settings={"statement_timeout": str(self.statement_timeout_ms)},
                    ),
                    timeout=self.connect_timeout,
                )
                self._pools[connection_id] = pool
                return pool
            except Exception as e:
                cat, msg = self.categorize_error(e, password)
                self._raise_typed_error(cat, msg)
                raise ConnectionTargetError(msg, category=cat) from e

    @asynccontextmanager
    async def acquire_connection(
        self,
        connection_id: str,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        ssl_mode: SSLMode = SSLMode.DISABLE,
        custom_ca_cert: Optional[str] = None,
    ) -> AsyncGenerator[asyncpg.Connection, None]:
        """Context manager to safely acquire a connection from the pool."""
        pool = await self.get_or_create_pool(
            connection_id=connection_id,
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
            ssl_mode=ssl_mode,
            custom_ca_cert=custom_ca_cert,
        )
        async with pool.acquire() as connection:
            yield connection

    async def close_pool(self, connection_id: str) -> None:
        """Close and remove cached connection pool for a specific connection (Rule 5)."""
        async with self._lock:
            pool = self._pools.pop(connection_id, None)
            if pool and not pool._closed:
                await pool.close()

    async def close_all(self) -> None:
        """Gracefully terminate all active target connection pools on application shutdown."""
        async with self._lock:
            for pool in self._pools.values():
                if not pool._closed:
                    await pool.close()
            self._pools.clear()


# Default singleton pool manager instance for dependency injection
default_pool_manager = ConnectionPoolManager()

"""Cryptographic vault for encrypting sensitive credentials at rest using Fernet.

Adheres to QueryForge AI architecture:
- AES-128-CBC + HMAC-SHA256 authenticated encryption via cryptography.fernet.Fernet.
- MultiFernet key rotation using ENCRYPTION_MASTER_KEY and ENCRYPTION_SECONDARY_KEYS.
- Strict zero-exposure of plaintext credentials in logs or responses.
"""

import base64
import hashlib
import logging
from typing import List, Optional
from cryptography.fernet import Fernet, MultiFernet, InvalidToken
from app.core.config import settings

logger = logging.getLogger(__name__)


class CryptoError(Exception):
    """Raised when encryption, decryption, or key validation fails."""
    pass


class CryptoVault:
    """Manages symmetric credential encryption and key rotation using Fernet.

    Single Responsibility:
        Guarantees that database passwords and sensitive API keys are encrypted at
        rest and decrypted only dynamically in memory during query execution.
    """

    def __init__(
        self,
        master_key: Optional[str] = None,
        secondary_keys: Optional[str] = None,
    ) -> None:
        """Initialize CryptoVault with master and optional secondary rotation keys.

        Args:
            master_key: Primary base64-encoded 32-byte Fernet key.
            secondary_keys: Optional comma-separated secondary keys for MultiFernet rotation.
        """
        raw_master = master_key if master_key is not None else settings.ENCRYPTION_MASTER_KEY
        raw_secondary = (
            secondary_keys if secondary_keys is not None else settings.ENCRYPTION_SECONDARY_KEYS
        )

        self._fernet_instance = self._build_fernet(raw_master, raw_secondary)

    def _build_fernet(
        self, master_key: Optional[str], secondary_keys: Optional[str]
    ) -> MultiFernet:
        """Construct a MultiFernet instance from configured keys.

        If master_key is not set, derives a deterministic development key from
        settings.SECRET_KEY to prevent startup crashes during local development.

        Args:
            master_key: String representation of the master Fernet key.
            secondary_keys: Optional comma-separated list of previous Fernet keys.

        Returns:
            Configured MultiFernet instance.
        """
        fernets: List[Fernet] = []

        # 1. Prepare master Fernet key
        if master_key and master_key.strip():
            key_bytes = master_key.strip().encode("utf-8")
            try:
                fernets.append(Fernet(key_bytes))
            except Exception as e:
                raise CryptoError(f"Invalid ENCRYPTION_MASTER_KEY format: {e}") from e
        else:
            # Fallback for local development: derive 32-byte key from SECRET_KEY
            logger.warning(
                "ENCRYPTION_MASTER_KEY not set. Deriving dev encryption key from SECRET_KEY. "
                "Set ENCRYPTION_MASTER_KEY in production!"
            )
            derived = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
            dev_key = base64.urlsafe_b64encode(derived)
            fernets.append(Fernet(dev_key))

        # 2. Append secondary rotation keys if provided
        if secondary_keys and secondary_keys.strip():
            for raw_k in secondary_keys.split(","):
                k = raw_k.strip()
                if k:
                    try:
                        fernets.append(Fernet(k.encode("utf-8")))
                    except Exception as e:
                        logger.error(f"Skipping invalid secondary encryption key: {e}")

        return MultiFernet(fernets)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a plaintext string into a base64 ciphertext token.

        Args:
            plaintext: Sensitive string (e.g., database password).

        Returns:
            Encrypted URL-safe base64 string.

        Raises:
            CryptoError: If encryption fails.
        """
        if not plaintext:
            return ""
        try:
            ciphertext_bytes = self._fernet_instance.encrypt(plaintext.encode("utf-8"))
            return ciphertext_bytes.decode("utf-8")
        except Exception as e:
            raise CryptoError(f"Failed to encrypt credential: {e}") from e

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a base64 ciphertext token back into plaintext.

        Args:
            ciphertext: Encrypted token produced by encrypt().

        Returns:
            Decrypted plaintext string.

        Raises:
            CryptoError: If token is invalid, corrupted, or cannot be decrypted.
        """
        if not ciphertext:
            return ""
        try:
            decrypted_bytes = self._fernet_instance.decrypt(ciphertext.encode("utf-8"))
            return decrypted_bytes.decode("utf-8")
        except InvalidToken as e:
            raise CryptoError("Failed to decrypt credential: invalid token or wrong key.") from e
        except Exception as e:
            raise CryptoError(f"Decryption error: {e}") from e

    def rotate(self, ciphertext: str) -> str:
        """Re-encrypt ciphertext with the current master key.

        Useful for zero-downtime key rotation when updating ENCRYPTION_MASTER_KEY.

        Args:
            ciphertext: Token encrypted with an older secondary key.

        Returns:
            New token re-encrypted with the current primary master key.
        """
        if not ciphertext:
            return ""
        try:
            rotated_bytes = self._fernet_instance.rotate(ciphertext.encode("utf-8"))
            return rotated_bytes.decode("utf-8")
        except Exception as e:
            raise CryptoError(f"Key rotation failed: {e}") from e


# Shared singleton instance for application-wide use
default_crypto_vault = CryptoVault()
crypto_vault = default_crypto_vault


# ==============================================================================
# Module-Level Convenience Functions (Rule: Shared Easy-to-use API)
# ==============================================================================

def encrypt(plaintext: str) -> str:
    """Encrypt a sensitive string using the shared application CryptoVault.

    Can be imported anywhere in the project:
        from app.core.security import encrypt

    Args:
        plaintext: Sensitive string (e.g. DB password, AI API key).

    Returns:
        URL-safe base64 encrypted ciphertext token.
    """
    return crypto_vault.encrypt(plaintext)


def decrypt(ciphertext: str) -> str:
    """Decrypt a ciphertext token back into plaintext using the shared CryptoVault.

    Can be imported anywhere in the project:
        from app.core.security import decrypt

    Args:
        ciphertext: Encrypted token produced by encrypt().

    Returns:
        Decrypted plaintext string.
    """
    return crypto_vault.decrypt(ciphertext)


def rotate(ciphertext: str) -> str:
    """Re-encrypt ciphertext using the current primary master key.

    Can be imported anywhere in the project:
        from app.core.security import rotate

    Args:
        ciphertext: Token encrypted with an older secondary key.

    Returns:
        New token re-encrypted with current master key.
    """
    return crypto_vault.rotate(ciphertext)

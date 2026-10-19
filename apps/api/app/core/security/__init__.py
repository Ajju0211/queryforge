"""Security, encryption, and cryptographic helpers for QueryForge AI.

Provides the shared application-wide encryption layer:
- CryptoVault: Class managing Fernet symmetric encryption and key rotation.
- crypto_vault: Shared singleton instance.
- encrypt(plaintext): Shared helper function to encrypt sensitive strings.
- decrypt(ciphertext): Shared helper function to decrypt ciphertext tokens.
- rotate(ciphertext): Shared helper function for key rotation.
- CryptoError: Exception raised on cryptographic failure.
"""

from app.core.security.crypto import (
    CryptoError,
    CryptoVault,
    crypto_vault,
    default_crypto_vault,
    decrypt,
    encrypt,
    rotate,
)

__all__ = [
    "CryptoError",
    "CryptoVault",
    "crypto_vault",
    "default_crypto_vault",
    "encrypt",
    "decrypt",
    "rotate",
]

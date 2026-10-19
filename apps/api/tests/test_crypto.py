"""Unit tests for CryptoVault credential encryption and key rotation."""

import pytest
from cryptography.fernet import Fernet
from app.core.security.crypto import CryptoError, CryptoVault


def test_crypto_vault_roundtrip():
    vault = CryptoVault()
    secret = "my_super_secret_db_pass_123!"
    ciphertext = vault.encrypt(secret)
    assert ciphertext != secret
    decrypted = vault.decrypt(ciphertext)
    assert decrypted == secret


def test_crypto_vault_explicit_key():
    key = Fernet.generate_key().decode("utf-8")
    vault = CryptoVault(master_key=key)
    secret = "production_password_xyz"
    ciphertext = vault.encrypt(secret)
    assert vault.decrypt(ciphertext) == secret


def test_crypto_vault_invalid_token():
    vault = CryptoVault()
    with pytest.raises(CryptoError):
        vault.decrypt("not_a_valid_fernet_token")


def test_crypto_vault_empty_string():
    vault = CryptoVault()
    assert vault.encrypt("") == ""
    assert vault.decrypt("") == ""


def test_crypto_vault_key_rotation():
    old_key = Fernet.generate_key().decode("utf-8")
    new_key = Fernet.generate_key().decode("utf-8")

    # Vault with old key
    old_vault = CryptoVault(master_key=old_key)
    ciphertext_old = old_vault.encrypt("rotate_me_safely")

    # Vault with new key as primary and old key as secondary
    rotated_vault = CryptoVault(master_key=new_key, secondary_keys=old_key)
    # Should decrypt cleanly using the secondary key
    assert rotated_vault.decrypt(ciphertext_old) == "rotate_me_safely"

    # Re-encrypt with new primary key
    new_ciphertext = rotated_vault.rotate(ciphertext_old)
    # The pure new vault can now decrypt it
    pure_new_vault = CryptoVault(master_key=new_key)
    assert pure_new_vault.decrypt(new_ciphertext) == "rotate_me_safely"


def test_shared_module_level_encrypt_decrypt():
    """Verify shared functions imported from app.core and app.core.security work seamlessly."""
    from app.core import encrypt as core_encrypt, decrypt as core_decrypt
    from app.core.security import encrypt as sec_encrypt, decrypt as sec_decrypt, crypto_vault

    secret = "gemini_api_key_secret_12345"
    token = core_encrypt(secret)
    assert token != secret
    assert core_decrypt(token) == secret
    assert sec_decrypt(token) == secret
    assert crypto_vault.decrypt(token) == secret

"""Unit tests for NetworkGuard SSRF and cloud metadata defense."""

import pytest
from app.utils.network_guard import NetworkGuard, SecurityError


@pytest.mark.asyncio
async def test_network_guard_permits_localhost_in_self_hosted():
    guard = NetworkGuard(allow_private_networks=True)
    ips = await guard.validate_host("127.0.0.1")
    assert "127.0.0.1" in ips


@pytest.mark.asyncio
async def test_network_guard_blocks_cloud_metadata_169_254_169_254():
    guard = NetworkGuard(allow_private_networks=True)
    with pytest.raises(SecurityError) as exc_info:
        await guard.validate_host("169.254.169.254")
    assert "cloud instance metadata" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_network_guard_blocks_link_local_addresses():
    guard = NetworkGuard(allow_private_networks=True)
    with pytest.raises(SecurityError) as exc_info:
        await guard.validate_host("169.254.1.20")
    assert "link-local" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_network_guard_blocks_private_when_disallowed():
    guard = NetworkGuard(allow_private_networks=False)
    with pytest.raises(SecurityError) as exc_info:
        await guard.validate_host("192.168.1.100")
    assert "disabled" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_network_guard_empty_host_raises_value_error():
    guard = NetworkGuard()
    with pytest.raises(ValueError):
        await guard.validate_host("   ")

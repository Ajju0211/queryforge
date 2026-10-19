"""Network guard utility for target host validation and SSRF prevention.

Adheres to QueryForge AI's self-hosted architecture specification:
- Permits loopback, Docker bridge, and local LAN subnets when ALLOW_PRIVATE_NETWORKS=True.
- Hardened protection that strictly blocks cloud instance metadata services (169.254.169.254 / link-local).
"""

import asyncio
import ipaddress
import socket
from typing import List, Optional
from app.core.config import settings


class SecurityError(Exception):
    """Raised when a network safety or security invariant is violated."""
    pass


class NetworkGuard:
    """Validates hostnames and destination IP addresses against SSRF policies.

    Single Responsibility:
        Guarantees that outbound database connections cannot reach dangerous internal
        infrastructure, such as cloud instance metadata endpoints (169.254.169.254),
        while safely allowing local/LAN databases per the self-hosted developer model.
    """

    # Hazardous cloud provider metadata endpoints (AWS EC2, GCP, Azure, DigitalOcean)
    CLOUD_METADATA_IP = ipaddress.ip_address("169.254.169.254")

    # Link-local address blocks (IPv4: 169.254.0.0/16, IPv6: fe80::/10)
    LINK_LOCAL_V4 = ipaddress.ip_network("169.254.0.0/16")
    LINK_LOCAL_V6 = ipaddress.ip_network("fe80::/10")

    def __init__(self, allow_private_networks: Optional[bool] = None) -> None:
        """Initialize NetworkGuard with network access policy.

        Args:
            allow_private_networks: If True, permits localhost and RFC 1918 LAN IPs.
                                    Defaults to settings.ALLOW_PRIVATE_NETWORKS.
        """
        self.allow_private_networks = (
            allow_private_networks
            if allow_private_networks is not None
            else settings.ALLOW_PRIVATE_NETWORKS
        )

    async def validate_host(self, host: str, port: int = 5432) -> List[str]:
        """Resolve host and verify all resolved IP addresses against SSRF policies.

        Args:
            host: Hostname, FQDN, or raw IP string to validate.
            port: Destination port number (defaults to 5432).

        Returns:
            List of validated IP address strings resolved for the host.

        Raises:
            SecurityError: If host points to cloud metadata or prohibited private networks.
            ValueError: If the host cannot be resolved via DNS.
        """
        host_str = host.strip()
        if not host_str:
            raise ValueError("Host cannot be empty")

        # 1. Resolve host asynchronously through system DNS resolver
        resolved_ips: List[str] = []
        try:
            loop = asyncio.get_running_loop()
            addr_info = await loop.getaddrinfo(
                host_str,
                port,
                family=socket.AF_UNSPEC,
                type=socket.SOCK_STREAM,
            )
            for item in addr_info:
                sockaddr = item[4]
                ip_str = sockaddr[0]
                if ip_str not in resolved_ips:
                    resolved_ips.append(ip_str)
        except socket.gaierror as e:
            # Special handling: in Docker environments, host.docker.internal might only
            # resolve inside container runtime. If running outside, raise clear error.
            raise ValueError(f"Unable to resolve host '{host_str}': {e}") from e

        if not resolved_ips:
            raise ValueError(f"No IP addresses found for host '{host_str}'")

        # 2. Inspect each resolved IP against security guardrails
        for ip_str in resolved_ips:
            self._check_ip_safety(ip_str, host_str)

        return resolved_ips

    def _check_ip_safety(self, ip_str: str, original_host: str) -> None:
        """Inspect an individual IP address against security boundaries.

        Args:
            ip_str: Resolved IP address string.
            original_host: Original host string provided by the user (for reporting).

        Raises:
            SecurityError: If IP violates cloud metadata or network policies.
        """
        ip = ipaddress.ip_address(ip_str)

        # Invariant 1: Cloud metadata service is ALWAYS blocked (SSRF defense)
        if ip == self.CLOUD_METADATA_IP:
            raise SecurityError(
                f"Prohibited destination: '{original_host}' resolves to "
                f"cloud instance metadata address {ip_str}."
            )

        # Invariant 2: Link-local addresses are always blocked
        if (ip.version == 4 and ip in self.LINK_LOCAL_V4) or (
            ip.version == 6 and ip in self.LINK_LOCAL_V6
        ):
            raise SecurityError(
                f"Prohibited destination: '{original_host}' resolves to "
                f"link-local address {ip_str}."
            )

        # Invariant 3: Private networks / loopback policy check
        if not self.allow_private_networks:
            if ip.is_loopback or ip.is_private:
                raise SecurityError(
                    f"Access to private/local network address {ip_str} is disabled "
                    f"(ALLOW_PRIVATE_NETWORKS=false)."
                )


# Default singleton instance for dependency injection
default_network_guard = NetworkGuard()

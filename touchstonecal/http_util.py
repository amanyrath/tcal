"""Shared helpers for the HTTP layer (serverless handlers and CLI server).

Kept dependency-free so the package stays stdlib-only.
"""

from __future__ import annotations

import os

MIN_DAYS = 1
MAX_DAYS = 90


class BadRequest(ValueError):
    """Invalid client input. Handlers should map this to an HTTP 400."""


def env_int(name: str, default: int) -> int:
    """Read an int env var, falling back to ``default`` if unset or malformed."""
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def clamp_days(days: int) -> int:
    return max(MIN_DAYS, min(MAX_DAYS, days))


def default_days() -> int:
    return clamp_days(env_int("DAYS_AHEAD", 90))


def parse_days(value: str | None, *, default: int | None = None) -> int:
    """Parse an untrusted ``days`` value, clamping to [MIN_DAYS, MAX_DAYS].

    Raises :class:`BadRequest` if the value is present but not an integer.
    """
    if value is None or value == "":
        return clamp_days(default if default is not None else default_days())
    try:
        days = int(value)
    except (TypeError, ValueError):
        raise BadRequest(f"Invalid 'days' parameter: {value!r}")
    return clamp_days(days)


def allowed_hosts() -> set[str]:
    """Hosts permitted in generated absolute URLs, from ``ALLOWED_HOSTS`` env.

    Comma-separated. Empty means "trust the request host" (legacy behavior).
    """
    raw = os.environ.get("ALLOWED_HOSTS", "")
    return {host.strip().lower() for host in raw.split(",") if host.strip()}


def resolve_base_url(
    *,
    forwarded_host: str | None,
    host: str | None,
    proto: str | None,
) -> str:
    """Build a base URL, guarding against Host header injection.

    When ``ALLOWED_HOSTS`` is set, an untrusted host that is not on the
    allowlist is replaced by the first configured host.
    """
    candidate = (forwarded_host or host or "").split(",")[0].strip()
    allowlist = allowed_hosts()
    if allowlist and candidate.lower() not in allowlist:
        candidate = sorted(allowlist)[0]
    if not candidate:
        candidate = "localhost"
    scheme = proto if proto in ("http", "https") else "https"
    return f"{scheme}://{candidate}"

"""Optional cross-instance snapshot store.

Default is an in-memory no-op (keeps the package dependency-free). If
``REDIS_URL`` is set and the optional ``redis`` package is installed, snapshots
are shared across serverless instances so a cold start can reuse a warm feed
instead of refetching all gyms.
"""

from __future__ import annotations

import gzip
import json
import logging
import os
from dataclasses import asdict
from typing import Protocol

from .api import CalendarEvent

logger = logging.getLogger(__name__)

_KEY_PREFIX = "touchstonecal:snapshot:"


def compress_snapshot(events: list[CalendarEvent], updated_at: float, errors: dict[str, str]) -> bytes:
    """Serialize + gzip a snapshot. JSON here compresses to roughly 8% of raw,
    which keeps all-gyms 30-day payloads well under free-tier value-size limits."""
    return gzip.compress(snapshot_to_json(events, updated_at, errors).encode("utf-8"), compresslevel=6)


def decompress_snapshot(blob: bytes) -> tuple[list[CalendarEvent], float, dict[str, str]]:
    return snapshot_from_json(gzip.decompress(blob).decode("utf-8"))


def snapshot_to_json(events: list[CalendarEvent], updated_at: float, errors: dict[str, str]) -> str:
    return json.dumps(
        {
            "events": [asdict(event) for event in events],
            "updated_at": updated_at,
            "errors": errors,
        }
    )


def snapshot_from_json(raw: str) -> tuple[list[CalendarEvent], float, dict[str, str]]:
    data = json.loads(raw)
    events = [CalendarEvent(**item) for item in data.get("events", [])]
    return events, float(data.get("updated_at", 0.0)), dict(data.get("errors", {}))


class SnapshotStore(Protocol):
    def load(self, key: str) -> tuple[list[CalendarEvent], float, dict[str, str]] | None: ...

    def save(
        self, key: str, events: list[CalendarEvent], updated_at: float, errors: dict[str, str]
    ) -> None: ...


class NullStore:
    """No-op store used when no shared backend is configured."""

    def load(self, key: str):
        return None

    def save(self, key, events, updated_at, errors) -> None:
        return None


class RedisStore:
    def __init__(self, client, *, ttl_seconds: int) -> None:
        self._client = client
        self._ttl = ttl_seconds

    def load(self, key: str):
        try:
            raw = self._client.get(f"{_KEY_PREFIX}{key}")
        except Exception as exc:  # noqa: BLE001 - never let cache backend break requests
            logger.warning("Redis load failed: %s", exc)
            return None
        if not raw:
            return None
        if isinstance(raw, str):
            raw = raw.encode("latin-1")
        try:
            return decompress_snapshot(raw)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Corrupt snapshot in Redis: %s", exc)
            return None

    def save(self, key, events, updated_at, errors) -> None:
        try:
            payload = compress_snapshot(events, updated_at, errors)
            self._client.set(f"{_KEY_PREFIX}{key}", payload, ex=self._ttl)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis save failed: %s", exc)


def build_store(*, ttl_seconds: int) -> SnapshotStore:
    # REDIS_URL is standard; KV_URL is what Vercel's KV/Upstash integration injects.
    url = os.environ.get("REDIS_URL") or os.environ.get("KV_URL")
    if not url:
        return NullStore()
    try:
        import redis  # guarded optional import
    except ImportError:
        logger.warning("REDIS_URL is set but the 'redis' package is not installed; using in-memory cache only")
        return NullStore()
    try:
        client = redis.from_url(url)
        return RedisStore(client, ttl_seconds=ttl_seconds)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to init Redis store (%s); using in-memory cache only", exc)
        return NullStore()

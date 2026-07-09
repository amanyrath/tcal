from __future__ import annotations

import threading
import time

from .api import fetch_events_report
from .config import active_gyms, active_gyms_scope
from .http_util import clamp_days, env_int
from .store import build_store

DEFAULT_DAYS_AHEAD = clamp_days(env_int("DAYS_AHEAD", 90))
CACHE_TTL_SECONDS = env_int("CACHE_TTL_SECONDS", 3600)

# Single-flight guard: prevents a cold instance from launching many concurrent
# full fetches (cache stampede) when several requests arrive at once.
_refresh_lock = threading.Lock()

# Optional cross-instance snapshot store (Redis if REDIS_URL is set, else no-op).
_shared_store = build_store(ttl_seconds=CACHE_TTL_SECONDS + 86400)

_store: dict[str, object] = {
    "events": [],
    "updated_at": 0.0,
    "days_ahead": DEFAULT_DAYS_AHEAD,
    "errors": {},
}


def _is_fresh(days: int, now: float) -> bool:
    return (
        bool(_store["events"])
        and int(_store["days_ahead"]) == days
        and now - float(_store["updated_at"]) < CACHE_TTL_SECONDS
    )


def _remember(events: list, updated_at: float, days: int, errors: dict) -> None:
    _store["events"] = events
    _store["updated_at"] = updated_at
    _store["days_ahead"] = days
    _store["errors"] = errors


def get_cached_events(*, days_ahead: int | None = None, force: bool = False) -> tuple[list, float]:
    days = days_ahead or DEFAULT_DAYS_AHEAD
    now = time.time()

    if not force and _is_fresh(days, now):
        return _store["events"], float(_store["updated_at"])

    with _refresh_lock:
        # Re-check: another thread may have refreshed while we waited for the lock.
        now = time.time()
        if not force and _is_fresh(days, now):
            return _store["events"], float(_store["updated_at"])

        # Shared-cache key is namespaced by the active gym set so deployments
        # serving different subsets never collide on the same backend.
        cache_key = f"{days}:{active_gyms_scope()}"

        # Try a warm snapshot shared across instances before hitting upstream.
        if not force:
            shared = _shared_store.load(cache_key)
            if shared is not None:
                events, updated_at, errors = shared
                if events and now - updated_at < CACHE_TTL_SECONDS:
                    _remember(events, updated_at, days, errors)
                    return events, updated_at

        report = fetch_events_report(list(active_gyms()), days_ahead=days, parallel=True)

        if report.errors and not report.events:
            # Total upstream failure. Serve stale data if we have any; else surface it.
            _store["errors"] = report.errors
            if _store["events"]:
                return _store["events"], float(_store["updated_at"])
            raise RuntimeError(
                "; ".join(f"{key}: {msg}" for key, msg in report.errors.items())
            )

        _remember(report.events, now, days, report.errors)
        _shared_store.save(cache_key, report.events, now, report.errors)
        return report.events, now


def get_last_errors() -> dict[str, str]:
    return dict(_store.get("errors", {}))  # type: ignore[arg-type]


def get_health() -> dict:
    updated_at = float(_store["updated_at"])
    events = _store["events"]
    return {
        "status": "ok" if events else "empty",
        "eventCount": len(events),  # type: ignore[arg-type]
        "updatedAt": updated_at or None,
        "ageSeconds": (time.time() - updated_at) if updated_at else None,
        "cacheTtlSeconds": CACHE_TTL_SECONDS,
        "errors": get_last_errors(),
    }

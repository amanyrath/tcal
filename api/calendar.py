from __future__ import annotations

import logging
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from touchstonecal.cache import CACHE_TTL_SECONDS, get_cached_events
from touchstonecal.filters import (
    calendar_name_for_filters,
    filter_events,
    parse_event_filters,
)
from touchstonecal.http_util import BadRequest, parse_days
from touchstonecal.ical import events_to_ics
from touchstonecal.observability import init_observability

init_observability()
logger = logging.getLogger(__name__)


def _cache_control() -> str:
    return f"public, s-maxage={CACHE_TTL_SECONDS}, stale-while-revalidate=86400"


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        try:
            days_ahead = parse_days(params.get("days", [None])[0])
        except BadRequest as exc:
            self.send_error(400, explain=str(exc))
            return
        force = params.get("warm", ["0"])[0] == "1"

        try:
            events, updated_at = get_cached_events(days_ahead=days_ahead, force=force)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to build calendar feed")
            self.send_error(502, explain=str(exc))
            return

        filters = parse_event_filters(parsed.query)
        filtered = filter_events(events, filters)
        calendar_name = calendar_name_for_filters(
            filters,
            base_name="Touchstone Climbing (All Gyms)",
        )
        ics = events_to_ics(
            filtered,
            calendar_name=calendar_name,
            refresh_minutes=max(1, CACHE_TTL_SECONDS // 60),
        )
        body = ics.encode("utf-8")
        updated = datetime.fromtimestamp(updated_at, tz=timezone.utc)

        self.send_response(200)
        self.send_header("Content-Type", "text/calendar; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", _cache_control())
        self.send_header("Last-Modified", updated.strftime("%a, %d %b %Y %H:%M:%S GMT"))
        self.end_headers()
        self.wfile.write(body)

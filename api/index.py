from __future__ import annotations

import logging
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from touchstonecal.cache import CACHE_TTL_SECONDS, get_cached_events
from touchstonecal.filters import render_status_page
from touchstonecal.http_util import BadRequest, parse_days, resolve_base_url
from touchstonecal.observability import init_observability

init_observability()
logger = logging.getLogger(__name__)


def _request_base_url(handler: BaseHTTPRequestHandler) -> str:
    return resolve_base_url(
        forwarded_host=handler.headers.get("x-forwarded-host"),
        host=handler.headers.get("Host"),
        proto=handler.headers.get("x-forwarded-proto", "https"),
    )


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
            logger.exception("Failed to render status page")
            self.send_error(502, explain=str(exc))
            return

        updated = datetime.fromtimestamp(updated_at, tz=timezone.utc).isoformat()
        body = render_status_page(
            events,
            base_url=_request_base_url(self),
            updated_at=updated,
            refresh_seconds=CACHE_TTL_SECONDS,
        ).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", f"public, s-maxage={CACHE_TTL_SECONDS}")
        self.end_headers()
        self.wfile.write(body)

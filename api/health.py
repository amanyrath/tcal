from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler

from touchstonecal.cache import get_health
from touchstonecal.observability import init_observability

init_observability()


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        # Reports cache freshness only; never triggers an upstream fetch.
        body = json.dumps(get_health()).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .api import CalendarEvent, fetch_events
from .config import ALL_GYMS, ALL_GYMS_KEY, DEFAULT_GYM, GYM_PRESETS, GymConfig
from .filters import (
    EventFilters,
    calendar_name_for_filters,
    filter_events,
    parse_event_filters,
    parse_filter_args,
    render_status_page,
)
from .ical import events_to_ics


class CalendarCache:
    def __init__(
        self,
        gyms: list[GymConfig],
        *,
        base_calendar_name: str,
        days_ahead: int,
        refresh_seconds: int,
    ) -> None:
        self.gyms = gyms
        self.base_calendar_name = base_calendar_name
        self.days_ahead = days_ahead
        self.refresh_seconds = refresh_seconds
        self._lock = threading.Lock()
        self._events: list[CalendarEvent] = []
        self._updated_at: datetime | None = None
        self._error: str | None = None

    def refresh(self) -> None:
        try:
            events = fetch_events(
                self.gyms,
                days_ahead=self.days_ahead,
                progress=True,
            )
            with self._lock:
                self._events = events
                self._updated_at = datetime.now(timezone.utc)
                self._error = None
        except Exception as exc:  # noqa: BLE001 - surface fetch errors to subscribers
            with self._lock:
                self._error = str(exc)

    def snapshot(self) -> tuple[list[CalendarEvent], datetime | None, str | None]:
        with self._lock:
            return list(self._events), self._updated_at, self._error

    def build_ics(self, filters: EventFilters) -> tuple[str, int]:
        events, _, error = self.snapshot()
        if error and not events:
            raise RuntimeError(error)
        filtered = filter_events(events, filters)
        ics = events_to_ics(
            filtered,
            calendar_name=calendar_name_for_filters(filters, base_name=self.base_calendar_name),
            refresh_minutes=max(1, self.refresh_seconds // 60),
        )
        return ics, len(filtered)


def build_event_filters(args: argparse.Namespace) -> EventFilters:
    gyms = parse_filter_args([args.gym] if args.gym != ALL_GYMS_KEY else None)
    types = parse_filter_args(args.type)
    if args.gym != ALL_GYMS_KEY:
        gyms = parse_filter_args([args.gym, *list(gyms)])
    return EventFilters(gyms=gyms, types=types)


def resolve_gyms(gym_key: str) -> tuple[list[GymConfig], str]:
    if gym_key == ALL_GYMS_KEY:
        return list(ALL_GYMS), "Touchstone Climbing (All Gyms)"
    gym = GYM_PRESETS[gym_key]
    return [gym], f"{gym.name} Classes"


def build_parser() -> argparse.ArgumentParser:
    gym_choices = [ALL_GYMS_KEY, *sorted(GYM_PRESETS)]
    parser = argparse.ArgumentParser(
        description="Sync Touchstone gym class calendars to Google Calendar via iCal feed.",
    )
    parser.add_argument(
        "--gym",
        default=DEFAULT_GYM,
        choices=gym_choices,
        help="Gym preset to sync, or 'all' for every Touchstone gym (default: all)",
    )
    parser.add_argument(
        "--type",
        action="append",
        default=[],
        metavar="TEXT",
        help="Filter by event type substring. Repeat or comma-separate, e.g. --type intro --type yoga",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=90,
        help="Number of days ahead to include (default: 90)",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    export_parser = subparsers.add_parser("export", help="Write calendar.ics to a file")
    export_parser.add_argument(
        "output",
        nargs="?",
        default="calendar.ics",
        help="Output .ics file path (default: calendar.ics)",
    )

    serve_parser = subparsers.add_parser(
        "serve",
        help="Serve a live iCal feed for Google Calendar subscription",
    )
    serve_parser.add_argument("--host", default="127.0.0.1")
    serve_parser.add_argument("--port", type=int, default=8080)
    serve_parser.add_argument(
        "--refresh-seconds",
        type=int,
        default=3600,
        help="How often to refetch Touchstone data (default: 3600)",
    )

    return parser


def cmd_export(args: argparse.Namespace) -> int:
    gyms, calendar_name = resolve_gyms(args.gym)
    filters = build_event_filters(args)
    events = fetch_events(gyms, days_ahead=args.days, progress=len(gyms) > 1)
    events = filter_events(events, filters)
    ics = events_to_ics(
        events,
        calendar_name=calendar_name_for_filters(filters, base_name=calendar_name),
    )
    output = Path(args.output)
    output.write_text(ics, encoding="utf-8")
    gym_label = f"{len(gyms)} gyms" if len(gyms) > 1 else gyms[0].name
    print(f"Wrote {len(events)} events from {gym_label} to {output}")
    return 0


def cmd_serve(args: argparse.Namespace) -> int:
    gyms, calendar_name = resolve_gyms(args.gym)
    cache = CalendarCache(
        gyms,
        base_calendar_name=calendar_name,
        days_ahead=args.days,
        refresh_seconds=args.refresh_seconds,
    )
    cache.refresh()

    def refresher() -> None:
        while True:
            time.sleep(args.refresh_seconds)
            cache.refresh()

    thread = threading.Thread(target=refresher, daemon=True)
    thread.start()

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path == "/health":
                events, updated_at, error = cache.snapshot()
                payload = {
                    "status": "ok" if events else ("error" if error else "empty"),
                    "eventCount": len(events),
                    "updatedAt": updated_at.isoformat() if updated_at else None,
                    "error": error,
                }
                body = json.dumps(payload).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
                return

            if parsed.path not in ("/", "/calendar.ics"):
                self.send_error(404)
                return

            filters = parse_event_filters(parsed.query)
            if parsed.path == "/":
                events, updated_at, error = cache.snapshot()
                if error and not events:
                    self.send_error(502, explain=error)
                    return
                host = self.headers.get("Host", f"{args.host}:{args.port}")
                scheme = "http" if args.host in {"127.0.0.1", "localhost", "0.0.0.0"} else "https"
                body = render_status_page(
                    events,
                    base_url=f"{scheme}://{host}",
                    updated_at=updated_at.isoformat() if updated_at else None,
                    refresh_seconds=args.refresh_seconds,
                ).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            try:
                ics, event_count = cache.build_ics(filters)
            except RuntimeError as exc:
                self.send_error(502, explain=str(exc))
                return

            _, updated_at, _ = cache.snapshot()
            body = ics.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/calendar; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            if updated_at:
                self.send_header("Last-Modified", updated_at.strftime("%a, %d %b %Y %H:%M:%S GMT"))
            self.end_headers()
            self.wfile.write(body)
            self.log_message("calendar.ics served (%d events, filters=%s)", event_count, filters)

        def log_message(self, format: str, *args) -> None:  # noqa: A003
            print(f"[{self.log_date_time_string()}] {self.address_string()} {format % args}")

    scope = f"{len(gyms)} Touchstone gyms" if len(gyms) > 1 else gyms[0].name
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Serving {scope} at http://{args.host}:{args.port}/")
    print(f"Refreshing Touchstone data every {args.refresh_seconds} seconds")
    print()
    print("Browse filter URLs:")
    print(f"  http://{args.host}:{args.port}/")
    print()
    print("Subscribe in Google Calendar (Settings -> Add calendar -> From URL):")
    print(f"  http://{args.host}:{args.port}/calendar.ics")
    print(f"  http://{args.host}:{args.port}/calendar.ics?gym=ironworks")
    print(f"  http://{args.host}:{args.port}/calendar.ics?type=intro")
    print(f"  http://{args.host}:{args.port}/calendar.ics?gym=gwpower-co&type=yoga")
    print()
    print("For Google to reach a local server, expose it with ngrok or Cloudflare Tunnel.")
    print("For always-on auto-update, deploy with Docker/Fly.io and subscribe once.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0


def main(argv: list[str] | None = None) -> int:
    from .observability import init_observability

    init_observability()
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "export":
        return cmd_export(args)
    if args.command == "serve":
        return cmd_serve(args)
    parser.error(f"Unknown command: {args.command}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from .api import CalendarEvent


def events_to_ics(
    events: Iterable[CalendarEvent],
    *,
    calendar_name: str,
    timezone_name: str = "America/Los_Angeles",
    refresh_minutes: int = 60,
    prefix_gym: bool = True,
) -> str:
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//touchstonecal//Touchstone Calendar Sync//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_escape_text(calendar_name)}",
        f"X-WR-TIMEZONE:{timezone_name}",
        f"REFRESH-INTERVAL;VALUE=MINUTES:{refresh_minutes}",
        f"X-PUBLISHED-TTL:PT{refresh_minutes}M",
    ]

    for event in events:
        lines.extend(_event_lines(event, now, prefix_gym=prefix_gym))

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def _event_lines(event: CalendarEvent, dtstamp: str, *, prefix_gym: bool) -> list[str]:
    title = event.title
    if event.session_count > 1:
        title = f"{title} ({event.session_sequence}/{event.session_count})"
    if prefix_gym:
        title = f"[{event.gym_short_name}] {title}"

    lines = [
        "BEGIN:VEVENT",
        f"UID:{event.uid}",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART;TZID={event.timezone}:{_format_local(event.start_local)}",
        f"DTEND;TZID={event.timezone}:{_format_local(event.end_local)}",
        f"SUMMARY:{_escape_text(title)}",
        f"LOCATION:{_escape_text(event.location)}",
        f"CATEGORIES:{_escape_text(event.gym_name)},{_escape_text(event.event_type)}",
    ]

    if event.description:
        lines.append(f"DESCRIPTION:{_escape_text(event.description)}")

    lines.append(f"URL:{_escape_text(event.source_url)}")
    lines.append("END:VEVENT")
    return lines


def _format_local(value: str) -> str:
    parsed = datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    return parsed.strftime("%Y%m%dT%H%M%S")


def _escape_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", r"\;")
        .replace(",", r"\,")
        .replace("\n", r"\n")
    )

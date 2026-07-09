from __future__ import annotations

from dataclasses import dataclass
from html import escape as _esc
from typing import TYPE_CHECKING
from urllib.parse import parse_qs, quote_plus

from .config import ALL_GYMS, GYM_PRESETS, GymConfig

if TYPE_CHECKING:
    from .api import CalendarEvent

GYM_LOOKUP: dict[str, GymConfig] = {}
for gym in ALL_GYMS:
    GYM_LOOKUP[gym.key.lower()] = gym
    GYM_LOOKUP[gym.short_name.lower()] = gym
    GYM_LOOKUP[gym.portal_slug.lower()] = gym
    GYM_LOOKUP[gym.name.lower()] = gym


@dataclass(frozen=True)
class EventFilters:
    gyms: tuple[str, ...] = ()
    types: tuple[str, ...] = ()

    @property
    def active(self) -> bool:
        return bool(self.gyms or self.types)


def normalize_event_type(title: str) -> str:
    return " ".join(title.split())


def parse_filter_args(values: list[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    tokens: list[str] = []
    for value in values:
        tokens.extend(part.strip() for part in value.split(",") if part.strip())
    return tuple(token.lower() for token in tokens)


def parse_event_filters(query: str) -> EventFilters:
    params = parse_qs(query.lstrip("?"))
    return EventFilters(
        gyms=parse_filter_args(params.get("gym")),
        types=parse_filter_args(params.get("type")),
    )


def _gym_aliases(gym: GymConfig) -> set[str]:
    return {
        gym.key.lower(),
        gym.short_name.lower(),
        gym.portal_slug.lower(),
        gym.name.lower(),
        gym.website_path.lower(),
    }


def _matches_gym(event: CalendarEvent, gym_tokens: tuple[str, ...]) -> bool:
    aliases = _gym_aliases(GYM_LOOKUP[event.gym_key]) if event.gym_key in GYM_PRESETS else {
        event.gym_name.lower(),
        event.gym_short_name.lower(),
    }
    return any(
        token in aliases or any(token in alias for alias in aliases)
        for token in gym_tokens
    )


def _matches_type(event: CalendarEvent, type_tokens: tuple[str, ...]) -> bool:
    haystack = event.event_type.lower()
    return any(token in haystack for token in type_tokens)


def filter_events(events: list[CalendarEvent], filters: EventFilters) -> list[CalendarEvent]:
    if not filters.active:
        return events

    filtered: list[CalendarEvent] = []
    for event in events:
        if filters.gyms and not _matches_gym(event, filters.gyms):
            continue
        if filters.types and not _matches_type(event, filters.types):
            continue
        filtered.append(event)
    return filtered


def calendar_name_for_filters(filters: EventFilters, *, base_name: str) -> str:
    if not filters.active:
        return base_name

    parts = [base_name]
    if filters.gyms:
        gym_labels = []
        for token in filters.gyms:
            gym = GYM_LOOKUP.get(token)
            gym_labels.append(gym.short_name if gym else token)
        parts.append(", ".join(gym_labels))
    if filters.types:
        parts.append(", ".join(filters.types))
    return " - ".join(parts)


def list_event_types(events: list[CalendarEvent]) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for event in events:
        counts[event.event_type] = counts.get(event.event_type, 0) + 1
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))


def render_status_page(
    events: list[CalendarEvent],
    *,
    base_url: str,
    updated_at: str | None,
    refresh_seconds: int,
) -> str:
    event_types = list_event_types(events)
    safe_base = _esc(base_url)
    lines = [
        "<!doctype html>",
        "<html><head><meta charset='utf-8'>",
        "<title>Touchstone Calendar Feed</title>",
        "<style>",
        "body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;line-height:1.5}",
        "code{background:#f4f4f4;padding:0.1rem 0.35rem;border-radius:4px}",
        "ul.columns{columns:2;gap:2rem}",
        "a{word-break:break-all}",
        "</style></head><body>",
        "<h1>Touchstone Calendar Feed</h1>",
        f"<p>{len(events)} events cached"
        + (f", last refreshed {_esc(updated_at)}" if updated_at else "")
        + f", source refresh every {int(refresh_seconds)} seconds.</p>",
        "<h2>Auto-update setup</h2>",
        "<ol>",
        "<li>This feed is hosted on Vercel and refreshes on a schedule.</li>",
        "<li>In Google Calendar: Settings -> Add calendar -> From URL.</li>",
        "<li>Paste a feed URL below once. Google will re-fetch it automatically.</li>",
        "</ol>",
        "<p>Google usually refreshes subscribed calendars every few hours.</p>",
        f"<p><strong>All events:</strong> <a href='{safe_base}/calendar.ics'>{safe_base}/calendar.ics</a></p>",
        "<h2>Filter by gym</h2><ul>",
    ]

    for gym in ALL_GYMS:
        url = f"{safe_base}/calendar.ics?gym={quote_plus(gym.key)}"
        lines.append(
            f"<li><a href='{url}'>{_esc(gym.name)}</a> "
            f"(<code>?gym={_esc(gym.key)}</code>)</li>"
        )
    lines.append("</ul>")

    lines.append("<h2>Filter by event type</h2>")
    lines.append("<p>Use substring matches, comma-separated for multiple types.</p><ul>")
    for event_type, count in event_types[:40]:
        url = f"{safe_base}/calendar.ics?type={quote_plus(event_type.lower())}"
        first_token = event_type.lower().split()[0] if event_type.split() else ""
        lines.append(
            f"<li><a href='{url}'>{_esc(event_type)}</a> ({int(count)}) "
            f"<code>?type={_esc(first_token)}</code></li>"
        )
    if len(event_types) > 40:
        lines.append(f"<li>... and {len(event_types) - 40} more types</li>")
    lines.append("</ul>")

    lines.extend(
        [
            "<h2>Combine filters</h2>",
            "<ul>",
            f"<li><a href='{safe_base}/calendar.ics?gym=ironworks&amp;type=intro'>{safe_base}/calendar.ics?gym=ironworks&amp;type=intro</a></li>",
            f"<li><a href='{safe_base}/calendar.ics?gym=gwpower-co&amp;type=yoga'>{safe_base}/calendar.ics?gym=gwpower-co&amp;type=yoga</a></li>",
            f"<li><a href='{safe_base}/calendar.ics?gym=ironworks,gwpower-co&amp;type=intro,belay'>{safe_base}/calendar.ics?gym=ironworks,gwpower-co&amp;type=intro,belay</a></li>",
            "</ul>",
            "<h2>CLI export examples</h2>",
            "<pre>",
            "python -m touchstonecal export calendar.ics\n",
            "python -m touchstonecal --gym ironworks export ironworks.ics\n",
            "python -m touchstonecal --type intro,yoga export intro-yoga.ics\n",
            "python -m touchstonecal --gym gwpower-co --type yoga export gw-yoga.ics",
            "</pre>",
            "</body></html>",
        ]
    )
    return "\n".join(lines)

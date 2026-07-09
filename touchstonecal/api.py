from __future__ import annotations

import json
import logging
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any
from urllib.error import HTTPError, URLError
from zoneinfo import ZoneInfo

PACIFIC = ZoneInfo("America/Los_Angeles")

from .config import ALL_GYMS, GymConfig

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 30
MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 0.5

GRAPHQL_URL = "https://portal.touchstoneclimbing.com/graphql-public"
CLIENT_VERSION = "1.3.646"
NUXT_DATA_PATTERN = re.compile(
    r'<script type="application/json" id="__NUXT_DATA__"[^>]*>(.*?)</script>',
    re.DOTALL,
)

CALENDAR_QUERY = """
query StorefrontCalendarQuery($input: CalendarFilter, $language: Language!) {
  calendar(input: $input) {
    courseId
    sessionGraphId
    sessionFacilityHash
    startLocal
    endLocal
    sessionSequence
    sessionCount
    textColor
    backgroundColor
    publicTitle
    capacityText
    instructorText
    buttonText
    planId
    shortSummary(language: $language)
  }
}
""".strip()

PLAN_SLUG_QUERY = """
query PlanSlugQuery($planId: ID!) {
  plan(id: $planId) {
    slug
  }
}
""".strip()

PLAN_ID_PATTERN = re.compile(r"UGxhb[a-zA-Z0-9=+/]+")
_plan_slug_cache: dict[str, str | None] = {}


@dataclass(frozen=True)
class GymMetadata:
    plan_ids: list[str]
    plan_group: dict[str, str]


@dataclass(frozen=True)
class CalendarEvent:
    uid: str
    title: str
    start_local: str
    end_local: str
    description: str
    capacity: str | None
    instructor: str | None
    session_sequence: int
    session_count: int
    plan_id: str
    plan_slug: str | None
    button_text: str | None
    summary: str | None
    source_url: str
    gym_name: str
    gym_short_name: str
    gym_key: str
    event_type: str
    timezone: str
    location: str
    background_color: str | None
    text_color: str | None
    category_group: str | None = None


def _request(
    url: str,
    *,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    facility_id: str | None = None,
    referer: str | None = None,
) -> str:
    headers = {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "User-Agent": "touchstonecal/0.1",
        "x-redpoint-hq-client": CLIENT_VERSION,
    }
    if facility_id:
        headers["rphq-facility"] = facility_id
    if referer:
        headers["Referer"] = referer

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
                return response.read().decode("utf-8")
        except HTTPError as exc:
            last_exc = exc
            # Retry only transient server-side failures.
            if exc.code < 500 or attempt == MAX_RETRIES:
                raise
        except (URLError, TimeoutError) as exc:
            last_exc = exc
            if attempt == MAX_RETRIES:
                raise
        delay = RETRY_BACKOFF_SECONDS * (2**attempt)
        logger.warning(
            "Request to %s failed (attempt %d/%d): %s; retrying in %.1fs",
            url,
            attempt + 1,
            MAX_RETRIES + 1,
            last_exc,
            delay,
        )
        time.sleep(delay)

    # Unreachable: the loop either returns or raises.
    raise last_exc if last_exc else RuntimeError(f"Request to {url} failed")


def _resolve_nuxt_payload(raw: list[Any], value: Any, depth: int = 0, seen: set[int] | None = None) -> Any:
    if seen is None:
        seen = set()
    if depth > 40:
        return value
    if isinstance(value, int):
        if value in seen:
            return value
        if 0 <= value < len(raw):
            seen.add(value)
            return _resolve_nuxt_payload(raw, raw[value], depth + 1, seen)
        return value
    if isinstance(value, list):
        return [_resolve_nuxt_payload(raw, item, depth + 1, seen.copy()) for item in value]
    if isinstance(value, dict):
        return {
            key: _resolve_nuxt_payload(raw, item, depth + 1, seen.copy())
            for key, item in value.items()
        }
    return value


def _load_nuxt_payload(embed_url: str, *, facility_id: str, referer: str) -> list[Any]:
    html = _request(embed_url, facility_id=facility_id, referer=referer)
    match = NUXT_DATA_PATTERN.search(html)
    if not match:
        raise RuntimeError(f"No embed payload found for {embed_url}")
    return json.loads(match.group(1))


def _extract_calendar_query_key(payload: list[Any], facility_id: str) -> list[Any] | None:
    root = _resolve_nuxt_payload(payload, 0)
    queries = (
        root[1]["state"][1]["$svue-query"]["queries"]
        if isinstance(root, list) and len(root) > 1
        else []
    )
    for query in queries:
        query_key = query.get("queryKey")
        if (
            isinstance(query_key, list)
            and query_key
            and query_key[0] == "StorefrontCalendarQuery"
            and query_key[1] == facility_id
        ):
            return query_key
    return None


def _extract_calendar_groups(payload: list[Any]) -> dict[str, str]:
    root = _resolve_nuxt_payload(payload, 0)
    plan_group: dict[str, str] = {}

    def walk(obj: Any) -> None:
        if isinstance(obj, dict):
            if obj.get("__typename") == "StorefrontCalendar":
                for group in obj.get("children", []):
                    if (
                        isinstance(group, dict)
                        and group.get("__typename") == "StorefrontCalendarGroup"
                    ):
                        slug = group.get("slug", "")
                        for plan in group.get("children", []):
                            if (
                                isinstance(plan, dict)
                                and plan.get("__typename") == "StorefrontPlan"
                            ):
                                plan_id = plan.get("planId")
                                if plan_id and slug:
                                    plan_group[plan_id] = slug
            else:
                for value in obj.values():
                    walk(value)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(root)
    return plan_group


def discover_gym_metadata(gym: GymConfig) -> GymMetadata:
    payload = _load_nuxt_payload(
        gym.embed_url,
        facility_id=gym.facility_id,
        referer=gym.calendar_url,
    )
    plan_group = _extract_calendar_groups(payload)

    query_key = _extract_calendar_query_key(payload, gym.facility_id)
    if query_key and len(query_key) >= 3:
        plan_ids = [plan_id for plan_id in query_key[2] if isinstance(plan_id, str)]
        if plan_ids:
            return GymMetadata(plan_ids=sorted(set(plan_ids)), plan_group=plan_group)

    html = _request(gym.embed_url, facility_id=gym.facility_id, referer=gym.calendar_url)
    plan_ids = sorted(set(PLAN_ID_PATTERN.findall(html)))
    if not plan_ids:
        raise RuntimeError(f"No plan IDs found for {gym.name}")
    return GymMetadata(plan_ids=plan_ids, plan_group=plan_group)


def discover_plan_ids(gym: GymConfig) -> list[str]:
    return discover_gym_metadata(gym).plan_ids


def fetch_calendar_chunk(
    gym: GymConfig,
    plan_ids: list[str],
    start_date: date,
    end_date: date,
) -> list[dict[str, Any]]:
    payload = {
        "query": CALENDAR_QUERY,
        "variables": {
            "input": {
                "facilityId": [gym.facility_id],
                "planId": plan_ids,
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
            },
            "language": "ENGLISH",
        },
    }
    raw = _request(
        GRAPHQL_URL,
        method="POST",
        payload=payload,
        facility_id=gym.facility_id,
    )
    body = json.loads(raw)
    if body.get("errors"):
        messages = "; ".join(error.get("message", "unknown error") for error in body["errors"])
        raise RuntimeError(f"GraphQL error for {gym.name}: {messages}")
    return body.get("data", {}).get("calendar") or []


def resolve_plan_slug(plan_id: str, *, facility_id: str) -> str | None:
    if not plan_id:
        return None
    if plan_id in _plan_slug_cache:
        return _plan_slug_cache[plan_id]

    payload = {
        "query": PLAN_SLUG_QUERY,
        "variables": {"planId": plan_id},
    }
    try:
        raw = _request(
            GRAPHQL_URL,
            method="POST",
            payload=payload,
            facility_id=facility_id,
        )
        body = json.loads(raw)
        slug = (body.get("data", {}).get("plan") or {}).get("slug")
        _plan_slug_cache[plan_id] = slug
        return slug
    except Exception:
        _plan_slug_cache[plan_id] = None
        return None


def resolve_plan_slugs(plan_ids: set[str], *, facility_id: str) -> dict[str, str | None]:
    return {plan_id: resolve_plan_slug(plan_id, facility_id=facility_id) for plan_id in plan_ids}


def plan_info_url(gym: GymConfig, plan_slug: str | None, button_text: str | None) -> str | None:
    if not button_text or not plan_slug:
        return None
    return f"https://portal.touchstoneclimbing.com/{gym.portal_slug}/programs/{plan_slug}"


def _today_pacific() -> date:
    return datetime.now(PACIFIC).date()


def _normalize_end_local(value: str) -> str:
    parsed = datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    if parsed.second == 59:
        parsed += timedelta(minutes=1)
        parsed = parsed.replace(second=0)
    return parsed.strftime("%Y-%m-%d %H:%M:%S")


def fetch_gym_events(
    gym: GymConfig,
    *,
    days_ahead: int = 90,
    chunk_days: int = 30,
    plan_ids: list[str] | None = None,
    metadata: GymMetadata | None = None,
) -> list[CalendarEvent]:
    gym_metadata = metadata or discover_gym_metadata(gym)
    plan_ids = plan_ids or gym_metadata.plan_ids
    plan_group = gym_metadata.plan_group
    start = _today_pacific()
    end = start + timedelta(days=days_ahead)

    raw_events: list[dict[str, Any]] = []
    chunk_start = start
    while chunk_start <= end:
        chunk_end = min(chunk_start + timedelta(days=chunk_days - 1), end)
        raw_events.extend(fetch_calendar_chunk(gym, plan_ids, chunk_start, chunk_end))
        chunk_start = chunk_end + timedelta(days=1)

    events: list[CalendarEvent] = []
    seen: set[str] = set()

    plan_ids_to_resolve = {
        str(item["planId"])
        for item in raw_events
        if item.get("buttonText") and item.get("planId")
    }
    plan_slugs = resolve_plan_slugs(plan_ids_to_resolve, facility_id=gym.facility_id)

    for item in raw_events:
        uid = item.get("sessionFacilityHash") or item.get("sessionGraphId")
        if not uid or uid in seen:
            continue
        seen.add(uid)

        summary = item.get("shortSummary") or ""
        description_parts = [_strip_html(summary)] if summary else []
        if item.get("capacityText"):
            description_parts.append(f"Availability: {item['capacityText']}")
        if item.get("instructorText"):
            description_parts.append(f"Instructor: {item['instructorText']}")
        description_parts.append(f"Gym: {gym.name}")
        description_parts.append(f"Source: {gym.calendar_url}")

        plan_id = item.get("planId") or ""
        button_text = item.get("buttonText")
        plan_slug = plan_slugs.get(plan_id) if plan_id else None
        info_url = plan_info_url(gym, plan_slug, button_text)
        if info_url:
            description_parts.append(f"Details: {info_url}")

        storefront_slug = plan_group.get(plan_id) if plan_id else None
        category_group = storefront_slug

        events.append(
            CalendarEvent(
                uid=f"touchstone-{uid}@touchstonecal.local",
                title=item.get("publicTitle") or "Touchstone Class",
                start_local=item["startLocal"],
                end_local=_normalize_end_local(item["endLocal"]),
                description="\n".join(part for part in description_parts if part),
                capacity=item.get("capacityText"),
                instructor=item.get("instructorText"),
                session_sequence=int(item.get("sessionSequence") or 1),
                session_count=int(item.get("sessionCount") or 1),
                plan_id=plan_id,
                plan_slug=plan_slug,
                button_text=button_text,
                summary=_strip_html(summary) if summary else None,
                source_url=gym.calendar_url,
                gym_name=gym.name,
                gym_short_name=gym.short_name,
                gym_key=gym.key,
                event_type=_normalize_event_type(item.get("publicTitle") or "Touchstone Class"),
                timezone=gym.timezone,
                location=gym.location,
                background_color=item.get("backgroundColor"),
                text_color=item.get("textColor"),
                category_group=category_group,
            )
        )

    return events


@dataclass
class FetchReport:
    events: list[CalendarEvent] = field(default_factory=list)
    errors: dict[str, str] = field(default_factory=dict)

    @property
    def partial(self) -> bool:
        return bool(self.errors) and bool(self.events)


def fetch_events_report(
    gyms: list[GymConfig],
    *,
    days_ahead: int = 90,
    chunk_days: int = 30,
    progress: bool = False,
    parallel: bool = False,
    max_workers: int = 8,
) -> FetchReport:
    """Fetch events, isolating per-gym failures so one outage cannot sink the feed."""
    all_events: list[CalendarEvent] = []
    seen: set[str] = set()
    errors: dict[str, str] = {}

    def collect(gym_events: list[CalendarEvent]) -> None:
        for event in gym_events:
            if event.uid in seen:
                continue
            seen.add(event.uid)
            all_events.append(event)

    if parallel and len(gyms) > 1:
        with ThreadPoolExecutor(max_workers=min(max_workers, len(gyms))) as executor:
            futures = {
                executor.submit(
                    fetch_gym_events,
                    gym,
                    days_ahead=days_ahead,
                    chunk_days=chunk_days,
                ): gym
                for gym in gyms
            }
            for future in as_completed(futures):
                gym = futures[future]
                try:
                    collect(future.result())
                except Exception as exc:  # noqa: BLE001 - isolate one gym's failure
                    errors[gym.key] = str(exc)
                    logger.warning("Failed to fetch %s: %s", gym.name, exc)
    else:
        for index, gym in enumerate(gyms, start=1):
            if progress:
                print(f"Fetching {gym.name} ({index}/{len(gyms)})...", file=sys.stderr)
            try:
                collect(fetch_gym_events(gym, days_ahead=days_ahead, chunk_days=chunk_days))
            except Exception as exc:  # noqa: BLE001 - isolate one gym's failure
                errors[gym.key] = str(exc)
                logger.warning("Failed to fetch %s: %s", gym.name, exc)

    all_events.sort(key=lambda event: (event.start_local, event.gym_name, event.title))
    return FetchReport(events=all_events, errors=errors)


def fetch_events(
    gyms: list[GymConfig],
    *,
    days_ahead: int = 90,
    chunk_days: int = 30,
    progress: bool = False,
    parallel: bool = False,
    max_workers: int = 8,
) -> list[CalendarEvent]:
    report = fetch_events_report(
        gyms,
        days_ahead=days_ahead,
        chunk_days=chunk_days,
        progress=progress,
        parallel=parallel,
        max_workers=max_workers,
    )
    # Only hard-fail when every gym failed; partial results are still useful.
    if report.errors and not report.events:
        raise RuntimeError(
            "; ".join(f"{key}: {msg}" for key, msg in report.errors.items())
        )
    return report.events


def fetch_all_gym_events(**kwargs: Any) -> list[CalendarEvent]:
    return fetch_events(list(ALL_GYMS), **kwargs)


def _normalize_event_type(title: str) -> str:
    return " ".join(title.split())


def _strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    text = (
        text.replace("&mdash;", "-")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )
    text = re.sub(r"\s+", " ", text)
    return text.strip()

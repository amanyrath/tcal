from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from .categories import (
    build_category_catalog,
    classify_subgroup,
    event_group_id,
    is_excluded_event,
)
from .config import ALL_GYMS, active_gyms
from .display import display_name, normalize_event_type
from .api import plan_info_url

if TYPE_CHECKING:
    from .api import CalendarEvent
    from .config import GymConfig


def _gym_for_event(event: CalendarEvent) -> GymConfig | None:
    for gym in ALL_GYMS:
        if gym.key == event.gym_key:
            return gym
    return None


def event_to_json(event: CalendarEvent) -> dict:
    group_id = event_group_id(event)
    gym = _gym_for_event(event)
    info_url = (
        plan_info_url(gym, event.plan_slug, event.button_text)
        if gym
        else None
    )
    return {
        "id": event.uid,
        "title": display_name(event.title),
        "rawTitle": event.title,
        "start": event.start_local,
        "end": event.end_local,
        "gymKey": event.gym_key,
        "gymName": event.gym_short_name,
        "categoryGroup": group_id,
        "categorySubgroup": classify_subgroup(group_id, event.title),
        "displayName": normalize_event_type(event.event_type or event.title),
        "instructor": event.instructor,
        "capacity": event.capacity,
        "description": event.summary,
        "infoUrl": info_url,
        "sourceUrl": event.source_url,
        "backgroundColor": event.background_color,
        "textColor": event.text_color,
    }


def serialize_events_response(
    events: list[CalendarEvent],
    updated_at: float,
    *,
    errors: dict[str, str] | None = None,
) -> dict:
    included = [event for event in events if not is_excluded_event(event.title, event.event_type)]
    catalog = build_category_catalog(included)
    updated = datetime.fromtimestamp(updated_at, tz=timezone.utc).isoformat()

    return {
        "updatedAt": updated,
        "partial": bool(errors),
        "fetchErrors": errors or {},
        "gyms": [
            {
                "key": gym.key,
                "name": gym.name,
                "shortName": gym.short_name,
            }
            for gym in active_gyms()
        ],
        "categoryGroups": [
            {
                "id": group.id,
                "label": group.label,
                "subgroups": [
                    {
                        "id": subgroup.id,
                        "label": subgroup.label,
                        "types": [
                            {
                                "displayName": entry.display_name,
                                "count": entry.count,
                            }
                            for entry in subgroup.types
                        ],
                    }
                    for subgroup in group.subgroups
                ],
                "types": [
                    {
                        "displayName": entry.display_name,
                        "count": entry.count,
                    }
                    for entry in group.types
                ],
            }
            for group in catalog
        ],
        "events": [event_to_json(event) for event in included],
    }

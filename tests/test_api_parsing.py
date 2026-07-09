from touchstonecal.api import (
    _extract_calendar_groups,
    _normalize_end_local,
    _normalize_event_type,
    _resolve_nuxt_payload,
    _strip_html,
    plan_info_url,
)
from touchstonecal.config import GYM_PRESETS


def test_strip_html_removes_tags_and_entities():
    raw = "<p>Hot&nbsp;Yoga &amp; Flow &mdash; level 1</p>"
    assert _strip_html(raw) == "Hot Yoga & Flow - level 1"


def test_normalize_end_local_rounds_59_seconds():
    assert _normalize_end_local("2026-01-01 10:59:59") == "2026-01-01 11:00:00"
    # Non-:59 seconds are left untouched.
    assert _normalize_end_local("2026-01-01 10:30:00") == "2026-01-01 10:30:00"


def test_resolve_nuxt_payload_follows_index_references():
    # Nuxt encodes values as indexes into a flat array.
    raw = [{"label": 1}, "hello"]
    assert _resolve_nuxt_payload(raw, 0) == {"label": "hello"}


def test_resolve_nuxt_payload_guards_against_cycles():
    raw = [0]  # index 0 points to itself
    # Should terminate and return without infinite recursion.
    assert _resolve_nuxt_payload(raw, 0) == 0


def test_extract_calendar_groups_maps_plan_to_slug():
    payload = [
        {
            "__typename": "StorefrontCalendar",
            "children": [
                {
                    "__typename": "StorefrontCalendarGroup",
                    "slug": "yoga-classes",
                    "children": [
                        {"__typename": "StorefrontPlan", "planId": "PLAN1"},
                        {"__typename": "StorefrontPlan", "planId": "PLAN2"},
                    ],
                }
            ],
        }
    ]
    groups = _extract_calendar_groups(payload)
    assert groups == {"PLAN1": "yoga-classes", "PLAN2": "yoga-classes"}


def test_normalize_event_type_collapses_whitespace():
    assert _normalize_event_type("  Intro   to  Climbing ") == "Intro to Climbing"


def test_plan_info_url_requires_slug_and_button():
    gym = GYM_PRESETS["ironworks"]
    assert plan_info_url(gym, None, "Sign up") is None
    assert plan_info_url(gym, "my-slug", None) is None
    url = plan_info_url(gym, "my-slug", "Sign up")
    assert url == "https://portal.touchstoneclimbing.com/ironworks/programs/my-slug"

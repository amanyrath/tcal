from touchstonecal.api import CalendarEvent
from touchstonecal.serialize import event_to_json, serialize_events_response


def _event(**overrides) -> CalendarEvent:
    defaults = {
        "uid": "uid-test",
        "title": "HIIT",
        "start_local": "2026-07-08 18:00:00",
        "end_local": "2026-07-08 19:00:00",
        "description": "",
        "capacity": "2 spaces",
        "instructor": "Alex",
        "session_sequence": 1,
        "session_count": 1,
        "plan_id": "",
        "plan_slug": None,
        "button_text": None,
        "summary": "A short class summary.",
        "source_url": "https://example.com",
        "gym_name": "Ironworks",
        "gym_short_name": "Ironworks",
        "gym_key": "ironworks",
        "event_type": "HIIT",
        "timezone": "America/Los_Angeles",
        "location": "Ironworks",
        "background_color": "#2f6b3a",
        "text_color": "#ffffff",
    }
    defaults.update(overrides)
    return CalendarEvent(**defaults)


def test_event_to_json_includes_colors():
    payload = event_to_json(_event())
    assert payload["backgroundColor"] == "#2f6b3a"
    assert payload["textColor"] == "#ffffff"


def test_event_to_json_allows_missing_colors():
    payload = event_to_json(_event(background_color=None, text_color=None))
    assert payload["backgroundColor"] is None
    assert payload["textColor"] is None


def test_event_to_json_includes_description_and_info_url():
    payload = event_to_json(
        _event(
            plan_id="UGxhbjo1MDM=",
            plan_slug="intro-to-climbing-class",
            button_text="Information and Dates",
        )
    )
    assert payload["description"] == "A short class summary."
    assert payload["infoUrl"] == (
        "https://portal.touchstoneclimbing.com/ironworks/programs/intro-to-climbing-class"
    )


def test_serialize_events_response_excludes_blocked_types():
    payload = serialize_events_response(
        [
            _event(title="HIIT"),
            _event(uid="uid-rocket", title="Rocket Fundamentals", event_type="Rocket Fundamentals"),
        ],
        updated_at=0,
    )
    assert len(payload["events"]) == 1
    assert payload["events"][0]["title"] == "HIIT"

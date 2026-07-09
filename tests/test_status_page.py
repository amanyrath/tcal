from touchstonecal.api import CalendarEvent
from touchstonecal.filters import render_status_page


def _event(title: str) -> CalendarEvent:
    return CalendarEvent(
        uid="u1",
        title=title,
        start_local="2026-01-01 10:00:00",
        end_local="2026-01-01 11:00:00",
        description="",
        capacity=None,
        instructor=None,
        session_sequence=1,
        session_count=1,
        plan_id="",
        plan_slug=None,
        button_text=None,
        summary=None,
        source_url="https://example.com",
        gym_name="Test Gym",
        gym_short_name="Test",
        gym_key="test",
        event_type=title,
        timezone="America/Los_Angeles",
        location="Test Gym",
        background_color=None,
        text_color=None,
    )


def test_status_page_escapes_event_type():
    malicious = "<script>alert(1)</script>"
    html = render_status_page(
        [_event(malicious)],
        base_url="https://app.example.com",
        updated_at="2026-01-01T00:00:00+00:00",
        refresh_seconds=3600,
    )
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;" in html


def test_status_page_escapes_base_url():
    html = render_status_page(
        [],
        base_url="https://evil\"'><script>x</script>.test",
        updated_at=None,
        refresh_seconds=3600,
    )
    assert "<script>x</script>" not in html

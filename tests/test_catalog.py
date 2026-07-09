from touchstonecal.api import CalendarEvent
from touchstonecal.categories import build_category_catalog
from touchstonecal.display import normalize_event_type


def _event(title: str, event_type: str | None = None) -> CalendarEvent:
    return CalendarEvent(
        uid=f"uid-{title}",
        title=title,
        start_local="2026-07-08 18:00:00",
        end_local="2026-07-08 19:00:00",
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
        gym_name="Pacific Pipe",
        gym_short_name="Pacific Pipe",
        gym_key="pacific-pipe",
        event_type=event_type or title,
        timezone="America/Los_Angeles",
        location="Pacific Pipe",
        background_color=None,
        text_color=None,
    )


def test_catalog_deduplicates_display_names():
    events = [
        _event("Vinyasa w/ Elena", "Vinyasa w/ Elena"),
        _event("Vinyasa w/ Sam", "Vinyasa w/ Sam"),
        _event("Vinyasa | with Alex", "Vinyasa | with Alex"),
    ]
    catalog = build_category_catalog(events)
    yoga = next(group for group in catalog if group.id == "yoga-classes")
    assert len(yoga.types) == 1
    assert yoga.types[0].display_name == "Vinyasa"
    assert yoga.types[0].count == 3
    assert normalize_event_type("Vinyasa w/ Elena") == "Vinyasa"
    assert len(yoga.subgroups) == 3
    power_vinyasa = next(sg for sg in yoga.subgroups if sg.id == "power-vinyasa")
    assert power_vinyasa.types[0].display_name == "Vinyasa"
    assert power_vinyasa.types[0].count == 3


def test_catalog_deduplicates_hatha_yoga_variants():
    events = [
        _event("Hatha Yoga", "Hatha Yoga"),
        _event("Hatha Flow", "Hatha Flow"),
        _event("Hatha-Samyukta", "Hatha-Samyukta"),
    ]
    catalog = build_category_catalog(events)
    yoga = next(group for group in catalog if group.id == "yoga-classes")
    hatha_entries = [entry for entry in yoga.types if entry.display_name == "Hatha"]
    assert len(hatha_entries) == 1
    assert hatha_entries[0].count == 1
    assert normalize_event_type("Hatha Yoga") == "Hatha"


def test_catalog_omits_empty_groups():
    events = [_event("Yoga for Climbers")]
    catalog = build_category_catalog(events)
    group_ids = {group.id for group in catalog}
    assert "yoga-classes" in group_ids
    assert "competitions" not in group_ids
    assert "dance" not in group_ids

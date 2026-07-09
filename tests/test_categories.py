from touchstonecal.api import CalendarEvent
from touchstonecal.categories import (
    classify_by_color,
    classify_event,
    classify_subgroup,
    event_group_id,
    is_excluded_event,
)
import pytest


def test_power_flow_is_yoga():
    assert classify_event("Power Flow") == "yoga-classes"


def test_speed_wall_hours_is_gym_events():
    assert classify_event("Speed Wall Hours") == "gym-events"


def test_intro_to_climbing_is_intro_classes():
    assert classify_event("Intro to Climbing Class") == "intro-classes"


def test_hiit_is_fitness():
    assert classify_event("HIIT Mixtapes") == "fitness-classes"


def test_hiit_floor_pilates_is_fitness():
    assert classify_event("HIIT Floor Pilates w/ Laura") == "fitness-classes"


def test_queer_crush_is_affinity():
    assert classify_event("Queer Crush") == "affinity-meetup-groups"


def test_paracliffhangers_is_affinity():
    assert classify_event("ParaCliffHangers") == "affinity-meetup-groups"


@pytest.mark.parametrize(
    "title",
    [
        "Escalemos",
        "Paraclimbing",
        "People's Climbing Crew",
        "Waldahls",
        "Filipina",
        "WallDolls",
        "FilipinUp",
    ],
)
def test_affinity_groups_are_community(title):
    assert classify_event(title) == "affinity-meetup-groups"


def test_summer_camp_is_youth_programs():
    assert classify_event("Summer Camp") == "youth-programs"


def test_lead_climbing_clinic_is_climbing_clinics():
    assert classify_event("Lead Climbing Clinic") == "climbing-clinics"


def test_woman_up_setting_clinic_is_climbing_clinics():
    assert classify_event("Woman Up Setting Clinic") == "climbing-clinics"


def test_alert_is_intro_classes():
    assert classify_event("ALERT") == "intro-classes"


def test_yin_is_yoga():
    assert classify_event("Yin Yoga") == "yoga-classes"


def test_hot_yoga_is_yoga():
    assert classify_event("Hot Yoga") == "yoga-classes"


def test_acro_yoga_is_yoga():
    assert classify_event("Acro Yoga") == "yoga-classes"


def test_mobility_is_fitness():
    assert classify_event("Climber Mobility") == "fitness-classes"


def test_subgroup_is_other_by_default():
    assert classify_subgroup("gym-events", "Speed Wall Hours") == "notices"


def test_power_flow_subgroup():
    assert classify_subgroup("yoga-classes", "Power Flow") == "power-vinyasa"


def test_yin_subgroup():
    assert classify_subgroup("yoga-classes", "Yin Yoga") == "restorative"


def test_slow_flow_subgroup():
    assert classify_subgroup("yoga-classes", "Slow Flow") == "restorative"


def test_vinyasa_subgroup():
    assert classify_subgroup("yoga-classes", "Vinyasa w/ Elena") == "power-vinyasa"
    assert classify_subgroup("yoga-classes", "Vinyasa") == "power-vinyasa"


def test_hot_yoga_subgroup():
    assert classify_subgroup("yoga-classes", "Hot Yoga") == "other"
    assert classify_subgroup("yoga-classes", "Hot Vinyasa with Emily") == "other"


def test_acro_yoga_subgroup():
    assert classify_subgroup("yoga-classes", "Acro Yoga") == "other"
    assert classify_subgroup("yoga-classes", "All Levels Acro Yoga") == "other"


def test_hiit_subgroup():
    assert classify_subgroup("fitness-classes", "HIIT Mixtapes") == "hiit"


def test_mobility_subgroup():
    assert classify_subgroup("fitness-classes", "Climber Mobility") == "mobility"


def test_summer_camp_subgroup():
    assert classify_subgroup("youth-programs", "Summer Camp") == "summer-camp"


def test_lead_clinic_subgroup():
    assert classify_subgroup("climbing-clinics", "Lead Climbing Clinic") == "lead"


def test_alert_subgroup():
    assert classify_subgroup("intro-classes", "ALERT") == "other"


def test_beginner_hip_hop_is_fitness():
    assert classify_event("Hip Hop") == "fitness-classes"
    assert classify_subgroup("fitness-classes", "Hip Hop") == "other"


def test_trx_is_fitness():
    assert classify_event("TRX Core") == "fitness-classes"
    assert classify_subgroup("fitness-classes", "TRX Core") == "strength"


def test_boxing_is_fitness():
    assert classify_event("Boxing Basics") == "fitness-classes"
    assert classify_subgroup("fitness-classes", "Boxing Basics") == "other"
    assert classify_subgroup("fitness-classes", "Cardio Boxing Victor") == "other"
    assert classify_subgroup("fitness-classes", "Advanced Cardio Boxing") == "other"


def test_spin_is_fitness_other():
    assert classify_event("Spin") == "fitness-classes"
    assert classify_subgroup("fitness-classes", "Spin") == "other"
    assert classify_subgroup("fitness-classes", "Spin Class") == "other"


def test_yoga_clinic_uses_yoga_subgroups():
    assert classify_subgroup("yoga-clinics", "Yin Yoga Clinic") == "restorative"
    assert classify_subgroup("yoga-clinics", "Vinyasa Workshop") == "power-vinyasa"


def test_fitness_clinic_uses_fitness_subgroups():
    assert classify_subgroup("fitness-clinics", "TRX Clinic") == "strength"
    assert classify_subgroup("fitness-clinics", "HIIT Clinic") == "hiit"


def test_excluded_event_types():
    assert is_excluded_event("Rocket Fundamentals")
    assert is_excluded_event("Fundamentals of Yoga")
    assert is_excluded_event("Intro to Barbell Lifting")
    assert is_excluded_event("Beginner Hip Hop")
    assert not is_excluded_event("Intro to Climbing Class")


def _event(**overrides) -> CalendarEvent:
    defaults = {
        "uid": "uid-test",
        "title": "Mystery Class",
        "start_local": "2026-07-08 18:00:00",
        "end_local": "2026-07-08 19:00:00",
        "description": "",
        "capacity": None,
        "instructor": None,
        "session_sequence": 1,
        "session_count": 1,
        "plan_id": "",
        "plan_slug": None,
        "button_text": None,
        "summary": None,
        "source_url": "https://example.com",
        "gym_name": "Ironworks",
        "gym_short_name": "Ironworks",
        "gym_key": "ironworks",
        "event_type": "Mystery Class",
        "timezone": "America/Los_Angeles",
        "location": "Ironworks",
        "background_color": None,
        "text_color": None,
        "category_group": None,
    }
    defaults.update(overrides)
    return CalendarEvent(**defaults)


@pytest.mark.parametrize(
    ("background_color", "text_color", "expected"),
    [
        ("#96e700", "#000000", "yoga-classes"),
        ("#009c00", "#ffffff", "fitness-classes"),
        ("#1e5f76", "#ffffff", "intro-classes"),
        ("#aae4d2", "#000000", "climbing-clinics"),
        ("#f4605f", "#000000", "youth-programs"),
        ("#fccc39", "#000000", "affinity-meetup-groups"),
        ("#4a197a", "#ffffff", "gym-events"),
    ],
)
def test_classify_by_color_known_pairs(background_color, text_color, expected):
    assert classify_by_color(background_color, text_color) == expected


def test_classify_by_color_returns_none_without_background():
    assert classify_by_color(None, "#000000") is None
    assert classify_by_color("not-a-color", "#000000") is None


def test_event_group_id_prefers_storefront_over_color():
    event = _event(
        category_group="youth-programs",
        background_color="#96e700",
        text_color="#000000",
        title="Power Flow",
    )
    assert event_group_id(event) == "youth-programs"


def test_event_group_id_uses_color_before_regex():
    event = _event(
        background_color="#96e700",
        text_color="#000000",
        title="Mystery Class",
    )
    assert event_group_id(event) == "yoga-classes"


def test_event_group_id_falls_back_to_regex():
    event = _event(title="Power Flow")
    assert event_group_id(event) == "yoga-classes"

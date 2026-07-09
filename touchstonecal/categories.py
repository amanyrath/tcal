from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

from .display import display_name, normalize_event_type

if TYPE_CHECKING:
    from .api import CalendarEvent

FALLBACK_GROUP = "uncategorized"
SUBGROUP_OTHER = "other"

# Maps old pre-storefront category IDs to current storefront slugs.
_LEGACY_GROUP_IDS: dict[str, str] = {
    "notices": "gym-events",
    "intro-climbing": "intro-classes",
    "clinics": "climbing-clinics",
    "kids": "youth-programs",
    "community": "affinity-meetup-groups",
    "yoga": "yoga-classes",
    "fitness": "fitness-classes",
}


def _normalize_group_id(group_id: str) -> str:
    return _LEGACY_GROUP_IDS.get(group_id, group_id)


# Touchstone StorefrontCalendarGroup slugs and display titles.
STOREFRONT_GROUP_LABELS: dict[str, str] = {
    "intro-classes": "Intro Classes",
    "climbing-clinics": "Climbing Clinics",
    "yoga-classes": "Yoga Classes",
    "yoga-clinics": "Yoga Clinics",
    "fitness-classes": "Fitness Classes",
    "fitness-clinics": "Fitness Clinics",
    "affinity-meetup-groups": "Affinity Groups",
    "youth-programs": "Youth Programs",
    "gym-events": "Gym Events",
}

EXCLUDED_DISPLAY_NAMES: frozenset[str] = frozenset(
    {
        "rocket fundamentals",
        "fundamentals of yoga",
        "intro to barbell lifting",
        "beginner hip hop",
    }
)


@dataclass(frozen=True)
class SubgroupDef:
    id: str
    label: str
    patterns: tuple[str, ...]


@dataclass(frozen=True)
class CategoryGroup:
    id: str
    label: str
    patterns: tuple[str, ...]
    default_display_name: str | None = None
    hidden_by_default: bool = False
    off_by_default: bool = False


CATEGORY_GROUPS: tuple[CategoryGroup, ...] = (
    CategoryGroup(
        "intro-classes",
        "Intro Classes",
        (
            r"\balert\b",
            r"intro",
            r"first\s+time",
            r"beginner",
            r"fundamentals",
            r"orientation",
            r"learn\s+to\s+climb",
        ),
        "Intro to Climbing Class",
    ),
    CategoryGroup(
        "yoga-classes",
        "Yoga Classes",
        (
            r"\byoga\b",
            r"\bvinyasa\b",
            r"\bflow\b",
            r"\brestorative\b",
            r"\byin\b",
            r"\bhatha\b",
            r"\bslow\b",
            r"\bmellow\b",
            r"detox",
            r"slow\s+restore",
            r"\bpower\b",
            r"\bstretch\b",
            r"hot\s+yoga",
            r"bikram",
            r"heated",
            r"acro\s*yoga",
            r"acroyoga",
            r"\bacro\b",
        ),
        "Yoga for Climbers",
    ),
    CategoryGroup(
        "yoga-clinics",
        "Yoga Clinics",
        (
            r"yoga\s+clinic",
            r"yoga.*\bclinic\b",
            r"\bclinic\b.*yoga",
        ),
    ),
    CategoryGroup(
        "fitness-classes",
        "Fitness Classes",
        (
            r"hiit",
            r"\bhit\b",
            r"spin",
            r"bootcamp",
            r"fitness",
            r"strength",
            r"conditioning",
            r"workout",
            r"training",
            r"cross.?train",
            r"\bmobility\b",
            r"pilates",
            r"core",
            r"cardio",
            r"circuit",
            r"\bdance\b",
            r"hip\s*hop",
            r"zumba",
            r"barre",
            r"\btrx\b",
            r"\bbox(ing)?\b",
            r"kickbox",
        ),
        "HIIT Mixtapes",
    ),
    CategoryGroup(
        "fitness-clinics",
        "Fitness Clinics",
        (
            r"fitness\s+clinic",
            r"fitness.*\bclinic\b",
            r"\bclinic\b.*fitness",
            r"barbell.*clinic",
        ),
    ),
    CategoryGroup(
        "climbing-clinics",
        "Climbing Clinics",
        (
            r"\bclinic\b",
            r"lead\s+climb",
            r"anchor",
            r"multi.?pitch",
            r"trad",
            r"top.?rope",
            r"setting\s+clinic",
            r"technique",
        ),
        "Lead Climbing Clinic",
    ),
    CategoryGroup(
        "affinity-meetup-groups",
        "Affinity Groups",
        (
            r"queer\s+crush",
            r"paracliffhangers",
            r"para\s*cliff",
            r"paraclimb",
            r"escalemos",
            r"people'?s?\s+climbing\s+crew",
            r"waldahl",
            r"walldolls",
            r"filipina",
            r"filipinup",
            r"affinity",
            r"community",
            r"women",
            r"chicks",
            r"pride",
        ),
        "Queer Crush",
    ),
    CategoryGroup(
        "youth-programs",
        "Youth Programs",
        (
            r"summer\s+camp",
            r"\bcamp\b",
            r"kids?",
            r"youth",
            r"teen",
            r"junior",
            r"after.?school",
        ),
        "Summer Camp",
    ),
    CategoryGroup(
        "gym-events",
        "Gym Events",
        (
            r"speed\s+wall\s+hours",
            r"notice",
            r"closed",
            r"holiday",
            r"maintenance",
            r"hours?\s+change",
            r"gym\s+update",
            r"competition",
            r"comp\b",
            r"boulder\s+league",
            r"social",
            r"meetup",
            r"\bclub\b",
        ),
    ),
)

# Subgroups are touchstonecal-only (Touchstone has no subgroup structure).
# Each storefront group maps to a set of title-regex buckets for filter UI.
_YOGA_SUBGROUPS: tuple[SubgroupDef, ...] = (
    SubgroupDef(
        "power-vinyasa",
        "Power / Vinyasa",
        (r"\bpower\b", r"vinyasa", r"yoga\s+flow", r"\bflow\b"),
    ),
    SubgroupDef(
        "restorative",
        "Restorative",
        (
            r"restorative",
            r"\bslow\b",
            r"\byin\b",
            r"\bhatha\b",
            r"detox",
            r"slow\s+restore",
            r"\bmellow\b",
        ),
    ),
    SubgroupDef("other", "Other", ()),
)

_FITNESS_SUBGROUPS: tuple[SubgroupDef, ...] = (
    SubgroupDef(
        "hiit",
        "HIIT / Bootcamp",
        (r"hiit", r"\bhit\b", r"bootcamp", r"cardio", r"circuit"),
    ),
    SubgroupDef(
        "strength",
        "Strength",
        (r"strength", r"conditioning", r"lift", r"core", r"pilates", r"\btrx\b"),
    ),
    SubgroupDef("mobility", "Mobility", (r"\bmobility\b",)),
    SubgroupDef("other", "Other", ()),
)

SUBGROUPS: dict[str, tuple[SubgroupDef, ...]] = {
    "gym-events": (
        SubgroupDef(
            "notices",
            "Notices",
            (
                r"closed",
                r"holiday",
                r"maintenance",
                r"hours?\s+change",
                r"notice",
                r"speed\s+wall\s+hours",
                r"gym\s+update",
            ),
        ),
        SubgroupDef(
            "competitions",
            "Competitions",
            (r"competition", r"comp\b", r"boulder\s+league", r"kilter"),
        ),
        SubgroupDef(
            "social",
            "Social",
            (r"\bclub\b", r"social", r"meetup", r"swap", r"pass\s+day", r"run\s+club"),
        ),
        SubgroupDef("other", "Other", ()),
    ),
    "climbing-clinics": (
        SubgroupDef(
            "lead",
            "Lead & Advanced",
            (r"lead\s+climb", r"anchor", r"multi.?pitch", r"trad", r"top.?rope"),
        ),
        SubgroupDef("setting", "Setting & Technique", (r"setting", r"technique")),
        SubgroupDef("other", "Other", (r"\bclinic\b",)),
    ),
    "yoga-classes": _YOGA_SUBGROUPS,
    "yoga-clinics": _YOGA_SUBGROUPS,
    "fitness-classes": _FITNESS_SUBGROUPS,
    "fitness-clinics": _FITNESS_SUBGROUPS,
    "youth-programs": (
        SubgroupDef("summer-camp", "Summer Camp", (r"summer\s+camp", r"\bcamp\b")),
        SubgroupDef("other", "Other", (r"kids?", r"youth", r"teen", r"junior", r"after.?school")),
    ),
}

_COMPILED_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (group.id, re.compile("|".join(f"(?:{pattern})" for pattern in group.patterns), re.IGNORECASE))
    for group in CATEGORY_GROUPS
]

_COMPILED_SUBGROUPS: dict[str, list[tuple[str, re.Pattern[str]]]] = {}
for group_id, subgroup_defs in SUBGROUPS.items():
    compiled: list[tuple[str, re.Pattern[str]]] = []
    for subgroup in subgroup_defs:
        if subgroup.id == SUBGROUP_OTHER or not subgroup.patterns:
            continue
        compiled.append(
            (
                subgroup.id,
                re.compile(
                    "|".join(f"(?:{pattern})" for pattern in subgroup.patterns),
                    re.IGNORECASE,
                ),
            )
        )
    _COMPILED_SUBGROUPS[group_id] = compiled


@dataclass(frozen=True)
class TypeCatalogEntry:
    display_name: str
    count: int


@dataclass(frozen=True)
class SubgroupCatalog:
    id: str
    label: str
    types: tuple[TypeCatalogEntry, ...]


@dataclass(frozen=True)
class GroupCatalog:
    id: str
    label: str
    subgroups: tuple[SubgroupCatalog, ...]
    types: tuple[TypeCatalogEntry, ...]


def _normalize_hex_color(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    if re.fullmatch(r"#[0-9a-f]{6}", normalized):
        return normalized
    return None


def _hex_rgb(value: str) -> tuple[int, int, int]:
    return int(value[1:3], 16), int(value[3:5], 16), int(value[5:7], 16)


# Observed Touchstone calendar color pairs (bg, text) -> category group.
_COLOR_PAIR_MAP: dict[tuple[str, str], str] = {
    # Yoga: bright lime green + black text
    ("#96e700", "#000000"): "yoga-classes",
    ("#9cd414", "#000000"): "yoga-classes",
    ("#9dd611", "#000000"): "yoga-classes",
    ("#9ed710", "#000000"): "yoga-classes",
    ("#a0da10", "#000000"): "yoga-classes",
    ("#a1db13", "#000000"): "yoga-classes",
    ("#a1dc12", "#000000"): "yoga-classes",
    ("#a2dc11", "#000000"): "yoga-classes",
    ("#a4df11", "#000000"): "yoga-classes",
    ("#a6e113", "#000000"): "yoga-classes",
    ("#a8e511", "#000000"): "yoga-classes",
    ("#9ce515", "#000000"): "yoga-classes",
    # Fitness: dark green + white text
    ("#009c00", "#ffffff"): "fitness-classes",
    ("#019c00", "#ffffff"): "fitness-classes",
    ("#049923", "#ffffff"): "fitness-classes",
    ("#068c20", "#ffffff"): "fitness-classes",
    ("#068e20", "#ffffff"): "fitness-classes",
    ("#069021", "#ffffff"): "fitness-classes",
    ("#079823", "#ffffff"): "fitness-classes",
    ("#098d21", "#ffffff"): "fitness-classes",
    ("#1a9801", "#ffffff"): "fitness-classes",
    # Intro climbing: blue/teal + white text
    ("#1e5f76", "#ffffff"): "intro-classes",
    ("#40b0be", "#ffffff"): "intro-classes",
    # Clinics: light teal + black or white text
    ("#aae4d2", "#000000"): "climbing-clinics",
    ("#aae4d2", "#ffffff"): "climbing-clinics",
    ("#99e6d1", "#000000"): "climbing-clinics",
    # Kids: coral/red + black text
    ("#f4605f", "#000000"): "youth-programs",
    ("#e26a62", "#000000"): "youth-programs",
    # Community: yellow/gold + black text
    ("#fccc39", "#000000"): "affinity-meetup-groups",
    ("#ffca00", "#000000"): "affinity-meetup-groups",
    ("#ffcb00", "#000000"): "affinity-meetup-groups",
    ("#ffcb03", "#000000"): "affinity-meetup-groups",
    # Gym events
    ("#4a197a", "#ffffff"): "gym-events",
    ("#9cc4aa", "#000000"): "gym-events",
}


def _classify_by_color_heuristic(background_color: str, text_color: str) -> str | None:
    r, g, b = _hex_rgb(background_color)

    if text_color == "#000000":
        if r > 200 and g > 180 and b < 120:
            return "affinity-meetup-groups"
        if r > 190 and g < 150 and b < 150:
            return "youth-programs"
        if g > 160 and b > 160 and r < 200:
            return "climbing-clinics"
        if g > 150 and r > 80 and b < 100:
            return "yoga-classes"
        if 120 <= r <= 180 and 160 <= g <= 210 and 150 <= b <= 190:
            return "gym-events"

    if text_color == "#ffffff":
        if b > 120 and r < 120 and g < 190:
            return "intro-classes"
        if g > 80 and r < 100 and b < 100:
            return "fitness-classes"
        if r < 90 and g < 40 and b > 100:
            return "gym-events"

    return None


def classify_by_color(
    background_color: str | None, text_color: str | None
) -> str | None:
    bg = _normalize_hex_color(background_color)
    if bg is None:
        return None
    fg = _normalize_hex_color(text_color) or ""

    pair_match = _COLOR_PAIR_MAP.get((bg, fg))
    if pair_match:
        return pair_match

    if fg:
        return _classify_by_color_heuristic(bg, fg)
    return None


def is_excluded_event(title: str, event_type: str | None = None) -> bool:
    from .display import normalize_event_type

    candidates = {
        display_name(title).lower(),
        normalize_event_type(event_type or title).lower(),
    }
    return any(name in EXCLUDED_DISPLAY_NAMES for name in candidates)


def classify_event(title: str) -> str:
    haystack = display_name(title)
    for group_id, pattern in _COMPILED_PATTERNS:
        if pattern.search(haystack):
            return group_id
    return FALLBACK_GROUP


def _classify_yoga_subgroup(title: str) -> str:
    normalized = normalize_event_type(title)
    lower = normalized.lower()

    if re.search(r"\bhot\b|heated|bikram|hot\s+yoga", lower) or normalized == "Hot Vinyasa":
        return SUBGROUP_OTHER
    if re.search(r"acro\s*yoga|acroyoga|\bacro\b", lower, re.IGNORECASE):
        return SUBGROUP_OTHER
    if normalized in ("Vinyasa", "Power Vinyasa") or re.search(
        r"\bvinyasa\b|power\s+vinyasa", lower
    ):
        return "power-vinyasa"
    if normalized in ("Yoga Flow", "Yoga Flow Plus Core") or re.search(r"yoga\s+flow", lower):
        return "power-vinyasa"
    if normalized == "Power Flow" or (
        re.search(r"\bpower\b", lower) and re.search(r"\bflow\b", lower)
    ):
        return "power-vinyasa"
    if re.search(
        r"restorative|\bslow\b|\byin\b|\bhatha\b|detox|slow\s+restore|\bmellow\b",
        lower,
    ):
        return "restorative"
    return SUBGROUP_OTHER


def classify_subgroup(group_id: str, title: str) -> str:
    haystack = display_name(title)
    if group_id in ("fitness-classes", "fitness-clinics") and re.search(
        r"\bbox(ing)?\b|kickbox", haystack, re.IGNORECASE
    ):
        return SUBGROUP_OTHER
    if group_id in ("yoga-classes", "yoga-clinics"):
        return _classify_yoga_subgroup(title)
    for subgroup_id, pattern in _COMPILED_SUBGROUPS.get(group_id, []):
        if pattern.search(haystack):
            return subgroup_id
    return SUBGROUP_OTHER


def subgroup_label(group_id: str, subgroup_id: str) -> str:
    for subgroup in SUBGROUPS.get(group_id, ()):
        if subgroup.id == subgroup_id:
            return subgroup.label
    return "Other"


def event_group_id(event: CalendarEvent) -> str:
    if event.category_group:
        return _normalize_group_id(event.category_group)
    color_group = classify_by_color(event.background_color, event.text_color)
    if color_group:
        return color_group
    return classify_event(event.title)


def build_category_catalog(events: list[CalendarEvent]) -> list[GroupCatalog]:
    from .display import normalize_event_type

    counts: dict[str, dict[str, int]] = {group.id: {} for group in CATEGORY_GROUPS}
    subgroup_counts: dict[str, dict[str, dict[str, int]]] = {
        group.id: {} for group in CATEGORY_GROUPS
    }
    counts[FALLBACK_GROUP] = {}
    subgroup_counts[FALLBACK_GROUP] = {}

    for event in events:
        group_id = event_group_id(event)
        subgroup_id = classify_subgroup(group_id, event.title)
        name = normalize_event_type(event.event_type or event.title)

        group_counts = counts.setdefault(group_id, {})
        group_counts[name] = group_counts.get(name, 0) + 1

        sg_counts = subgroup_counts.setdefault(group_id, {}).setdefault(subgroup_id, {})
        sg_counts[name] = sg_counts.get(name, 0) + 1

    catalog: list[GroupCatalog] = []
    for group in CATEGORY_GROUPS:
        type_counts = counts.get(group.id, {})
        if not type_counts:
            continue

        flat_types = tuple(
            TypeCatalogEntry(display_name=name, count=count)
            for name, count in sorted(type_counts.items(), key=lambda item: (-item[1], item[0]))
        )

        subgroup_catalog: list[SubgroupCatalog] = []
        group_sg_counts = subgroup_counts.get(group.id, {})
        subgroup_defs = SUBGROUPS.get(group.id, ())

        if subgroup_defs:
            for subgroup_def in subgroup_defs:
                sg_type_counts = group_sg_counts.get(subgroup_def.id, {})
                if subgroup_def.id == SUBGROUP_OTHER:
                    sg_type_counts = group_sg_counts.get(SUBGROUP_OTHER, {})
                types = tuple(
                    TypeCatalogEntry(display_name=name, count=count)
                    for name, count in sorted(sg_type_counts.items(), key=lambda item: (-item[1], item[0]))
                )
                subgroup_catalog.append(
                    SubgroupCatalog(id=subgroup_def.id, label=subgroup_def.label, types=types)
                )
        else:
            subgroup_catalog = [SubgroupCatalog(id=SUBGROUP_OTHER, label="All", types=flat_types)]

        catalog.append(
            GroupCatalog(
                id=group.id,
                label=group.label,
                subgroups=tuple(subgroup_catalog),
                types=flat_types,
            )
        )

    uncategorized = counts.get(FALLBACK_GROUP, {})
    if uncategorized:
        types = tuple(
            TypeCatalogEntry(display_name=name, count=count)
            for name, count in sorted(uncategorized.items(), key=lambda item: (-item[1], item[0]))
        )
        catalog.append(
            GroupCatalog(
                id=FALLBACK_GROUP,
                label="Uncategorized",
                subgroups=(SubgroupCatalog(id=SUBGROUP_OTHER, label="All", types=types),),
                types=types,
            )
        )

    return catalog

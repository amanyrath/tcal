import re

from .config import ALL_GYMS

_INSTRUCTOR_SUFFIX = re.compile(
    r"\s+w/\s*.+$|\s+\|\s+with\s+.+$",
    re.IGNORECASE,
)

_GYM_LOCATION_TOKENS: tuple[str, ...] = tuple(
    sorted(
        {
            token
            for gym in ALL_GYMS
            for token in (
                gym.short_name,
                gym.name,
                gym.portal_slug.replace("-", " "),
                gym.website_path.replace("-", " "),
                gym.short_name.split()[-1] if " " in gym.short_name else "",
            )
            if token
        },
        key=len,
        reverse=True,
    )
)

_LOCATION_SUFFIX = re.compile(
    r"\s+@\s+.+$",
    re.IGNORECASE,
)

_GYM_SUFFIX = re.compile(
    r"\s+(?:"
    + "|".join(re.escape(token) for token in _GYM_LOCATION_TOKENS)
    + r")\s*$",
    re.IGNORECASE,
)

_EXCLUDED_YOGA_FLOW_INSTRUCTORS = re.compile(
    r"w/\s*(Brianna|Abby|Casey)\b|\bwith\s+(Brianna|Abby|Casey)\b",
    re.IGNORECASE,
)

_PRESERVED_YOGA_NAMES = re.compile(
    r"^(?:yoga\s+for\s+climbers|rocket\s+yoga)\b",
    re.IGNORECASE,
)

# "Hot" prefix must be preserved - do not strip trailing "Yoga" from these.
_HOT_PREFIX = re.compile(r"^hot\b", re.IGNORECASE)

_TRAILING_YOGA_SUFFIX = re.compile(r"\s+yoga\s*$", re.IGNORECASE)


def display_name(title: str) -> str:
    name = _INSTRUCTOR_SUFFIX.sub("", title).strip()
    name = _LOCATION_SUFFIX.sub("", name).strip()
    while True:
        cleaned = _GYM_SUFFIX.sub("", name).strip()
        if cleaned == name:
            break
        name = cleaned
    return name


def normalize_event_type(title: str) -> str:
    if _EXCLUDED_YOGA_FLOW_INSTRUCTORS.search(title):
        return title.strip()

    name = display_name(title)
    lower = name.lower()

    if re.search(r"power\s+vinyasa", lower):
        return "Power Vinyasa"

    if re.search(r"hot\s+vinyasa", lower):
        return "Hot Vinyasa"

    if re.search(r"vinyasa", lower):
        return "Vinyasa"

    if re.search(r"yoga\s+flow\s+plus\s+core", lower):
        return "Yoga Flow Plus Core"

    if re.search(r"yoga\s+flow", lower):
        return "Yoga Flow"

    if _PRESERVED_YOGA_NAMES.search(lower):
        return name

    if not _HOT_PREFIX.search(lower):
        stripped = _TRAILING_YOGA_SUFFIX.sub("", name).strip()
        if stripped and stripped.lower() != lower:
            return stripped

    return name

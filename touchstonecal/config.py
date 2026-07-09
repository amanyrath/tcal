import os
from dataclasses import dataclass


@dataclass(frozen=True)
class GymConfig:
    key: str
    name: str
    short_name: str
    facility_id: str
    portal_slug: str
    timezone: str
    website_path: str

    @property
    def calendar_url(self) -> str:
        return f"https://touchstoneclimbing.com/{self.website_path}/calendar/"

    @property
    def embed_url(self) -> str:
        return (
            f"https://portal.touchstoneclimbing.com/{self.portal_slug}/embed/calendar"
            "?origin=calendar&embedMode=lightbox"
        )

    @property
    def location(self) -> str:
        return self.name


ALL_GYMS: tuple[GymConfig, ...] = (
    GymConfig("ironworks", "Berkeley Ironworks", "Ironworks", "RmFjaWxpdHk6OA==", "ironworks", "America/Los_Angeles", "ironworks"),
    GymConfig("class-5", "Class 5", "Class 5", "RmFjaWxpdHk6MTI2NQ==", "class5", "America/Los_Angeles", "class-5"),
    GymConfig("cliffs-of-id", "Cliffs of Id", "Cliffs of Id", "RmFjaWxpdHk6MTI2OA==", "cliffs", "America/Los_Angeles", "cliffs-of-id"),
    GymConfig("diablo-rock", "Diablo Rock Gym", "Diablo Rock", "RmFjaWxpdHk6MTI3NA==", "diablo", "America/Los_Angeles", "diablorock"),
    GymConfig("dogpatch", "Dogpatch Boulders", "Dogpatch", "RmFjaWxpdHk6MTI3MQ==", "dogpatch", "America/Los_Angeles", "dogpatch-boulders"),
    GymConfig("gwpower-co", "Great Western Power Co", "Great Western", "RmFjaWxpdHk6MTI3Nw==", "power", "America/Los_Angeles", "gwpower-co"),
    GymConfig("hollywood-boulders", "Hollywood Boulders", "Hollywood", "RmFjaWxpdHk6MTI4MA==", "hollywood", "America/Los_Angeles", "hollywood-boulders"),
    GymConfig("hyperion", "Hyperion Climbing", "Hyperion", "RmFjaWxpdHk6MjgzMzA2NzY=", "hyperion", "America/Los_Angeles", "hyperion"),
    GymConfig("la-boulders", "LA Boulders", "LA.B", "RmFjaWxpdHk6MTI4Mw==", "la", "America/Los_Angeles", "la-boulders"),
    GymConfig("the-oaks", "The Oaks", "The Oaks", "RmFjaWxpdHk6MTI5NQ==", "oaks", "America/Los_Angeles", "the-oaks"),
    GymConfig("metalmark", "Metalmark", "Metalmark", "RmFjaWxpdHk6MTI4Ng==", "metalmark", "America/Los_Angeles", "metalmark"),
    GymConfig("mission-cliffs", "Mission Cliffs", "Mission Cliffs", "RmFjaWxpdHk6MTI4OQ==", "missioncliffs", "America/Los_Angeles", "mission-cliffs"),
    GymConfig("pacific-pipe", "Pacific Pipe", "Pacific Pipe", "RmFjaWxpdHk6MTMwNw==", "pacificpipe", "America/Los_Angeles", "pacific-pipe"),
    GymConfig("pipeworks", "Sacramento Pipeworks", "Pipeworks", "RmFjaWxpdHk6MTI5Mg==", "pipeworks", "America/Los_Angeles", "pipeworks"),
    GymConfig("the-post", "The Post", "The Post", "RmFjaWxpdHk6MTE=", "post", "America/Los_Angeles", "the-post"),
    GymConfig("the-studio", "The Studio Climbing", "The Studio", "RmFjaWxpdHk6MTI5OA==", "studio", "America/Los_Angeles", "the-studio"),
    GymConfig("verdigo-boulders", "Verdigo Boulders", "Verdigo", "RmFjaWxpdHk6MTMwMQ==", "verdigo", "America/Los_Angeles", "verdigo-boulders"),
)

GYM_PRESETS: dict[str, GymConfig] = {gym.key: gym for gym in ALL_GYMS}
DEFAULT_GYM = "all"
ALL_GYMS_KEY = "all"


def active_gyms() -> tuple[GymConfig, ...]:
    """Gyms this deployment fetches/serves.

    Controlled by the ``GYMS`` env var (comma-separated keys). Unknown keys are
    ignored; an empty or all-invalid value falls back to every gym.
    """
    raw = os.environ.get("GYMS", "").strip()
    if not raw:
        return ALL_GYMS
    keys = [token.strip() for token in raw.split(",") if token.strip()]
    selected = tuple(GYM_PRESETS[key] for key in keys if key in GYM_PRESETS)
    return selected or ALL_GYMS


def active_gyms_scope() -> str:
    """Stable signature of the active gym set, for namespacing shared cache keys."""
    return ",".join(sorted(gym.key for gym in active_gyms()))

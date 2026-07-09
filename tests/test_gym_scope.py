from touchstonecal.config import ALL_GYMS, active_gyms, active_gyms_scope
from touchstonecal.serialize import serialize_events_response


def test_active_gyms_defaults_to_all(monkeypatch):
    monkeypatch.delenv("GYMS", raising=False)
    assert active_gyms() == ALL_GYMS


def test_active_gyms_subset(monkeypatch):
    monkeypatch.setenv("GYMS", "pacific-pipe, gwpower-co ,ironworks,mission-cliffs")
    keys = [gym.key for gym in active_gyms()]
    assert keys == ["pacific-pipe", "gwpower-co", "ironworks", "mission-cliffs"]


def test_active_gyms_ignores_unknown_and_falls_back(monkeypatch):
    monkeypatch.setenv("GYMS", "pacific-pipe,not-a-gym")
    assert [gym.key for gym in active_gyms()] == ["pacific-pipe"]

    monkeypatch.setenv("GYMS", "nope,also-nope")
    assert active_gyms() == ALL_GYMS


def test_active_gyms_scope_is_sorted(monkeypatch):
    monkeypatch.setenv("GYMS", "ironworks,pacific-pipe")
    assert active_gyms_scope() == "ironworks,pacific-pipe"


def test_serialized_gyms_reflect_subset(monkeypatch):
    monkeypatch.setenv("GYMS", "pacific-pipe,ironworks")
    response = serialize_events_response([], 0.0)
    assert [gym["key"] for gym in response["gyms"]] == ["pacific-pipe", "ironworks"]

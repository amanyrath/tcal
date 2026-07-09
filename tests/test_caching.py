import threading
import time

from touchstonecal import cache
from touchstonecal.api import CalendarEvent, FetchReport
from touchstonecal.config import ALL_GYMS
from touchstonecal.store import (
    NullStore,
    RedisStore,
    build_store,
    compress_snapshot,
    decompress_snapshot,
    snapshot_from_json,
    snapshot_to_json,
)


def _event(uid: str) -> CalendarEvent:
    gym = ALL_GYMS[0]
    return CalendarEvent(
        uid=uid,
        title="Intro to Climbing",
        start_local="2026-01-01 10:00:00",
        end_local="2026-01-01 11:00:00",
        description="desc",
        capacity="Open",
        instructor="Sam",
        session_sequence=1,
        session_count=1,
        plan_id="p1",
        plan_slug="slug",
        button_text="Sign up",
        summary="summary",
        source_url="https://example.com",
        gym_name=gym.name,
        gym_short_name=gym.short_name,
        gym_key=gym.key,
        event_type="Intro to Climbing",
        timezone="America/Los_Angeles",
        location=gym.name,
        background_color="#009c00",
        text_color="#ffffff",
        category_group="intro-classes",
    )


def test_single_flight_dedupes_concurrent_refresh(monkeypatch):
    cache._store.update({"events": [], "updated_at": 0.0, "days_ahead": 30, "errors": {}})
    monkeypatch.setattr(cache, "_shared_store", NullStore())

    calls = {"n": 0}

    def slow(gyms, **kwargs):
        calls["n"] += 1
        time.sleep(0.1)
        return FetchReport(events=[_event("only-1")], errors={})

    monkeypatch.setattr(cache, "fetch_events_report", slow)

    results: list = []

    def worker():
        results.append(cache.get_cached_events(days_ahead=30))

    threads = [threading.Thread(target=worker) for _ in range(5)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert calls["n"] == 1
    assert all(events for events, _ in results)


def test_snapshot_json_roundtrip():
    events = [_event("a"), _event("b")]
    raw = snapshot_to_json(events, updated_at=123.0, errors={"g": "e"})
    restored, updated_at, errors = snapshot_from_json(raw)

    assert updated_at == 123.0
    assert errors == {"g": "e"}
    assert [e.uid for e in restored] == ["a", "b"]
    assert restored[0] == events[0]


def test_compress_snapshot_roundtrip_and_shrinks():
    events = [_event(f"e{i}") for i in range(50)]
    raw = snapshot_to_json(events, 1.0, {}).encode("utf-8")
    blob = compress_snapshot(events, 1.0, {})
    restored, updated_at, _ = decompress_snapshot(blob)

    assert updated_at == 1.0
    assert [e.uid for e in restored] == [e.uid for e in events]
    # Repetitive JSON should compress substantially.
    assert len(blob) < len(raw) // 2


def test_build_store_defaults_to_null(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    assert isinstance(build_store(ttl_seconds=100), NullStore)


def test_redis_store_roundtrip_with_fake_client():
    class FakeClient:
        def __init__(self):
            self.data = {}

        def set(self, key, value, ex=None):
            self.data[key] = value

        def get(self, key):
            return self.data.get(key)

    store = RedisStore(FakeClient(), ttl_seconds=100)
    events = [_event("x")]
    store.save("30:all", events, 5.0, {})
    loaded = store.load("30:all")

    assert loaded is not None
    restored, updated_at, _ = loaded
    assert updated_at == 5.0
    assert restored[0].uid == "x"


def test_shared_store_warms_cold_cache(monkeypatch):
    cache._store.update({"events": [], "updated_at": 0.0, "days_ahead": 30, "errors": {}})

    warm = [_event("warm-1")]

    class WarmStore(NullStore):
        def load(self, key):
            return warm, time.time(), {}

    monkeypatch.setattr(cache, "_shared_store", WarmStore())

    def should_not_run(gyms, **kwargs):
        raise AssertionError("upstream fetch should be skipped when store is warm")

    monkeypatch.setattr(cache, "fetch_events_report", should_not_run)

    events, _ = cache.get_cached_events(days_ahead=30)
    assert events == warm

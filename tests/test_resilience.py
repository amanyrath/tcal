import pytest

import touchstonecal.api as api
from touchstonecal.api import CalendarEvent, FetchReport, fetch_events, fetch_events_report
from touchstonecal.config import ALL_GYMS
from touchstonecal.serialize import serialize_events_response
from urllib.error import URLError


def _event(gym, uid: str) -> CalendarEvent:
    return CalendarEvent(
        uid=uid,
        title="Intro to Climbing",
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
        gym_name=gym.name,
        gym_short_name=gym.short_name,
        gym_key=gym.key,
        event_type="Intro to Climbing",
        timezone="America/Los_Angeles",
        location=gym.name,
        background_color=None,
        text_color=None,
    )


def test_fetch_events_report_isolates_failures(monkeypatch):
    gyms = list(ALL_GYMS[:2])
    good, bad = gyms[0], gyms[1]

    def fake(gym, **kwargs):
        if gym.key == bad.key:
            raise RuntimeError("boom")
        return [_event(gym, "uid-good")]

    monkeypatch.setattr(api, "fetch_gym_events", fake)
    report = fetch_events_report(gyms, parallel=False)

    assert len(report.events) == 1
    assert bad.key in report.errors
    assert report.partial is True


def test_fetch_events_raises_only_when_all_fail(monkeypatch):
    def boom(gym, **kwargs):
        raise RuntimeError("down")

    monkeypatch.setattr(api, "fetch_gym_events", boom)
    with pytest.raises(RuntimeError):
        fetch_events(list(ALL_GYMS[:2]))


def test_request_retries_transient_then_succeeds(monkeypatch):
    calls = {"n": 0}

    class FakeResp:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return b"ok"

    def fake_urlopen(request, timeout=None):
        calls["n"] += 1
        if calls["n"] < 2:
            raise URLError("temporary")
        return FakeResp()

    monkeypatch.setattr(api.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(api.time, "sleep", lambda seconds: None)

    assert api._request("http://example.test") == "ok"
    assert calls["n"] == 2


def test_cache_serves_stale_on_total_failure(monkeypatch):
    from touchstonecal import cache

    stale = [_event(ALL_GYMS[0], "stale-1")]
    cache._store.update(
        {"events": stale, "updated_at": 1.0, "days_ahead": 30, "errors": {}}
    )

    def all_fail(gyms, **kwargs):
        return FetchReport(events=[], errors={"g": "down"})

    monkeypatch.setattr(cache, "fetch_events_report", all_fail)
    events, updated_at = cache.get_cached_events(days_ahead=30, force=True)

    assert events == stale
    assert updated_at == 1.0
    assert cache.get_last_errors() == {"g": "down"}
    assert cache.get_health()["eventCount"] == 1


def test_serialize_surfaces_partial_and_errors():
    response = serialize_events_response([], 0.0, errors={"gym": "down"})
    assert response["partial"] is True
    assert response["fetchErrors"] == {"gym": "down"}

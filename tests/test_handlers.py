import importlib.util
import io
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]


def _load_module(filename: str):
    path = ROOT / "api" / filename
    spec = importlib.util.spec_from_file_location(f"apihandler_{filename[:-3]}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _make_handler(handler_cls, path: str, headers: dict | None = None):
    inst = handler_cls.__new__(handler_cls)
    inst.path = path
    inst.headers = headers or {}
    inst.wfile = io.BytesIO()
    inst.captured = {"status": None, "headers": {}, "explain": None}

    def send_response(code, message=None):
        inst.captured["status"] = code

    def send_header(key, value):
        inst.captured["headers"][key] = value

    def end_headers():
        return None

    def send_error(code, message=None, explain=None):
        inst.captured["status"] = code
        inst.captured["explain"] = explain

    inst.send_response = send_response
    inst.send_header = send_header
    inst.end_headers = end_headers
    inst.send_error = send_error
    return inst


def test_events_handler_rejects_bad_days():
    module = _load_module("events.py")
    inst = _make_handler(module.handler, "/api/events?days=abc")
    inst.do_GET()
    assert inst.captured["status"] == 400


def test_events_handler_success(monkeypatch):
    module = _load_module("events.py")
    monkeypatch.setattr(module, "get_cached_events", lambda **kwargs: ([], 123.0))
    monkeypatch.setattr(module, "get_last_errors", lambda: {})

    inst = _make_handler(module.handler, "/api/events?days=30")
    inst.do_GET()

    assert inst.captured["status"] == 200
    assert inst.captured["headers"]["Content-Type"].startswith("application/json")
    body = json.loads(inst.wfile.getvalue().decode("utf-8"))
    assert "events" in body and "gyms" in body and body["partial"] is False


def test_events_handler_returns_502_on_failure(monkeypatch):
    module = _load_module("events.py")

    def boom(**kwargs):
        raise RuntimeError("upstream down")

    monkeypatch.setattr(module, "get_cached_events", boom)
    inst = _make_handler(module.handler, "/api/events?days=30")
    inst.do_GET()
    assert inst.captured["status"] == 502


def test_health_handler_returns_status():
    module = _load_module("health.py")
    inst = _make_handler(module.handler, "/api/health")
    inst.do_GET()

    assert inst.captured["status"] == 200
    body = json.loads(inst.wfile.getvalue().decode("utf-8"))
    assert "status" in body and "eventCount" in body

import pytest

from touchstonecal.http_util import (
    BadRequest,
    clamp_days,
    env_int,
    parse_days,
    resolve_base_url,
)


def test_parse_days_default_when_missing():
    assert parse_days(None, default=30) == 30
    assert parse_days("", default=30) == 30


def test_parse_days_clamps_range():
    assert parse_days("0", default=30) == 1
    assert parse_days("9999", default=30) == 90
    assert parse_days("45", default=30) == 45


def test_parse_days_rejects_non_integer():
    with pytest.raises(BadRequest):
        parse_days("abc", default=30)


def test_env_int_falls_back_on_bad_value(monkeypatch):
    monkeypatch.setenv("SOME_INT", "not-a-number")
    assert env_int("SOME_INT", 42) == 42
    monkeypatch.delenv("SOME_INT", raising=False)
    assert env_int("SOME_INT", 42) == 42


def test_clamp_days_bounds():
    assert clamp_days(-5) == 1
    assert clamp_days(1000) == 90


def test_resolve_base_url_without_allowlist_trusts_request(monkeypatch):
    monkeypatch.delenv("ALLOWED_HOSTS", raising=False)
    url = resolve_base_url(
        forwarded_host="app.example.com", host=None, proto="https"
    )
    assert url == "https://app.example.com"


def test_resolve_base_url_blocks_spoofed_host(monkeypatch):
    monkeypatch.setenv("ALLOWED_HOSTS", "app.example.com")
    url = resolve_base_url(
        forwarded_host="evil.attacker.test", host=None, proto="https"
    )
    assert url == "https://app.example.com"


def test_resolve_base_url_defaults_scheme():
    url = resolve_base_url(forwarded_host="h.test", host=None, proto="ftp")
    assert url.startswith("https://")

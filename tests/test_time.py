from touchstonecal.api import _normalize_end_local


def test_normalize_end_local_rounds_59_seconds_up_one_minute():
    assert _normalize_end_local("2026-07-08 12:59:59") == "2026-07-08 13:00:00"
    assert _normalize_end_local("2026-07-08 18:14:59") == "2026-07-08 18:15:00"
    assert _normalize_end_local("2026-07-08 20:59:59") == "2026-07-08 21:00:00"


def test_normalize_end_local_leaves_clean_endings():
    assert _normalize_end_local("2026-07-08 20:00:00") == "2026-07-08 20:00:00"
    assert _normalize_end_local("2026-07-08 07:00:00") == "2026-07-08 07:00:00"

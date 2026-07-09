"""Logging and optional error-tracking setup.

Logging uses the stdlib. Sentry is optional and only activates when both
``SENTRY_DSN`` is set and the ``sentry-sdk`` package is installed, so the base
package stays dependency-free.
"""

from __future__ import annotations

import logging
import os

_configured = False


def init_observability() -> None:
    """Idempotently configure logging and (optionally) Sentry."""
    global _configured
    if _configured:
        return

    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    _init_sentry()
    _configured = True


def _init_sentry() -> None:
    dsn = os.environ.get("SENTRY_DSN")
    if not dsn:
        return
    try:
        import sentry_sdk  # guarded optional import
    except ImportError:
        logging.getLogger(__name__).warning(
            "SENTRY_DSN is set but 'sentry-sdk' is not installed; error tracking disabled"
        )
        return
    try:
        sample_rate = float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0"))
    except ValueError:
        sample_rate = 0.0
    sentry_sdk.init(dsn=dsn, traces_sample_rate=sample_rate)
    logging.getLogger(__name__).info("Sentry error tracking enabled")

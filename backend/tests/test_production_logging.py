"""
Production logging and the monitoring contract.

Three things this pins, all found by inspecting a running server rather than by
reading the code:

* **`X-Request-ID` was trusted verbatim.** A 300-character header was copied into
  every log line for that request, and a client could replay another request's ID
  to merge itself into that request's trace — the exact data an incident
  investigation depends on being trustworthy.

* **Every request produced two access log lines** (`app.access` and
  `uvicorn.access`), doubling log volume for zero extra information.

* **The log level was hardcoded**, so raising verbosity during an incident needed
  a code change and a redeploy.

It also asserts that the log strings MONITORING.md tells operators to alert on
actually exist in the source. An alert wired to a message that has since been
reworded is worse than no alert: it is silent, and it reads as coverage. That
check is the reason this file lives next to the code rather than in the runbook.

Runnable without pytest:  python -m tests.test_production_logging
(from backend/, with the project venv active)
"""
from __future__ import annotations

import logging
import os
import re
import sys
from pathlib import Path

from app.core.observability import _safe_request_id, configure_logging

BACKEND_DIR = Path(__file__).resolve().parents[1]

# The generated form: 12 hex characters from uuid4.
_GENERATED = re.compile(r"^[0-9a-f]{12}$")


def test_well_formed_request_id_is_honoured() -> list[str]:
    """Distributed tracing only works if a caller's ID survives, so it must."""
    failures = []
    for good in ("trace-abc_123.9", "0123456789abcdef", "A" * 64, "x"):
        if _safe_request_id(good) != good:
            failures.append(f"rejected a legitimate request id: {good!r}")
    return failures


def test_oversized_request_id_is_replaced() -> list[str]:
    """65 characters is over the limit; 300 was what a real curl got through."""
    failures = []
    for bad in ("A" * 65, "A" * 300):
        got = _safe_request_id(bad)
        if got == bad:
            failures.append(f"accepted an oversized request id ({len(bad)} chars)")
        elif not _GENERATED.match(got):
            failures.append(f"replacement id is not the generated form: {got!r}")
    return failures


def test_hostile_request_id_is_replaced() -> list[str]:
    """
    Anything outside [A-Za-z0-9._-] is refused. Raw newlines are already rejected
    by the HTTP parser, so this is not the last line of defence against log
    forging — but it is the one that does not depend on the server's parser.
    """
    hostile = [
        "evil id; DROP",
        "a\tb",
        "../../etc/passwd",
        "\x1b[31mred",           # ANSI escape — would recolour an operator's terminal
        "id=1&admin=true",
        "",
        None,
    ]
    failures = []
    for bad in hostile:
        got = _safe_request_id(bad)
        if got == bad:
            failures.append(f"accepted a hostile request id: {bad!r}")
        elif not _GENERATED.match(got):
            failures.append(f"replacement id is not the generated form: {got!r}")
    return failures


def test_log_level_is_configurable() -> list[str]:
    """
    DEBUG must be reachable by configuration. Restores whatever was set so this
    check cannot change the level seen by later checks in the same process.
    """
    from app.core.config import settings

    original_setting = settings.LOG_LEVEL
    original_level = logging.getLogger().level
    failures = []
    try:
        for value, expected in (("DEBUG", logging.DEBUG), ("warning", logging.WARNING)):
            settings.LOG_LEVEL = value
            configure_logging()
            if logging.getLogger().level != expected:
                failures.append(
                    f"LOG_LEVEL={value!r} produced "
                    f"{logging.getLevelName(logging.getLogger().level)}"
                )
    finally:
        settings.LOG_LEVEL = original_setting
        configure_logging()
        logging.getLogger().setLevel(original_level)
    return failures


def test_bad_log_level_falls_back_rather_than_silencing() -> list[str]:
    """
    `logging.getLevelName("NONSENSE")` returns a *string*, and passing that to
    setLevel raises. A typo in an env var must not stop the service from booting,
    and must not leave it logging nothing.
    """
    from app.core.config import settings

    original_setting = settings.LOG_LEVEL
    original_level = logging.getLogger().level
    failures = []
    try:
        for value in ("NONSENSE", "", "  ", "12abc"):
            settings.LOG_LEVEL = value
            try:
                configure_logging()
            except Exception as exc:
                failures.append(f"LOG_LEVEL={value!r} raised at startup: {exc!r}")
                continue
            if logging.getLogger().level != logging.INFO:
                failures.append(
                    f"LOG_LEVEL={value!r} fell back to "
                    f"{logging.getLevelName(logging.getLogger().level)}, expected INFO"
                )
    finally:
        settings.LOG_LEVEL = original_setting
        configure_logging()
        logging.getLogger().setLevel(original_level)
    return failures


def test_access_log_is_not_duplicated() -> list[str]:
    """
    One request must produce one access line. `app.access` is a superset of
    uvicorn's (it carries the request ID and the duration), so uvicorn's is
    disabled rather than both being kept.
    """
    configure_logging()
    if not logging.getLogger("uvicorn.access").disabled:
        return ["uvicorn.access is enabled — every request logs twice"]
    return []


def test_request_id_reaches_every_log_record() -> list[str]:
    """
    The correlation ID is injected by a filter on the root handler. If that filter
    is missing, the formatter raises on `%(request_id)s` and the log line is lost —
    so this is about not losing logs, not about tidiness.
    """
    configure_logging()
    root = logging.getLogger()
    if not root.handlers:
        return ["root logger has no handler after configure_logging()"]
    handler = root.handlers[0]
    record = logging.LogRecord("t", logging.INFO, __file__, 1, "msg", None, None)
    for f in handler.filters:
        f.filter(record)
    if not hasattr(record, "request_id"):
        return ["no filter set request_id — the formatter would raise and drop the line"]
    try:
        handler.format(record)
    except Exception as exc:
        return [f"formatting a record failed: {exc!r}"]
    return []


# ── The monitoring contract ──────────────────────────────────────────────────
# Substrings an operator greps or wires an alert to, and the file each must live
# in. Reworded messages break alerts silently, which is the failure mode this
# exists to catch.
ALERT_SIGNALS = [
    ("app/parser/factory.py", "Scrubbed instruction-like content"),
    ("app/llm/batch_analyzer.py", "unevidenced matching_skills"),
]


def test_alert_signals_still_exist() -> list[str]:
    failures = []
    for rel, needle in ALERT_SIGNALS:
        path = BACKEND_DIR / rel
        if not path.exists():
            failures.append(f"{rel} no longer exists — the alert on {needle!r} is dead")
            continue
        if needle not in path.read_text(encoding="utf-8"):
            failures.append(
                f"{needle!r} is gone from {rel} — MONITORING.md alerts on this string"
            )
    return failures


def test_health_endpoint_never_exposes_secrets() -> list[str]:
    """
    /health is unauthenticated and probed by external monitors. It reports whether
    each dependency is *configured*, and must never report with what.
    """
    from app.main import health_check
    import asyncio

    payload = asyncio.run(health_check())
    flat = repr(payload)
    failures = []
    for marker in ("gsk_", "eyJ", "service_role", "sb_secret", "SUPABASE_SERVICE"):
        if marker in flat:
            failures.append(f"/health payload contains {marker!r}")
    deps = payload.get("dependencies", {})
    for name in ("llm", "persistence", "auth"):
        if name not in deps:
            failures.append(f"/health lost the {name!r} dependency — deploy gate checks it")
        elif deps[name] not in ("configured", "not_configured"):
            failures.append(f"/health {name} reported {deps[name]!r}, not a configured/not state")
    return failures


def main() -> int:
    checks = [
        test_well_formed_request_id_is_honoured,
        test_oversized_request_id_is_replaced,
        test_hostile_request_id_is_replaced,
        test_log_level_is_configurable,
        test_bad_log_level_falls_back_rather_than_silencing,
        test_access_log_is_not_duplicated,
        test_request_id_reaches_every_log_record,
        test_alert_signals_still_exist,
        test_health_endpoint_never_exposes_secrets,
    ]
    all_failures: list[str] = []
    for check in checks:
        print(f"\n{check.__name__}")
        failures = check()
        if failures:
            for f in failures:
                print(f"  FAIL  {f}")
            all_failures.extend(failures)
        else:
            print("  passed")

    print("\n" + "-" * 62)
    if all_failures:
        print(f"FAILED — {len(all_failures)} problem(s)")
        return 1
    print(f"PASSED — {len(checks)} production-logging & monitoring checks")
    return 0


if __name__ == "__main__":
    sys.exit(main())

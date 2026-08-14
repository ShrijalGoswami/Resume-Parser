"""
Deployment configuration: env vars, the Render blueprint, and the container files.

`Settings` uses `extra="ignore"`, which is the right default — but it means a
misspelled variable name is *silently discarded*. `SUPBASE_URL` set in a hosting
dashboard produces no error, no warning, and a service that boots healthy with no
database. That single behaviour is why most of this file exists.

The concrete defect it was written after: `render.yaml` declared six env vars and
none of them were the Supabase ones, so applying the blueprint produced a
production service where sign-in and every authenticated route were dead while
`/health` returned 200.

Runnable without pytest:  python -m tests.test_deployment_config
(from backend/, with the project venv active)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from app.core.config import Settings

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent
FRONTEND_DIR = REPO_DIR / "frontend"

SETTINGS_FIELDS = set(Settings.model_fields)

# Supplied by the platform, not read through Settings.
PLATFORM_VARS = {"PYTHON_VERSION", "PORT", "NODE_ENV", "HOSTNAME"}

# Without each of these, a production deployment is broken in a way that is not
# obvious from the outside. Every one must be named in the deployment doc, because
# the doc is what someone provisioning a new environment actually works from.
PRODUCTION_REQUIRED = [
    "ENVIRONMENT",
    "ALLOWED_ORIGINS",
    "GROQ_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TRUST_PROXY_HEADERS",
]

# The frontend's entire runtime configuration surface. Kept short on purpose:
# every entry is inlined into the browser bundle at build time.
FRONTEND_PUBLIC_VARS = {
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
}


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _env_keys(text: str) -> list[str]:
    return re.findall(r"^([A-Z][A-Z0-9_]*)=", text, re.M)


def test_render_blueprint_vars_are_real_settings() -> list[str]:
    """A key that is not a Settings field is ignored at runtime, silently."""
    keys = re.findall(r"^\s*-\s*key:\s*(\S+)", _read(BACKEND_DIR / "render.yaml"), re.M)
    if not keys:
        return ["could not parse any env keys out of render.yaml"]
    return [
        f"render.yaml sets {k!r}, which is not a Settings field — it is silently ignored"
        for k in keys
        if k not in SETTINGS_FIELDS and k not in PLATFORM_VARS
    ]


def test_render_blueprint_declares_persistence() -> list[str]:
    """
    The regression this file was written for. Without these the blueprint yields a
    healthy-looking service with no database.
    """
    text = _read(BACKEND_DIR / "render.yaml")
    return [
        f"render.yaml does not declare {name} — applying the blueprint produces a "
        f"service with no persistence and no warning at provision time"
        for name in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY")
        if f"key: {name}" not in text
    ]


def test_secrets_are_never_committed_to_the_blueprint() -> list[str]:
    """
    Secrets must be `sync: false` (prompted for, stored by the platform), never a
    literal `value:`. A committed key is in the git history permanently.
    """
    text = _read(BACKEND_DIR / "render.yaml")
    failures = []
    secret_ish = ("GROQ_API_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
                  "SUPABASE_JWT_SECRET", "SUPABASE_URL")
    for name in secret_ish:
        block = re.search(rf"key:\s*{name}\s*\n\s*(\S+):", text)
        if block and block.group(1) == "value":
            failures.append(f"render.yaml hardcodes a value for {name} — use `sync: false`")
    return failures


def test_env_examples_only_name_real_settings() -> list[str]:
    """A stale name in the template teaches the next deployer to set a no-op."""
    failures = []
    for key in _env_keys(_read(BACKEND_DIR / ".env.example")):
        if key not in SETTINGS_FIELDS and key not in PLATFORM_VARS:
            failures.append(f"backend/.env.example names {key!r}, not a Settings field")

    docker_example = REPO_DIR / ".env.docker.example"
    if docker_example.exists():
        allowed = SETTINGS_FIELDS | PLATFORM_VARS | FRONTEND_PUBLIC_VARS
        for key in _env_keys(_read(docker_example)):
            if key not in allowed:
                failures.append(f".env.docker.example names {key!r}, which nothing reads")
    return failures


def test_production_required_vars_are_documented() -> list[str]:
    """
    Someone provisioning an environment works from the doc, not from config.py.
    An undocumented required variable becomes an outage on the first deploy.
    """
    doc = REPO_DIR / "docs" / "DEPLOYMENT.md"
    if not doc.exists():
        return ["docs/DEPLOYMENT.md is missing — nothing documents the env contract"]
    text = _read(doc)
    return [
        f"{name} is required in production but is not mentioned in docs/DEPLOYMENT.md"
        for name in PRODUCTION_REQUIRED
        if name not in text
    ]


def test_no_server_secret_is_exposed_to_the_browser() -> list[str]:
    """
    Anything prefixed NEXT_PUBLIC_ is compiled into the client bundle. A
    service-role key there is a full RLS bypass handed to every visitor.
    """
    failures = []
    for name in SETTINGS_FIELDS:
        if not name.startswith("NEXT_PUBLIC_"):
            continue
        if any(word in name for word in ("SERVICE_ROLE", "SECRET", "JWT")):
            failures.append(f"{name} is browser-visible but looks like a server secret")

    # And the reverse direction: the frontend template must not carry one.
    fe_example = FRONTEND_DIR / ".env.example"
    if fe_example.exists():
        text = _read(fe_example)
        for marker in ("SERVICE_ROLE", "SUPABASE_SECRET", "GROQ_API_KEY"):
            if marker in text:
                failures.append(f"frontend .env.example mentions {marker} — server-only")
    return failures


def test_frontend_env_surface_matches_its_template() -> list[str]:
    """
    Every NEXT_PUBLIC_* the code reads must be in the template, and vice versa. A
    variable the code reads but nobody documents is a blank string in production,
    which surfaces as an unexplained runtime failure rather than a config error.
    """
    if not FRONTEND_DIR.exists():
        return []
    used: set[str] = set()
    for path in FRONTEND_DIR.rglob("*.ts*"):
        if "node_modules" in path.parts or ".next" in path.parts:
            continue
        used |= set(re.findall(r"process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)", _read(path)))

    documented = set(_env_keys(_read(FRONTEND_DIR / ".env.example")))
    failures = [f"{v} is read by the frontend but absent from its .env.example"
                for v in sorted(used - documented)]
    failures += [f"{v} is in the frontend .env.example but nothing reads it"
                 for v in sorted(documented - used - FRONTEND_PUBLIC_VARS)]
    return failures


def test_container_and_host_start_commands_agree() -> list[str]:
    """
    Procfile, render.yaml and the Dockerfile all start the same app. If one drops
    `--proxy-headers`, that deployment silently loses per-client rate limiting and
    stops emitting HSTS — with no error anywhere.
    """
    sources = {
        "Procfile": BACKEND_DIR / "Procfile",
        "render.yaml": BACKEND_DIR / "render.yaml",
        "Dockerfile": BACKEND_DIR / "Dockerfile",
    }
    failures = []
    for name, path in sources.items():
        if not path.exists():
            failures.append(f"{name} is missing")
            continue
        text = _read(path)
        if "uvicorn app.main:app" not in text:
            failures.append(f"{name} does not start app.main:app")
        for flag in ("--proxy-headers", "--forwarded-allow-ips"):
            if flag not in text:
                failures.append(f"{name} is missing {flag} — client IP and HSTS break")
    return failures


def test_deploy_paths_install_the_pinned_dependency_set() -> list[str]:
    """
    requirements.txt declares open lower bounds, so installing from it produces a
    different application on different days. Both deploy paths must use the lock.
    """
    lock = BACKEND_DIR / "requirements.lock.txt"
    if not lock.exists():
        return ["backend/requirements.lock.txt is missing — deploys are unpinned"]

    failures = []
    pins = [ln for ln in _read(lock).splitlines()
            if ln.strip() and not ln.startswith("#")]
    unpinned = [ln for ln in pins if "==" not in ln]
    if unpinned:
        failures.append(f"lock file has {len(unpinned)} unpinned line(s): {unpinned[:3]}")

    for name, path in (("render.yaml", BACKEND_DIR / "render.yaml"),
                       ("Dockerfile", BACKEND_DIR / "Dockerfile")):
        text = _read(path)
        if "requirements.lock.txt" not in text:
            failures.append(f"{name} installs from requirements.txt, not the lock")

    # Everything declared in requirements.txt must actually be pinned somewhere in
    # the lock, or the lock was generated from a different set of intentions.
    declared = re.findall(r"^([A-Za-z][A-Za-z0-9._-]*)",
                          _read(BACKEND_DIR / "requirements.txt"), re.M)
    locked = {ln.split("==")[0].lower().replace("_", "-") for ln in pins}
    for pkg in declared:
        if pkg.lower().replace("_", "-") not in locked:
            failures.append(f"{pkg} is in requirements.txt but not pinned in the lock")
    return failures


def test_dockerignore_keeps_secrets_out_of_the_image() -> list[str]:
    """
    `COPY . .` with an unignored .env bakes the service-role key into an image
    layer, where deleting the file in a later layer does not remove it.
    """
    failures = []
    for name, path in (("backend", BACKEND_DIR / ".dockerignore"),
                       ("frontend", FRONTEND_DIR / ".dockerignore")):
        if not path.exists():
            failures.append(f"{name} has no .dockerignore — .env would be copied in")
            continue
        text = _read(path)
        if ".env" not in text:
            failures.append(f"{name}/.dockerignore does not exclude .env")
    return failures


def main() -> int:
    checks = [
        test_render_blueprint_vars_are_real_settings,
        test_render_blueprint_declares_persistence,
        test_secrets_are_never_committed_to_the_blueprint,
        test_env_examples_only_name_real_settings,
        test_production_required_vars_are_documented,
        test_no_server_secret_is_exposed_to_the_browser,
        test_frontend_env_surface_matches_its_template,
        test_container_and_host_start_commands_agree,
        test_deploy_paths_install_the_pinned_dependency_set,
        test_dockerignore_keeps_secrets_out_of_the_image,
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
    print(f"PASSED — {len(checks)} deployment-configuration checks")
    return 0


if __name__ == "__main__":
    sys.exit(main())

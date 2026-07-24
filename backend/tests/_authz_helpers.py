"""
Live infrastructure helpers for the runtime tenant-isolation suite
(tests/test_tenant_isolation.py).

These helpers are DESTRUCTIVE: they create and delete real Supabase auth users,
database rows and Storage objects. They are therefore usable ONLY behind the
`preflight()` safety gate, which refuses to run unless the target is explicitly
a non-production project with an opt-in flag set.

No test framework and no new dependencies: this uses supabase-py, httpx and
PyJWT — all already installed for the backend.

Run only via:  python -m tests.test_tenant_isolation   (from backend/, venv active)
"""
from __future__ import annotations

import os
import time
import uuid
from dataclasses import dataclass
from typing import Any, Optional

import httpx
import jwt as pyjwt
from supabase import Client, ClientOptions, create_client

from app.core.config import settings


class GuardError(RuntimeError):
    """Raised when the safety preconditions for a destructive run are not met."""


# ── Suite configuration (env-driven) ─────────────────────────────────────────
BASE_URL = os.getenv("HL_TEST_BASE_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api/v1"
TEST_EMAIL_DOMAIN = os.getenv("HL_TEST_EMAIL_DOMAIN", "example.com")
TEST_PREFIX = "hl-authz-"
# Static strong password for throwaway test users (deleted on teardown).
TEST_PASSWORD = os.getenv("HL_TEST_PASSWORD", "HL-authz-" + uuid.uuid5(uuid.NAMESPACE_DNS, "hirelens").hex[:12] + "!Aa9")

# A minimal but valid PDF (passes the upload magic-byte + extension checks).
PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n"
    b"trailer<</Root 1 0 R>>\n"
    b"%%EOF\n"
)


def _anon_key() -> str:
    return settings.supabase_anon_key


def _service_key() -> str:
    return settings.supabase_service_key


# ── Safety gate ──────────────────────────────────────────────────────────────
def preflight() -> None:
    """
    Abort unless ALL destructive-run preconditions hold:
      1. HL_ALLOW_DESTRUCTIVE_TESTS=1  (explicit opt-in)
      2. ENVIRONMENT is non-production  (never prod)
      3. Supabase is fully configured   (URL + anon + service-role)
    The suite is additionally gated behind __main__ so nothing runs on import.
    """
    if os.getenv("HL_ALLOW_DESTRUCTIVE_TESTS") != "1":
        raise GuardError(
            "Refusing to run: this suite creates/deletes real users & data. "
            "Set HL_ALLOW_DESTRUCTIVE_TESTS=1 to opt in."
        )
    env = (settings.ENVIRONMENT or "").strip().lower()
    if env in ("production", "prod"):
        raise GuardError(f"Refusing to run against ENVIRONMENT={settings.ENVIRONMENT!r} (production).")
    if not env:
        raise GuardError("ENVIRONMENT is unset. Set ENVIRONMENT=staging (must be non-production).")
    if not settings.SUPABASE_URL or not _anon_key() or not _service_key():
        raise GuardError(
            "Supabase not fully configured. Need SUPABASE_URL + anon key + service-role key "
            "(this is a live, non-production project)."
        )


# ── Supabase clients ─────────────────────────────────────────────────────────
def _opts(token: Optional[str] = None) -> ClientOptions:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return ClientOptions(auto_refresh_token=False, persist_session=False, headers=headers)


def service_client() -> Client:
    """Service-role client (bypasses RLS). Used ONLY to seed fixtures and to
    read ground truth when asserting that a tenant's data is intact/invisible."""
    return create_client(settings.SUPABASE_URL, _service_key(), _opts())


def anon_client() -> Client:
    return create_client(settings.SUPABASE_URL, _anon_key(), _opts())


def user_client(token: str) -> Client:
    """Anon client acting AS a user (RLS enforced) — the direct-DB / Storage probe."""
    c = create_client(settings.SUPABASE_URL, _anon_key(), _opts(token))
    try:
        c.postgrest.auth(token)
    except Exception:  # pragma: no cover - sdk version differences
        pass
    return c


# ── Actors ───────────────────────────────────────────────────────────────────
@dataclass
class Actor:
    label: str
    email: str = ""
    password: str = TEST_PASSWORD
    user_id: str = ""
    token: str = ""
    org_id: str = ""
    campaign_id: str = ""
    candidate_id: str = ""
    note_id: str = ""
    rec_id: str = ""
    resume_path: str = ""


def _email(label: str) -> str:
    return f"{TEST_PREFIX}{label}@{TEST_EMAIL_DOMAIN}"


def _user_id_of(resp: Any) -> str:
    user = getattr(resp, "user", None) or resp
    return getattr(user, "id", "") or ""


def purge_test_users(svc: Client) -> int:
    """Delete any leftover users from a prior crashed run (idempotency)."""
    removed = 0
    try:
        page = svc.auth.admin.list_users()
        users = page if isinstance(page, list) else (getattr(page, "users", None) or [])
        for u in users:
            email = (getattr(u, "email", "") or "")
            if email.startswith(TEST_PREFIX):
                try:
                    svc.auth.admin.delete_user(u.id)
                    removed += 1
                except Exception:
                    pass
    except Exception:
        pass
    return removed


def create_actor(svc: Client, label: str) -> Actor:
    email = _email(label)
    resp = svc.auth.admin.create_user(
        {"email": email, "password": TEST_PASSWORD, "email_confirm": True}
    )
    uid = _user_id_of(resp)
    if not uid:
        raise RuntimeError(f"Failed to create test user {email}")
    return Actor(label=label, email=email, user_id=uid)


def sign_in(actor: Actor) -> None:
    resp = anon_client().auth.sign_in_with_password(
        {"email": actor.email, "password": TEST_PASSWORD}
    )
    session = getattr(resp, "session", None)
    token = getattr(session, "access_token", "") if session else ""
    if not token:
        raise RuntimeError(f"Sign-in returned no access token for {actor.email}")
    actor.token = token


def load_org(svc: Client, actor: Actor, retries: int = 6) -> None:
    """Read the org id the signup trigger auto-provisioned (best-effort)."""
    for _ in range(retries):
        rows = svc.table("recruiters").select("organization_id").eq("id", actor.user_id).execute().data
        if rows and rows[0].get("organization_id"):
            actor.org_id = rows[0]["organization_id"]
            return
        time.sleep(0.5)


# ── HTTP to the backend API ──────────────────────────────────────────────────
def api(method: str, path: str, token: Optional[str] = None, *, json: Any = None,
        files: Any = None, timeout: float = 30.0) -> httpx.Response:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    with httpx.Client(timeout=timeout) as client:
        return client.request(method, f"{API}{path}", headers=headers, json=json, files=files)


# ── Forged tokens for the auth-gate negatives ────────────────────────────────
def forge_jwt(secret: str, *, sub: Optional[str] = None, exp_delta: int = 3600,
              aud: str = "authenticated", key: Optional[str] = None) -> str:
    now = int(time.time())
    payload = {
        "sub": sub or str(uuid.uuid4()),
        "aud": aud,
        "role": "authenticated",
        "iat": now,
        "exp": now + exp_delta,
    }
    return pyjwt.encode(payload, key or (secret or "no-secret"), algorithm="HS256")


# ── Fixture seeding ──────────────────────────────────────────────────────────
def seed_tenant(svc: Client, actor: Actor) -> None:
    """Create one campaign (via API, under the user's token) plus a candidate,
    note, recommendation (via service client to avoid any LLM call), and upload
    a résumé (via API, exercising the real storage path)."""
    r = api("POST", "/campaigns", token=actor.token,
            json={"title": f"AuthZ {actor.label.upper()}", "job_description": "Runtime authz fixture."})
    if r.status_code not in (200, 201):
        raise RuntimeError(f"seed campaign failed for {actor.label}: {r.status_code} {r.text}")
    actor.campaign_id = r.json()["id"]

    cand = svc.table("candidates").insert({
        "campaign_id": actor.campaign_id, "recruiter_id": actor.user_id,
        "full_name": f"Candidate {actor.label.upper()}", "stage": "sourced",
    }).execute().data[0]
    actor.candidate_id = cand["id"]

    note = svc.table("recruiter_notes").insert({
        "candidate_id": actor.candidate_id, "campaign_id": actor.campaign_id,
        "recruiter_id": actor.user_id, "body": f"{actor.label} private note",
    }).execute().data[0]
    actor.note_id = note["id"]

    rec = svc.table("agent_recommendations").insert({
        "recruiter_id": actor.user_id, "workflow": "authz_test", "dedupe_key": f"authz-{actor.label}",
        "title": "fixture", "campaign_id": actor.campaign_id, "status": "pending",
    }).execute().data[0]
    actor.rec_id = rec["id"]

    up = api("POST", f"/campaigns/{actor.campaign_id}/candidates/{actor.candidate_id}/resume",
             token=actor.token, files={"file": ("resume.pdf", PDF_BYTES, "application/pdf")})
    if up.status_code in (200, 201):
        actor.resume_path = (up.json() or {}).get("resume_path") or ""


# ── Ground-truth reads + teardown ────────────────────────────────────────────
def svc_row(svc: Client, table: str, val: str, col: str = "id") -> Optional[dict]:
    rows = svc.table(table).select("*").eq(col, val).limit(1).execute().data
    return rows[0] if rows else None


def _purge_storage(svc: Client, actor: Actor) -> None:
    if actor.resume_path:
        try:
            svc.storage.from_(settings.STORAGE_BUCKET_RESUMES).remove([actor.resume_path])
        except Exception:
            pass


def teardown(svc: Client, *actors: Optional[Actor]) -> None:
    """Delete every created resource. Deleting the auth user cascades DB rows;
    Storage objects are removed explicitly first. Safe to call with None / partial."""
    for actor in actors:
        if not actor:
            continue
        _purge_storage(svc, actor)
        try:
            if actor.user_id:
                svc.auth.admin.delete_user(actor.user_id)
        except Exception:
            pass

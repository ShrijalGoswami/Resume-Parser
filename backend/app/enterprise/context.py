"""
Organization context resolution.

Resolves the authenticated recruiter's active organization, workspace, role, plan,
and feature flags into an `OrgContext` — the object every authorization decision
reads from. Resolution uses the user-scoped Supabase client (RLS: a user only sees
their own membership/org), so it is trusted. Privileged mutations then use the
service client scoped explicitly to this resolved organization_id.
"""

from __future__ import annotations

import contextvars
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Callable, Optional

from fastapi import HTTPException, status

from app.core.auth import CurrentRecruiter
from app.db.supabase_client import get_user_client
from app.enterprise.feature_flags import resolve_all
from app.enterprise.plans import limits_for
from app.enterprise.rbac import Permission, has_permission, permissions_for_role

logger = logging.getLogger(__name__)


def _describe(exc: BaseException) -> str:
    """`module.ClassName: message` — plus the same for every chained cause.

    The SDK stack wraps failures several layers deep (an `httpx.ConnectError`
    surfaces as a `postgrest.APIError`, a storage failure as a `StorageApiError`),
    and the *outermost* type is almost never the one that tells you what went
    wrong. Walking `__cause__`/`__context__` is what turns "Organization lookup
    failed" into an actionable line.
    """
    parts: list[str] = []
    seen: set[int] = set()
    cur: Optional[BaseException] = exc
    while cur is not None and id(cur) not in seen and len(parts) < 6:
        seen.add(id(cur))
        parts.append(f"{type(cur).__module__}.{type(cur).__qualname__}: {cur}")
        cur = cur.__cause__ or cur.__context__
    return " <- ".join(parts)

# Request-scoped org id so cross-cutting concerns (usage/audit) can attribute
# activity to an organization without threading it through every call.
current_org_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_org_id", default=None)


@dataclass
class OrgContext:
    recruiter: CurrentRecruiter
    organization_id: str
    organization_name: str
    plan: str
    role: str
    workspace_id: Optional[str] = None
    settings: dict = field(default_factory=dict)
    feature_overrides: dict[str, bool] = field(default_factory=dict)

    def has(self, permission: Permission) -> bool:
        return has_permission(self.role, permission)

    def require(self, permission: Permission) -> None:
        if not self.has(permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"Your role ('{self.role}') lacks permission '{permission.value}'.")

    def features(self) -> dict[str, bool]:
        return resolve_all(self.plan, self.feature_overrides)

    def feature_enabled(self, feature: str) -> bool:
        return self.features().get(feature, False)

    def permissions(self) -> list[str]:
        return sorted(p.value for p in permissions_for_role(self.role))

    def limits(self) -> dict[str, int]:
        return limits_for(self.plan)


def org_id_for(recruiter: CurrentRecruiter) -> Optional[str]:
    """Cheap resolution of just the recruiter's organization_id (1 RLS-scoped read).

    Returning None on failure is deliberate — this is an attribution aid, not an
    authorization decision, so a lookup problem must not fail the request. But it
    used to swallow the exception silently, which meant a run of these failures
    looked identical to a run of accounts with no org. Logged at WARNING so the
    two are distinguishable.
    """
    try:
        client = get_user_client(recruiter.access_token)
        resp = client.table("recruiters").select("organization_id").eq("id", recruiter.id).limit(1).execute()
        data = getattr(resp, "data", None) or []
        return data[0].get("organization_id") if data else None
    except Exception as exc:  # pragma: no cover
        logger.warning("org_id_for failed for recruiter=%s: %s", recruiter.id, _describe(exc))
        return None


def resolve_org_context(recruiter: CurrentRecruiter) -> OrgContext:
    """Resolve the recruiter's org context (RLS-scoped reads). Raises 409 if none."""
    client = get_user_client(recruiter.access_token)

    def _rows(resp):
        data = getattr(resp, "data", None)
        return data if isinstance(data, list) else ([] if data is None else [data])

    t0 = time.perf_counter()
    try:
        rec = _rows(client.table("recruiters").select("organization_id,active_workspace_id").eq("id", recruiter.id).limit(1).execute())
    except Exception as exc:  # pragma: no cover
        logger.error(
            "org-context read failed | query=recruiter recruiter=%s elapsed_ms=%.1f exc=%s",
            recruiter.id, (time.perf_counter() - t0) * 1000, _describe(exc),
            exc_info=True,
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Organization lookup failed.") from exc
    if not rec or not rec[0].get("organization_id"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="No organization for this account. Re-run onboarding provisioning.")
    org_id = rec[0]["organization_id"]
    workspace_id = rec[0].get("active_workspace_id")

    # These four reads all depend only on `org_id` and not on each other, but they
    # were issued sequentially — four round-trips to Supabase on every request that
    # needs org context, measured at roughly a second of pure waiting. Fanning them
    # out collapses that to the slowest single query.
    #
    # Deliberately concurrency, not caching: authorization state (role, plan,
    # feature overrides) must never be served stale, so a revoked role or a
    # disabled capability still takes effect on the very next request.
    def _fetch_org():
        return _rows(client.table("organizations").select("name,plan,settings").eq("id", org_id).limit(1).execute())

    def _fetch_member():
        return _rows(client.table("organization_members").select("role").eq("organization_id", org_id).eq("user_id", recruiter.id).limit(1).execute())

    def _fetch_sub():
        return _rows(client.table("subscriptions").select("plan").eq("organization_id", org_id).limit(1).execute())

    def _fetch_flags():
        return _rows(client.table("org_feature_flags").select("flag,enabled").eq("organization_id", org_id).execute())

    # Each branch is timed and attributed individually. Reading the futures in a
    # fixed order and letting the first `.result()` raise meant a failure was
    # reported as "something in the fan-out threw" — with no way to tell which of
    # the four queries it was, nor whether the other three had also failed. That
    # distinction is the whole diagnosis: one failing branch is a query/RLS
    # problem, all four failing together is the shared client or the transport.
    def _timed(name: str, fn: Callable[[], list], ctx: contextvars.Context) -> tuple[str, Optional[list], Optional[BaseException], float]:
        started = time.perf_counter()
        try:
            # Run inside a copy of the request's context so `request_id_ctx` (and
            # anything else request-scoped) is populated in the worker thread —
            # pool threads start with an empty context, so every log line emitted
            # from this fan-out was otherwise stamped with the "-" request id and
            # could not be correlated back to the request that produced it.
            #
            # One copy PER BRANCH, taken on the calling thread. A `Context` cannot
            # be entered by two threads at once, so sharing a single copy across
            # the fan-out makes three of the four branches die with
            # "cannot enter context: ... is already entered".
            rows = ctx.run(fn)
            return name, rows, None, (time.perf_counter() - started) * 1000
        except Exception as exc:
            return name, None, exc, (time.perf_counter() - started) * 1000

    branches: dict[str, Callable[[], list]] = {
        "org": _fetch_org, "member": _fetch_member, "sub": _fetch_sub, "flags": _fetch_flags,
    }
    # Contexts are copied HERE, on the request's own thread — a copy taken inside
    # the pool worker would snapshot that worker's empty context instead.
    jobs = [(name, fn, contextvars.copy_context()) for name, fn in branches.items()]
    fan_started = time.perf_counter()
    with ThreadPoolExecutor(max_workers=4, thread_name_prefix="orgctx") as pool:
        results = {
            name: (rows, exc, ms)
            for name, rows, exc, ms in pool.map(lambda j: _timed(*j), jobs)
        }
    fan_ms = (time.perf_counter() - fan_started) * 1000

    failed = {name: exc for name, (_, exc, _) in results.items() if exc is not None}
    timings = " ".join(f"{n}={ms:.0f}ms" for n, (_, _, ms) in results.items())
    if failed:
        for name, exc in failed.items():
            logger.error(
                "org-context read failed | query=%s org=%s recruiter=%s thread=%s "
                "failed_branches=%d/4 branch_ms=%s fan_ms=%.1f exc=%s",
                name, org_id, recruiter.id, threading.current_thread().name,
                len(failed), timings, fan_ms, _describe(exc),
                exc_info=exc,
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Organization lookup failed.",
        ) from next(iter(failed.values()))

    logger.debug("org-context resolved | org=%s %s fan_ms=%.1f", org_id, timings, fan_ms)
    org, member, sub, flags = (results[n][0] or [] for n in ("org", "member", "sub", "flags"))

    org_row = org[0] if org else {}
    plan = (sub[0].get("plan") if sub else None) or org_row.get("plan") or "free"
    role = (member[0].get("role") if member else None) or "viewer"
    overrides = {f["flag"]: bool(f["enabled"]) for f in flags if f.get("flag")}

    current_org_id.set(org_id)
    return OrgContext(
        recruiter=recruiter, organization_id=org_id, organization_name=org_row.get("name", ""),
        plan=plan, role=role, workspace_id=workspace_id, settings=org_row.get("settings", {}),
        feature_overrides=overrides,
    )

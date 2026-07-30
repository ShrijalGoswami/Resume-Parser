"""
Reproduction harness for the résumé-upload 503 (HANDOFF §3.4).

Answers, with measurements rather than inference:

  P1  Is the failure reproducible at all?                (sequential uploads)
  P2  Does it need concurrency?                          (parallel uploads, same user)
  P3  Does it need *upload* concurrency specifically?    (parallel GETs that also
                                                          resolve org context)
  P4  Does it accumulate with volume?                    (sustained repeated uploads)

Every request carries its own X-Request-ID so a failure here can be joined
straight to the `org-context read failed` line the server logs.

SAFETY: destructive — creates and deletes a real throwaway auth user, campaign,
candidates and Storage objects. Reuses the A1 preflight gate (`HL_ALLOW_
DESTRUCTIVE_TESTS=1`, non-production ENVIRONMENT) and is gated behind __main__.

Run:  python -m tests.test_upload_concurrency        (from backend/, venv active)
Env:  HL_UPLOAD_N       candidates/uploads per phase (default 8)
      HL_UPLOAD_ROUNDS  rounds for the sustained phase (default 6)
"""
from __future__ import annotations

import os
import sys
import time
import uuid
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import httpx

from app.core.config import settings
from tests import _authz_helpers as H

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except (AttributeError, ValueError):  # pragma: no cover
        pass

N = int(os.getenv("HL_UPLOAD_N", "8"))
ROUNDS = int(os.getenv("HL_UPLOAD_ROUNDS", "6"))
PDF = H.PDF_BYTES + b"%% upload-concurrency fixture\n"


def _upload(actor: H.Actor, candidate_id: str, tag: str) -> dict:
    """One résumé upload. Returns the outcome, never raises."""
    rid = f"upl-{tag}"
    started = time.perf_counter()
    try:
        with httpx.Client(timeout=60.0) as c:
            r = c.post(
                f"{H.API}/campaigns/{actor.campaign_id}/candidates/{candidate_id}/resume",
                headers={"Authorization": f"Bearer {actor.token}", "X-Request-ID": rid},
                files={"file": (f"{tag}.pdf", PDF, "application/pdf")},
            )
        ms = (time.perf_counter() - started) * 1000
        detail = ""
        if r.status_code >= 400:
            try:
                detail = str((r.json() or {}).get("detail", ""))[:120]
            except Exception:
                detail = r.text[:120]
        return {"rid": rid, "status": r.status_code, "ms": ms, "detail": detail}
    except Exception as exc:
        ms = (time.perf_counter() - started) * 1000
        return {"rid": rid, "status": -1, "ms": ms, "detail": f"{type(exc).__name__}: {exc}"[:120]}


def _get_context(actor: H.Actor, tag: str) -> dict:
    """A plain org-context read — same resolve_org_context path, no file body."""
    rid = f"ctx-{tag}"
    started = time.perf_counter()
    try:
        with httpx.Client(timeout=60.0) as c:
            r = c.get(f"{H.API}/org/context",
                      headers={"Authorization": f"Bearer {actor.token}", "X-Request-ID": rid})
        return {"rid": rid, "status": r.status_code, "ms": (time.perf_counter() - started) * 1000,
                "detail": "" if r.status_code < 400 else r.text[:120]}
    except Exception as exc:
        return {"rid": rid, "status": -1, "ms": (time.perf_counter() - started) * 1000,
                "detail": f"{type(exc).__name__}: {exc}"[:120]}


def _summarise(label: str, outcomes: list[dict]) -> bool:
    counts = Counter(o["status"] for o in outcomes)
    ok = sum(v for k, v in counts.items() if k in (200, 201))
    times = sorted(o["ms"] for o in outcomes)
    p50 = times[len(times) // 2] if times else 0.0
    worst = times[-1] if times else 0.0
    print(f"\n  {label}")
    print(f"    n={len(outcomes)}  ok={ok}  statuses={dict(sorted(counts.items()))}")
    print(f"    latency p50={p50:.0f}ms max={worst:.0f}ms")
    for o in outcomes:
        if o["status"] not in (200, 201):
            print(f"    FAIL {o['rid']} -> {o['status']} in {o['ms']:.0f}ms  {o['detail']}")
    return ok == len(outcomes)


def _make_candidates(svc, actor: H.Actor, n: int) -> list[str]:
    rows = svc.table("candidates").insert([
        {"campaign_id": actor.campaign_id, "recruiter_id": actor.user_id,
         "full_name": f"Load {i}", "stage": "sourced"} for i in range(n)
    ]).execute().data
    return [r["id"] for r in rows]


def main() -> int:
    H.preflight()
    svc = H.service_client()
    actor = None
    verdicts: dict[str, bool] = {}
    try:
        H.purge_test_users(svc)
        actor = H.create_actor(svc, "upload")
        H.sign_in(actor)
        H.load_org(svc, actor)
        if not actor.org_id:
            print("!! No organization provisioned for the test user; aborting.")
            return 2

        r = H.api("POST", "/campaigns", token=actor.token,
                  json={"title": "Upload concurrency", "job_description": "RCA fixture."})
        if r.status_code not in (200, 201):
            print(f"!! campaign create failed: {r.status_code} {r.text[:200]}")
            return 2
        actor.campaign_id = r.json()["id"]
        print(f"user={actor.user_id} org={actor.org_id} campaign={actor.campaign_id}")

        # P1 — sequential. If this fails, concurrency is not required.
        ids = _make_candidates(svc, actor, N)
        seq = [_upload(actor, cid, f"seq{i}") for i, cid in enumerate(ids)]
        verdicts["P1 sequential uploads"] = _summarise(f"P1  {N} sequential uploads", seq)

        # P2 — concurrent uploads, one user, all at once.
        ids = _make_candidates(svc, actor, N)
        with ThreadPoolExecutor(max_workers=N) as pool:
            par = list(pool.map(lambda t: _upload(actor, t[1], f"par{t[0]}"), enumerate(ids)))
        verdicts["P2 concurrent uploads"] = _summarise(f"P2  {N} concurrent uploads", par)

        # P3 — concurrent org-context reads, no upload body. Isolates
        # resolve_org_context from anything upload-specific.
        with ThreadPoolExecutor(max_workers=N) as pool:
            ctxs = list(pool.map(lambda i: _get_context(actor, f"c{i}"), range(N)))
        verdicts["P3 concurrent org-context reads"] = _summarise(f"P3  {N} concurrent /org/context", ctxs)

        # P4 — sustained. A resource that leaks per request shows up as a failure
        # rate that climbs across rounds rather than one that is constant.
        sustained: list[dict] = []
        for rnd in range(ROUNDS):
            ids = _make_candidates(svc, actor, N)
            with ThreadPoolExecutor(max_workers=N) as pool:
                got = list(pool.map(lambda t: _upload(actor, t[1], f"s{rnd}_{t[0]}"), enumerate(ids)))
            bad = sum(1 for o in got if o["status"] not in (200, 201))
            print(f"    round {rnd + 1}/{ROUNDS}: {len(got) - bad}/{len(got)} ok"
                  f"  p50={sorted(o['ms'] for o in got)[len(got) // 2]:.0f}ms")
            sustained.extend(got)
        verdicts[f"P4 sustained ({ROUNDS} rounds)"] = _summarise(
            f"P4  {ROUNDS} rounds x {N} concurrent uploads", sustained)

        print("\n" + "=" * 70)
        for name, passed in verdicts.items():
            print(f"  {'PASS' if passed else 'FAIL'}  {name}")
        print("=" * 70)
        return 0 if all(verdicts.values()) else 1
    finally:
        if actor:
            try:
                svc.storage.from_(settings.STORAGE_BUCKET_RESUMES).remove(
                    [o["name"] for o in (svc.storage.from_(settings.STORAGE_BUCKET_RESUMES)
                                         .list(f"{actor.user_id}") or []) if o.get("id")])
            except Exception:
                pass
        H.teardown(svc, actor)


if __name__ == "__main__":
    raise SystemExit(main())

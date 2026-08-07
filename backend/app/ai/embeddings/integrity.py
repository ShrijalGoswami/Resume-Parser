"""
Embedding store integrity — detect an incomplete or missing reindex at boot.

THE FAILURE THIS EXISTS TO CATCH
--------------------------------
`vector_search.cosine_similarity` returns 0.0 when two vectors have different
lengths. That is the right choice — comparing a 1536-dim hashing vector with a
2048-dim Nemotron vector would otherwise produce a meaningless number — but it
means the symptom of a half-finished migration is NOT an error. It is a talent
search that quietly returns fewer, worse results while every endpoint reports
200 OK. Nothing in the logs, nothing on /health, and the recruiter has no way to
tell "no good matches" from "half your candidates are invisible".

So the mismatch is detected at boot, when someone is still watching.

WHY MODEL IDENTITY, NOT DIMENSION
---------------------------------
The obvious check — "does the active provider's dimension match what is stored"
— cannot run at startup. A provider whose model determines its own width
(`nvidia`) reports `dimensions == 0` until its first live response, so asking at
boot would either return a wrong answer or force a paid API call into the
startup path.

`model` ("provider:model", written by `embedding_pipeline`) is the better signal
anyway: it is exactly what `ensure_candidate_embedding` compares to decide
whether a row is stale, so this check asks the same question the reindex does,
and a row it flags is precisely a row that a reindex would rewrite.

COST
----
Two exact-count queries with no row transfer, plus one small bounded sample
(only when something is already wrong) to name the offending models. This runs
once per process and must never be the reason a deploy is slow.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

logger = logging.getLogger("app.startup")

#: Rows sampled to report WHICH stale models are present. Bounded on purpose:
#: the counts above are exact, this only supplies human-readable detail.
_SAMPLE_LIMIT = 200

_TABLE = "candidate_embeddings"


@dataclass
class EmbeddingIntegrityReport:
    #: "ok" | "stale" | "skipped" | "unavailable"
    status: str
    active_model: str = ""
    total_rows: int = 0
    stale_rows: int = 0
    #: Distinct "model (dimensions)" strings seen among the stale sample.
    stale_models: list[str] = field(default_factory=list)
    detail: str = ""

    @property
    def is_stale(self) -> bool:
        return self.status == "stale"

    @property
    def stale_percent(self) -> float:
        return (self.stale_rows / self.total_rows * 100) if self.total_rows else 0.0


def check_embedding_integrity() -> EmbeddingIntegrityReport:
    """Compare stored embedding rows against the active provider+model.

    Never raises. A deployment without persistence, without the supabase
    package, or with an unreachable database is reported as skipped/unavailable
    — this is a diagnostic, and a diagnostic that can take down a boot is worse
    than the problem it reports.
    """
    from app.core.config import settings

    if not settings.is_supabase_configured:
        return EmbeddingIntegrityReport(
            status="skipped", detail="Supabase not configured (stateless deployment)."
        )
    if not settings.supabase_service_key:
        # The check must see every tenant's rows, so it needs the service role.
        # Without it, silence is the honest answer — not a false "ok".
        return EmbeddingIntegrityReport(
            status="skipped",
            detail="No service-role key; cross-tenant embedding check skipped.",
        )

    try:
        from app.ai.embeddings.service import active_embedding_model
        from app.db.supabase_client import get_service_client

        active = active_embedding_model()
        client = get_service_client()
        table = client.table(_TABLE)

        # Deliberately NOT recruiter-scoped: an incomplete reindex is a
        # platform-wide condition, and scoping it to one tenant would report
        # "ok" while another tenant's rows are unsearchable.
        total_resp = table.select("id", count="exact").limit(1).execute()
        total = getattr(total_resp, "count", None) or 0
        if total == 0:
            return EmbeddingIntegrityReport(
                status="ok", active_model=active,
                detail="No stored embeddings yet; nothing to reindex.",
            )

        stale_resp = (
            table.select("id", count="exact").neq("model", active).limit(1).execute()
        )
        stale = getattr(stale_resp, "count", None) or 0

        if stale == 0:
            return EmbeddingIntegrityReport(
                status="ok", active_model=active, total_rows=total,
                detail=f"All {total} stored embeddings match the active model.",
            )

        # Something is wrong — now spend one bounded query naming it.
        models: list[str] = []
        try:
            sample = (
                table.select("model,dimensions")
                .neq("model", active)
                .limit(_SAMPLE_LIMIT)
                .execute()
            )
            seen: dict[str, int] = {}
            for row in (getattr(sample, "data", None) or []):
                label = f"{row.get('model')} ({row.get('dimensions')}-dim)"
                seen[label] = seen.get(label, 0) + 1
            models = [f"{k} x{v}" for k, v in sorted(seen.items(), key=lambda kv: -kv[1])]
        except Exception as exc:  # pragma: no cover - detail is best-effort
            logger.debug("Embedding integrity sample failed: %s", exc)

        return EmbeddingIntegrityReport(
            status="stale", active_model=active, total_rows=total,
            stale_rows=stale, stale_models=models,
            detail=f"{stale} of {total} stored embeddings were produced by a different model.",
        )
    except Exception as exc:  # pragma: no cover - never break boot
        return EmbeddingIntegrityReport(
            status="unavailable", detail=f"Embedding integrity check could not run: {exc}"
        )


def report_embedding_integrity() -> EmbeddingIntegrityReport:
    """Run the check and log it at a severity matching the deployment mode.

    Returns the report so the caller can decide whether to refuse the boot.
    """
    from app.core.config import settings

    report = check_embedding_integrity()

    if report.status in ("skipped", "unavailable"):
        logger.info("Embedding integrity: %s — %s", report.status, report.detail)
        return report

    if report.status == "ok":
        logger.info(
            "Embedding integrity OK | active=%s | %s", report.active_model, report.detail
        )
        return report

    # Stale. Say what is wrong, what the user-visible symptom is, and the exact
    # command that fixes it — an operator reading this at 3am should not have to
    # go and look any of that up.
    is_prod = (settings.ENVIRONMENT or "").strip().lower() == "production"
    log = logger.error if is_prod else logger.warning
    log(
        "EMBEDDING STORE IS STALE: %d of %d rows (%.1f%%) were produced by a model "
        "other than the active %s. Those candidates score 0.0 against every query "
        "and are INVISIBLE to semantic search — searches will silently return fewer "
        "and worse results, with no error anywhere. Stale models present: %s. "
        "Fix: reindex each affected campaign "
        "(app.services.embedding_pipeline.reindex_campaign), which rewrites rows "
        "whose model identity differs — no force flag needed.",
        report.stale_rows, report.total_rows, report.stale_percent,
        report.active_model, ", ".join(report.stale_models) or "unknown",
    )
    return report

"""
Analytics aggregation for the Executive Intelligence Dashboard.

Everything is derived from REAL stored data. Aggregation uses a small, fixed set
of bulk queries scoped to the recruiter (never per-campaign/per-candidate loops),
so cost is O(number-of-rows), not O(N queries).

Queries (4 total, all recruiter-scoped; RLS also applies):
  1. campaigns            (id, title, status)
  2. candidates           (id, campaign_id, stage, created_at)
  3. candidate_latest_analysis view — targeted JSON selection of just the fields
     we aggregate (scores, recommendation, skills) — avoids fetching full blobs.
  4. activity_events      (recent feed + staleness)
"""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from app.repositories.base import BaseRepository

HIGH_QUALITY_DEFAULT = 80
SCORE_BUCKETS = [(0, 20), (20, 40), (40, 60), (60, 80), (80, 101)]
EXP_BUCKETS = [(0, 1, "0–1y"), (1, 3, "1–3y"), (3, 5, "3–5y"), (5, 10, "5–10y"), (10, 999, "10y+")]
REVIEW_RECOMMENDATIONS = {"consider for further review"}


class AnalyticsRepository(BaseRepository):
    table_name = "candidates"

    def overview(self, threshold: int = HIGH_QUALITY_DEFAULT) -> dict[str, Any]:
        campaigns = self._fetch(
            "campaigns", "id,title,status"
        )
        candidates = self._fetch(
            "candidates", "id,campaign_id,full_name,stage,created_at"
        )
        analyses = self._fetch(
            "candidate_latest_analysis",
            "candidate_id,campaign_id,overall_score,ats_score,years_experience,"
            "recommendation,name:result->name,missing:result->missing_skills,"
            "top:result->top_skills,matching:result->matching_skills",
        )
        activity = self._fetch_ordered("activity_events", "id,type,summary,campaign_id,candidate_id,created_at", limit=25)

        campaign_by_id = {c["id"]: c for c in campaigns}
        analyzed_ids = {a["candidate_id"] for a in analyses}

        # ── Section 1: Executive overview ───────────────────────────────
        total_candidates = len(candidates)
        analyzed = len(analyses)
        scores = [a["overall_score"] for a in analyses if a.get("overall_score") is not None]
        ats_scores = [a["ats_score"] for a in analyses if a.get("ats_score") is not None]
        avg_match = round(sum(scores) / len(scores), 1) if scores else None
        avg_ats = round(sum(ats_scores) / len(ats_scores), 1) if ats_scores else None
        high_quality = sum(1 for s in scores if s >= threshold)

        overview = {
            "active_campaigns": sum(1 for c in campaigns if c.get("status") == "active"),
            "total_campaigns": len(campaigns),
            "total_candidates": total_candidates,
            "analyzed_candidates": analyzed,
            "awaiting_analysis": max(0, total_candidates - analyzed),
            "average_match_score": avg_match,
            "average_ats_score": avg_ats,
            "high_quality_candidates": high_quality,
            "high_quality_threshold": threshold,
        }

        # ── Section 2: AI intelligence (all from real analyses) ─────────
        def brief(a: dict[str, Any]) -> dict[str, Any]:
            camp = campaign_by_id.get(a.get("campaign_id"), {})
            return {
                "candidate_id": a["candidate_id"],
                "campaign_id": a.get("campaign_id"),
                "name": a.get("name") or "Candidate",
                "overall_score": a.get("overall_score"),
                "ats_score": a.get("ats_score"),
                "campaign_title": camp.get("title"),
            }

        strongest = max(analyses, key=lambda a: a.get("overall_score") or -1, default=None)
        highest_ats = max(analyses, key=lambda a: a.get("ats_score") or -1, default=None)
        missing_counter: Counter[str] = Counter()
        tech_counter: Counter[str] = Counter()
        for a in analyses:
            for s in a.get("missing") or []:
                missing_counter[s] += 1
            for s in (a.get("top") or []) + (a.get("matching") or []):
                tech_counter[s] += 1

        # campaign talent pool = avg overall score per campaign
        pool: dict[str, list[int]] = defaultdict(list)
        for a in analyses:
            if a.get("overall_score") is not None and a.get("campaign_id"):
                pool[a["campaign_id"]].append(a["overall_score"])
        best_pool = max(
            ((cid, sum(v) / len(v)) for cid, v in pool.items() if v),
            key=lambda x: x[1],
            default=None,
        )

        needs_review = [
            brief(a)
            for a in analyses
            if (a.get("recommendation") or "").lower() in REVIEW_RECOMMENDATIONS
        ]

        ai_insights = {
            "strongest_candidate": brief(strongest) if strongest else None,
            "highest_ats_candidate": brief(highest_ats) if highest_ats else None,
            "common_missing_skills": [{"skill": s, "count": n} for s, n in missing_counter.most_common(10)],
            "top_technologies": [{"skill": s, "count": n} for s, n in tech_counter.most_common(10)],
            "candidates_requiring_review": needs_review[:10],
            "candidates_requiring_review_count": len(needs_review),
            "strongest_talent_pool": (
                {
                    "campaign_id": best_pool[0],
                    "campaign_title": campaign_by_id.get(best_pool[0], {}).get("title"),
                    "average_score": round(best_pool[1], 1),
                }
                if best_pool
                else None
            ),
        }

        # ── Section 3: Visual analytics ─────────────────────────────────
        funnel = Counter(c.get("stage") or "sourced" for c in candidates)
        upload_trend: Counter[str] = Counter()
        for c in candidates:
            if c.get("created_at"):
                upload_trend[str(c["created_at"])[:10]] += 1

        charts = {
            "hiring_funnel": [
                {"stage": s, "count": funnel.get(s, 0)}
                for s in ["sourced", "screening", "shortlisted", "interview", "offer", "hired", "rejected"]
            ],
            "match_distribution": self._histogram(scores),
            "ats_distribution": self._histogram(ats_scores),
            "status_breakdown": [
                {"label": "Analyzed", "count": analyzed},
                {"label": "Awaiting", "count": max(0, total_candidates - analyzed)},
            ],
            "upload_trend": [
                {"date": d, "count": upload_trend[d]} for d in sorted(upload_trend)
            ],
            "top_skills": ai_insights["top_technologies"],
            "experience_distribution": self._experience_buckets(analyses),
        }

        # ── Section 4: Action center ────────────────────────────────────
        awaiting = [
            {"candidate_id": c["id"], "campaign_id": c["campaign_id"], "name": c.get("full_name") or "Candidate"}
            for c in candidates
            if c["id"] not in analyzed_ids
        ]
        # campaigns with activity → staleness
        last_activity_by_campaign: dict[str, str] = {}
        for e in activity:  # already desc by created_at
            cid = e.get("campaign_id")
            if cid and cid not in last_activity_by_campaign:
                last_activity_by_campaign[cid] = e.get("created_at")
        stale_campaigns = [
            {"campaign_id": c["id"], "title": c.get("title")}
            for c in campaigns
            if c.get("status") == "active" and c["id"] not in last_activity_by_campaign
        ]
        action_center = {
            "awaiting_review": awaiting[:10],
            "awaiting_review_count": len(awaiting),
            "analyses_running": 0,  # processing is client-side; no server job state
            "stale_active_campaigns": stale_campaigns[:10],
            "stale_active_campaigns_count": len(stale_campaigns),
        }

        # ── Section 5: Recent activity ──────────────────────────────────
        recent_activity = activity[:15]

        return {
            "overview": overview,
            "ai_insights": ai_insights,
            "charts": charts,
            "action_center": action_center,
            "recent_activity": recent_activity,
        }

    # -- helpers -----------------------------------------------------------
    def _fetch(self, table: str, select: str) -> list[dict[str, Any]]:
        try:
            resp = self._client.table(table).select(select).eq("recruiter_id", self.recruiter_id).execute()
        except Exception:
            return []
        return self._rows(resp)

    def _fetch_ordered(self, table: str, select: str, limit: int) -> list[dict[str, Any]]:
        try:
            resp = (
                self._client.table(table)
                .select(select)
                .eq("recruiter_id", self.recruiter_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
        except Exception:
            return []
        return self._rows(resp)

    @staticmethod
    def _histogram(values: list[int]) -> list[dict[str, Any]]:
        out = []
        for lo, hi in SCORE_BUCKETS:
            label = f"{lo}-{hi if hi <= 100 else 100}"
            out.append({"range": label, "count": sum(1 for v in values if lo <= v < hi)})
        return out

    @staticmethod
    def _experience_buckets(analyses: list[dict[str, Any]]) -> list[dict[str, Any]]:
        out = []
        for lo, hi, label in EXP_BUCKETS:
            out.append(
                {
                    "range": label,
                    "count": sum(
                        1
                        for a in analyses
                        if a.get("years_experience") is not None and lo <= a["years_experience"] < hi
                    ),
                }
            )
        return out

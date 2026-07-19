"""
Prediction Engine + Outcome Evaluator.

Dispatches deterministic forecasts over the Digital Twin and (for governance)
compares predictions to realised outcomes over time. Independent of the AI gateway.
"""

from __future__ import annotations

import logging
from typing import Any

from app.prediction.models import FORECASTS, Forecast
from app.prediction.twin import DigitalTwin

logger = logging.getLogger(__name__)

#: The default dashboard forecast set (org-wide).
DASHBOARD_TYPES = ["pipeline_health", "hiring_completion", "offer_acceptance",
                   "interview_success", "skill_shortage", "candidate_dropout"]


class PredictionEngine:
    def types(self) -> list[str]:
        return list(FORECASTS)

    def predict(self, twin: DigitalTwin, forecast_type: str, **params: Any) -> Forecast:
        fn = FORECASTS.get(forecast_type)
        if fn is None:
            raise KeyError(f"Unknown forecast type '{forecast_type}'.")
        return fn(twin, **params)

    def dashboard(self, twin: DigitalTwin) -> list[Forecast]:
        out: list[Forecast] = []
        for t in DASHBOARD_TYPES:
            try:
                out.append(self.predict(twin, t))
            except Exception as exc:  # a broken model must not break the dashboard
                logger.warning("Forecast '%s' failed: %s", t, exc)
        return out


prediction_engine = PredictionEngine()


# ── Outcome Evaluator (model governance) ─────────────────────────────────────
def evaluate_accuracy(snapshots: list[dict]) -> dict:
    """Compare recorded probability predictions to realised outcomes (0/1) → Brier
    score + hit rate. Lower Brier is better. Foundation for model governance."""
    scored = [s for s in snapshots if s.get("outcome") in (0, 1) and s.get("probability") is not None]
    if not scored:
        return {"evaluated": 0, "brier": None, "hit_rate": None}
    brier = sum((s["probability"] - s["outcome"]) ** 2 for s in scored) / len(scored)
    hits = sum(1 for s in scored if round(s["probability"]) == s["outcome"])
    return {"evaluated": len(scored), "brier": round(brier, 4), "hit_rate": round(hits / len(scored), 3)}

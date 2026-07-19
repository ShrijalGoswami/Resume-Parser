"""
Scenario Builder + Simulation Engine.

Applies hypothetical hiring levers to a COPY of the Digital Twin (deterministic,
evidence-based elasticities) and re-runs forecasts to estimate downstream impact —
"what happens if we increase salary 15% / add recruiters / relax requirements?".
The baseline twin is never mutated.
"""

from __future__ import annotations

import copy
from typing import Any

from app.prediction.engine import prediction_engine
from app.prediction.twin import DigitalTwin

# Each lever: how a magnitude changes twin state (elasticities derived from typical
# hiring dynamics; transparent and adjustable).
SCENARIO_LEVERS = {
    "increase_recruiters": "Add recruiters (magnitude = headcount added)",
    "increase_salary": "Raise salary (magnitude = % increase) — lifts offer acceptance",
    "reduce_salary": "Lower salary (magnitude = % decrease) — reduces offer acceptance",
    "expand_remote": "Expand remote hiring (magnitude = % pool increase)",
    "relax_experience": "Relax experience requirements (magnitude = % pool increase)",
    "increase_sourcing_budget": "Increase sourcing budget (magnitude = % pool increase)",
    "open_campaigns": "Open more campaigns (magnitude = campaigns added)",
}


def apply_scenario(twin: DigitalTwin, levers: dict[str, float]) -> DigitalTwin:
    """Return a modified copy of the twin with the scenario levers applied."""
    t = copy.deepcopy(twin)
    for lever, mag in (levers or {}).items():
        m = float(mag or 0)
        if lever == "increase_recruiters":
            t.recruiter_count = max(1, t.recruiter_count + int(m))
        elif lever == "increase_salary":
            t.offer_conversion = min(0.98, t.offer_conversion * (1 + 0.010 * m))   # ~1% acceptance per 1% salary
        elif lever == "reduce_salary":
            t.offer_conversion = max(0.05, t.offer_conversion * (1 - 0.012 * m))
        elif lever in ("expand_remote", "increase_sourcing_budget"):
            t.total_candidates = int(t.total_candidates * (1 + m / 100.0))
            t.analyzed_ratio = min(1.0, t.analyzed_ratio)  # pool grows, coverage lags slightly
        elif lever == "relax_experience":
            t.total_candidates = int(t.total_candidates * (1 + m / 100.0))
            t.average_match = max(0.0, t.average_match * (1 - 0.003 * m))          # more pool, slightly lower quality
        elif lever == "open_campaigns":
            t.active_campaigns += int(m)
            t.total_campaigns += int(m)
            t.velocity_days = t.velocity_days * (1 + 0.05 * m)                     # load slows velocity
    t.data_points = twin.data_points  # confidence unchanged by hypotheticals
    return t


def simulate(twin: DigitalTwin, forecast_type: str, levers: dict[str, float], **params: Any) -> dict:
    baseline = prediction_engine.predict(twin, forecast_type, **params)
    scenario_twin = apply_scenario(twin, levers)
    scenario = prediction_engine.predict(scenario_twin, forecast_type, **params)

    def _num(f):
        return f.value if f.value is not None else f.probability

    delta = round(_num(scenario) - _num(baseline), 3)
    direction = "improves" if delta > 0 else "worsens" if delta < 0 else "unchanged"
    return {
        "forecast_type": forecast_type,
        "levers": levers,
        "baseline": baseline.as_dict(),
        "scenario": scenario.as_dict(),
        "delta": delta,
        "direction": direction,
        "summary": f"Applying the scenario {direction} {forecast_type.replace('_', ' ')} by {abs(delta)}.",
    }

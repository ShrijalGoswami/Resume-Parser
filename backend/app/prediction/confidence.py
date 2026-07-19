"""
Confidence Calculator.

Confidence in a forecast grows with the volume (and, implicitly, recency) of the
organizational evidence behind it — more history → more trustworthy predictions.
Deterministic and transparent.
"""

from __future__ import annotations

import math


def confidence_from_volume(data_points: int, *, floor: int = 25, ceiling: int = 95) -> int:
    """Log-scaled confidence from evidence volume."""
    dp = max(0, data_points)
    return int(max(floor, min(ceiling, floor + 22 * math.log10(1 + dp))))

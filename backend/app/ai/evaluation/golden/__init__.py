"""
The golden evaluation dataset.

`cases.json` is the dataset; `loader.py` reads and validates it. Adding a case
is a data edit — no code changes.

    from app.ai.evaluation.golden import load_and_register

    cases  = load_and_register()                  # fake provider can now answer them
    report = harness.evaluate_all([c.to_eval_case() for c in cases])

`case_id` is a permanent join key. See `loader.py` for why that matters more
than it looks.
"""

from app.ai.evaluation.golden.loader import (
    DATASET_PATH,
    GoldenCase,
    GoldenDatasetError,
    case_ids,
    load_and_register,
    load_cases,
    register_expected_responses,
)

__all__ = [
    "DATASET_PATH",
    "GoldenCase",
    "GoldenDatasetError",
    "case_ids",
    "load_and_register",
    "load_cases",
    "register_expected_responses",
]

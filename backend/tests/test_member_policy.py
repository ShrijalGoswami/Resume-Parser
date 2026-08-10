"""
Owner-role boundary (P1 — RBAC). Specification of who may touch the owner role.

These pin the six scenarios from the security-hardening task against the pure
guard functions the org member routes call:

    1. owner -> admin (owner demotes a member)          allowed
    2. admin -> owner (self promotion)                  403
    3. admin -> owner (promote another member)          403
    4. owner -> admin (owner demotes another owner)     allowed while >1 owner
    5. remove / demote the LAST owner                   409 (invariant)
    6. admin manages a NON-owner member                 allowed

Runnable without pytest:  python -m tests.test_member_policy
(from backend/, with the project venv active)
"""
from __future__ import annotations

from dataclasses import dataclass

import pytest
from fastapi import HTTPException

from app.enterprise.member_policy import (
    active_owner_count,
    find_member,
    guard_grant_owner,
    guard_member_removal,
    guard_member_role_change,
)


@dataclass
class M:
    id: str
    role: str
    status: str = "active"


def _status(fn, **kw) -> int:
    try:
        fn(**kw)
    except HTTPException as exc:
        return exc.status_code
    return 200


# ── grant owner (invite or role change) ──────────────────────────────────────
def test_admin_cannot_grant_owner():
    assert _status(guard_grant_owner, actor_role="admin", new_role="owner") == 403


def test_owner_can_grant_owner():
    assert _status(guard_grant_owner, actor_role="owner", new_role="owner") == 200


def test_admin_can_assign_nonowner_role():
    assert _status(guard_grant_owner, actor_role="admin", new_role="recruiter") == 200


# ── role change ──────────────────────────────────────────────────────────────
def test_scenario_2_admin_promote_self_to_owner():
    members = [M("o1", "owner"), M("a1", "admin")]
    assert (
        _status(
            guard_member_role_change,
            actor_role="admin",
            target_current_role="admin",
            new_role="owner",
            active_owner_count=active_owner_count(members),
        )
        == 403
    )


def test_scenario_3_admin_promote_other_to_owner():
    members = [M("o1", "owner"), M("a1", "admin"), M("r1", "recruiter")]
    assert (
        _status(
            guard_member_role_change,
            actor_role="admin",
            target_current_role="recruiter",
            new_role="owner",
            active_owner_count=active_owner_count(members),
        )
        == 403
    )


def test_scenario_1_owner_demotes_member():
    members = [M("o1", "owner"), M("r1", "recruiter")]
    assert (
        _status(
            guard_member_role_change,
            actor_role="owner",
            target_current_role="recruiter",
            new_role="viewer",
            active_owner_count=active_owner_count(members),
        )
        == 200
    )


def test_scenario_4_owner_demotes_another_owner_while_more_than_one():
    members = [M("o1", "owner"), M("o2", "owner")]
    assert (
        _status(
            guard_member_role_change,
            actor_role="owner",
            target_current_role="owner",
            new_role="admin",
            active_owner_count=active_owner_count(members),
        )
        == 200
    )


def test_admin_cannot_demote_an_owner():
    members = [M("o1", "owner"), M("o2", "owner"), M("a1", "admin")]
    assert (
        _status(
            guard_member_role_change,
            actor_role="admin",
            target_current_role="owner",
            new_role="admin",
            active_owner_count=active_owner_count(members),
        )
        == 403
    )


def test_scenario_5_owner_cannot_demote_last_owner():
    members = [M("o1", "owner"), M("a1", "admin")]
    assert (
        _status(
            guard_member_role_change,
            actor_role="owner",
            target_current_role="owner",
            new_role="admin",
            active_owner_count=active_owner_count(members),
        )
        == 409
    )


# ── removal ──────────────────────────────────────────────────────────────────
def test_scenario_6_admin_removes_nonowner():
    members = [M("o1", "owner"), M("r1", "recruiter")]
    assert (
        _status(
            guard_member_removal,
            actor_role="admin",
            target_current_role="recruiter",
            active_owner_count=active_owner_count(members),
        )
        == 200
    )


def test_admin_cannot_remove_owner():
    members = [M("o1", "owner"), M("o2", "owner"), M("a1", "admin")]
    assert (
        _status(
            guard_member_removal,
            actor_role="admin",
            target_current_role="owner",
            active_owner_count=active_owner_count(members),
        )
        == 403
    )


def test_owner_cannot_remove_last_owner():
    members = [M("o1", "owner"), M("a1", "admin")]
    assert (
        _status(
            guard_member_removal,
            actor_role="owner",
            target_current_role="owner",
            active_owner_count=active_owner_count(members),
        )
        == 409
    )


def test_owner_can_remove_another_owner_while_more_than_one():
    members = [M("o1", "owner"), M("o2", "owner")]
    assert (
        _status(
            guard_member_removal,
            actor_role="owner",
            target_current_role="owner",
            active_owner_count=active_owner_count(members),
        )
        == 200
    )


# ── helpers ──────────────────────────────────────────────────────────────────
def test_active_owner_count_ignores_inactive():
    members = [M("o1", "owner"), M("o2", "owner", status="invited"), M("a1", "admin")]
    assert active_owner_count(members) == 1


def test_find_member():
    members = [M("o1", "owner"), M("r1", "recruiter")]
    assert find_member(members, "r1").role == "recruiter"
    assert find_member(members, "nope") is None


if __name__ == "__main__":
    import sys

    sys.exit(pytest.main([__file__, "-q"]))

"""
Owner-role boundary for organization membership changes (P1 — RBAC).

`MEMBER_MANAGE` (held by both owner and admin) lets a member invite, remove and
re-role other members. That permission alone is NOT sufficient authorization for
two acts that touch the *owner* role, because the owner is the account's last
line of control:

  * granting the ``owner`` role, and
  * demoting or removing an existing owner (or the last owner).

These are reserved for an existing owner, and the organization must always keep
at least one owner. This module is the single place those rules live for the API
path. `require_permission(MEMBER_MANAGE)` still gates the route (an interviewer
or viewer never reaches here); these guards add the owner boundary on top.

DEFENSE IN DEPTH: the member routes run on the service client, which bypasses
RLS — and the RLS write policy (`org_members_write`) grants `is_org_admin`
(owner OR admin), so an admin's own JWT can PATCH member rows directly through
PostgREST, never touching this code. Migration 0028 enforces the same invariants
with a database trigger so that path is closed too. This app-layer guard is the
clean 403/409 for the product API; the trigger is the guarantee.

Pure functions that raise `HTTPException` — unit-testable without a request.
"""

from __future__ import annotations

from typing import Any, Iterable, Optional

from fastapi import HTTPException, status

from app.enterprise.rbac import Role

_OWNER = Role.owner.value


def active_owner_count(members: Iterable[Any]) -> int:
    """Number of active members whose role is ``owner``."""
    return sum(
        1
        for m in members
        if getattr(m, "role", None) == _OWNER and getattr(m, "status", "active") == "active"
    )


def find_member(members: Iterable[Any], member_id: str) -> Optional[Any]:
    for m in members:
        if getattr(m, "id", None) == member_id:
            return m
    return None


def guard_grant_owner(*, actor_role: str, new_role: str) -> None:
    """Only an existing owner may grant the owner role (invite or role change)."""
    if new_role == _OWNER and actor_role != _OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an owner can grant the owner role.",
        )


def guard_member_role_change(
    *, actor_role: str, target_current_role: Optional[str], new_role: str, active_owner_count: int
) -> None:
    """Authorize a role change beyond the base MEMBER_MANAGE gate.

    - Granting ``owner`` requires the actor to be an owner.
    - Changing an existing owner's role requires the actor to be an owner AND
      must not remove the organization's last owner.
    """
    guard_grant_owner(actor_role=actor_role, new_role=new_role)

    if target_current_role == _OWNER and new_role != _OWNER:
        if actor_role != _OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only an owner can change an owner's role.",
            )
        if active_owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An organization must always have at least one owner.",
            )


def guard_member_removal(
    *, actor_role: str, target_current_role: Optional[str], active_owner_count: int
) -> None:
    """Removing an owner requires the actor to be an owner and must keep >= 1 owner."""
    if target_current_role == _OWNER:
        if actor_role != _OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only an owner can remove an owner.",
            )
        if active_owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An organization must always have at least one owner.",
            )

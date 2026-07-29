"""
Policy-based RBAC.

Authorization is DATA, not code: routes ask for a `Permission`; the policy engine
answers by looking up the member's role in a configurable role→permissions
registry. No route hardcodes role names, so permissions can be re-mapped (or
extended with custom roles) without touching handlers.
"""

from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    owner = "owner"
    admin = "admin"
    hiring_manager = "hiring_manager"
    recruiter = "recruiter"
    interviewer = "interviewer"
    viewer = "viewer"


class Permission(str, Enum):
    # Organization administration
    ORG_MANAGE = "org.manage"                # settings, subscription
    MEMBER_MANAGE = "member.manage"          # invite / remove / change role
    WORKSPACE_MANAGE = "workspace.manage"
    FEATURE_FLAG_MANAGE = "feature_flag.manage"
    API_KEY_MANAGE = "api_key.manage"
    INTEGRATION_MANAGE = "integration.manage"
    AUDIT_VIEW = "audit.view"
    USAGE_VIEW = "usage.view"
    # Product
    CAMPAIGN_MANAGE = "campaign.manage"      # create / edit
    CAMPAIGN_DELETE = "campaign.delete"      # destructive; deliberately NOT a recruiter grant
    CAMPAIGN_VIEW = "campaign.view"
    CANDIDATE_MANAGE = "candidate.manage"
    CANDIDATE_VIEW = "candidate.view"
    AI_USE = "ai.use"                        # copilot / comparison / interview / search / report
    AGENT_MANAGE = "agent.manage"            # approve/reject recommendations
    EXPORT = "export"                        # bulk extraction of candidate data


_ALL = set(Permission)

# ORG_MANAGE is org settings, subscription/billing, and organization deletion —
# the acts that end or re-own the account. Reserved for owner (confirmed 29 Jul).
# An admin runs the organization; only an owner can dispose of it.
_OWNER_ONLY = {Permission.ORG_MANAGE}

# Configurable registry — the single source of truth for who can do what.
ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    Role.owner: set(_ALL),
    Role.admin: _ALL - _OWNER_ONLY,
    Role.hiring_manager: {
        Permission.CAMPAIGN_MANAGE, Permission.CAMPAIGN_DELETE,
        Permission.CAMPAIGN_VIEW, Permission.CANDIDATE_MANAGE,
        Permission.CANDIDATE_VIEW, Permission.AI_USE, Permission.AGENT_MANAGE,
        Permission.USAGE_VIEW, Permission.AUDIT_VIEW, Permission.WORKSPACE_MANAGE,
        Permission.EXPORT,
    },
    Role.recruiter: {
        Permission.CAMPAIGN_MANAGE, Permission.CAMPAIGN_VIEW, Permission.CANDIDATE_MANAGE,
        Permission.CANDIDATE_VIEW, Permission.AI_USE, Permission.AGENT_MANAGE,
        Permission.EXPORT,
        # Analytics is pipeline health across the roles they run — operational
        # data for the person running the pipeline, not org billing (confirmed
        # 29 Jul). The org's own spend counters sit behind the same permission
        # today; if that ever needs separating, split USAGE_VIEW rather than
        # taking analytics back off the recruiter.
        Permission.USAGE_VIEW,
    },
    Role.interviewer: {
        # Reads and AI, no mutations and no bulk extraction: an interviewer
        # forms a judgement inside the product, they do not carry the pipeline
        # out of it.
        Permission.CAMPAIGN_VIEW, Permission.CANDIDATE_VIEW, Permission.AI_USE,
    },
    Role.viewer: {
        Permission.CAMPAIGN_VIEW, Permission.CANDIDATE_VIEW,
    },
}


def permissions_for_role(role: str) -> set[Permission]:
    try:
        return set(ROLE_PERMISSIONS.get(Role(role), set()))
    except ValueError:
        return set()


def has_permission(role: str, permission: Permission) -> bool:
    return permission in permissions_for_role(role)


def role_permission_matrix() -> dict[str, list[str]]:
    """Serialisable matrix for the admin console (roles → permission keys)."""
    return {r.value: sorted(p.value for p in perms) for r, perms in ROLE_PERMISSIONS.items()}

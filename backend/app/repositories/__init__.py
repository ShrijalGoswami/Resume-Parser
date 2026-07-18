"""
Repository layer.

Each repository wraps Supabase table access for one aggregate and enforces
recruiter scoping in code (belt-and-braces with RLS). Routes depend on
repositories, never on the raw Supabase client — this keeps data access in one
place, strongly typed, and trivially mockable in tests.
"""

from app.repositories.base import BaseRepository, PersistenceError
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.candidate_repository import CandidateRepository
from app.repositories.note_repository import NoteRepository
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.activity_repository import ActivityRepository

__all__ = [
    "BaseRepository",
    "PersistenceError",
    "CampaignRepository",
    "CandidateRepository",
    "NoteRepository",
    "ConversationRepository",
    "ActivityRepository",
]

"""
Provider plugins.

Adapters for the recruiter ecosystem. Each declares its category, supported
actions, and OAuth config. They run in dry-run mode until connected; a live SDK
call is a per-provider `_perform` override. Adding a provider = one subclass +
one registration — nothing else in the platform changes.
"""

from __future__ import annotations

from app.integrations.base import (
    IntegrationAction as A,
    OAuthConfig,
    ProviderCategory as C,
    ProviderSpec,
    SimulatedProvider,
)

# ── OAuth configs (client id/secret come from settings; never hardcoded) ────
GOOGLE_OAUTH = OAuthConfig(
    authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
    token_url="https://oauth2.googleapis.com/token",
    scopes=("https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/calendar.events"),
    client_id_setting="GOOGLE_OAUTH_CLIENT_ID", client_secret_setting="GOOGLE_OAUTH_CLIENT_SECRET",
)
MICROSOFT_OAUTH = OAuthConfig(
    authorize_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token_url="https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes=("Mail.Send", "Calendars.ReadWrite", "OnlineMeetings.ReadWrite", "Chat.ReadWrite"),
    client_id_setting="MICROSOFT_OAUTH_CLIENT_ID", client_secret_setting="MICROSOFT_OAUTH_CLIENT_SECRET",
)
SLACK_OAUTH = OAuthConfig(
    authorize_url="https://slack.com/oauth/v2/authorize",
    token_url="https://slack.com/api/oauth.v2.access",
    scopes=("chat:write", "channels:read"),
    client_id_setting="SLACK_OAUTH_CLIENT_ID", client_secret_setting="SLACK_OAUTH_CLIENT_SECRET",
)
ZOOM_OAUTH = OAuthConfig(
    authorize_url="https://zoom.us/oauth/authorize",
    token_url="https://zoom.us/oauth/token",
    scopes=("meeting:write",),
    client_id_setting="ZOOM_OAUTH_CLIENT_ID", client_secret_setting="ZOOM_OAUTH_CLIENT_SECRET",
)


def _p(name, display, category, actions, oauth=None, requires_oauth=True) -> ProviderSpec:
    return ProviderSpec(name=name, display_name=display, category=category, actions=actions,
                        oauth=oauth, requires_oauth=requires_oauth)


class GmailProvider(SimulatedProvider):
    spec = _p("gmail", "Gmail", C.email, (A.send_email,), GOOGLE_OAUTH)


class OutlookProvider(SimulatedProvider):
    spec = _p("outlook", "Outlook", C.email, (A.send_email,), MICROSOFT_OAUTH)


class GoogleCalendarProvider(SimulatedProvider):
    spec = _p("google_calendar", "Google Calendar", C.calendar, (A.create_calendar_event,), GOOGLE_OAUTH)


class MicrosoftCalendarProvider(SimulatedProvider):
    spec = _p("microsoft_calendar", "Microsoft 365 Calendar", C.calendar, (A.create_calendar_event,), MICROSOFT_OAUTH)


class SlackProvider(SimulatedProvider):
    spec = _p("slack", "Slack", C.messaging, (A.send_message,), SLACK_OAUTH)


class TeamsProvider(SimulatedProvider):
    spec = _p("teams", "Microsoft Teams", C.messaging, (A.send_message, A.create_meeting), MICROSOFT_OAUTH)


class GoogleMeetProvider(SimulatedProvider):
    spec = _p("google_meet", "Google Meet", C.meeting, (A.create_meeting,), GOOGLE_OAUTH)


class ZoomProvider(SimulatedProvider):
    spec = _p("zoom", "Zoom", C.meeting, (A.create_meeting,), ZOOM_OAUTH)


class GenericAtsProvider(SimulatedProvider):
    spec = _p("generic_ats", "Generic ATS", C.ats, (A.create_candidate,), None, requires_oauth=False)


class WebhookProvider(SimulatedProvider):
    spec = _p("webhook", "Generic Webhook", C.webhook, (A.post_webhook,), None, requires_oauth=False)


ALL_PROVIDERS = [
    GmailProvider, OutlookProvider, GoogleCalendarProvider, MicrosoftCalendarProvider,
    SlackProvider, TeamsProvider, GoogleMeetProvider, ZoomProvider,
    GenericAtsProvider, WebhookProvider,
]

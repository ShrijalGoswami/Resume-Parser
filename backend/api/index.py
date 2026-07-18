"""
Vercel serverless entrypoint.

Vercel's Python runtime auto-detects the module-level ASGI `app` object.
This re-exports the FastAPI app so the whole API is served from one function.

NOTE: Vercel serverless is a best-effort target for this backend. See
backend/vercel.json and the README for the caveats (ephemeral /tmp only,
execution-time limits vs. multi-second LLM calls, and the PyMuPDF binary
size). Railway/Render are the recommended backend hosts.
"""

from app.main import app  # noqa: F401  (re-exported for the Vercel runtime)

"""
Operational plumbing: structured logging, request-scoped request IDs,
request/response access logging, security headers, and an early body-size
guard. Kept dependency-free so it runs anywhere the app runs.
"""

import logging
import re
import threading
import time
import uuid
from collections import defaultdict, deque
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

# Holds the current request's ID so every log line emitted during the request
# can be correlated, even from deep in the parsing / LLM stack.
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(request_id)s | %(name)s | %(message)s"

# An inbound X-Request-ID is honoured so a trace can span the frontend proxy, this
# API and a log aggregator. But it is attacker-controlled data that lands in EVERY
# log line for the request, so it is accepted only in this shape. Measured before
# the guard: a 300-character header was copied verbatim into the logs, and a
# client could replay another request's ID and quietly merge itself into that
# request's trace during an investigation.
_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def _safe_request_id(incoming: str | None) -> str:
    """Trust an inbound request ID only if it is short and alphanumeric-ish."""
    if incoming and _REQUEST_ID_RE.match(incoming):
        return incoming
    return uuid.uuid4().hex[:12]


class RequestIdLogFilter(logging.Filter):
    """Injects the current request ID into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


def configure_logging() -> None:
    """Install the request-ID-aware formatter on the root logger."""
    root = logging.getLogger()
    # An unrecognised LOG_LEVEL must not silence logging — `getLevelName` returns
    # the string "BADVALUE" rather than raising, and passing that to setLevel
    # would throw at startup. Fall back to INFO instead.
    level = logging.getLevelName(str(settings.LOG_LEVEL).strip().upper())
    root.setLevel(level if isinstance(level, int) else logging.INFO)

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    handler.addFilter(RequestIdLogFilter())

    # Replace any handlers installed by basicConfig so formatting is consistent.
    root.handlers = [handler]

    # Ensure uvicorn's loggers propagate through our handler instead of their own.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.propagate = True

    # `uvicorn.access` logs one line per request and so does RequestContextMiddleware
    # (`app.access`), which measured as exactly 2 lines for every single request —
    # double the log volume, and log ingest is billed by volume. Our line is a
    # superset: it carries the request ID and the duration, which uvicorn's does
    # not. What is given up is the client's source PORT and the HTTP version; if a
    # future investigation needs those, re-enable this logger rather than adding a
    # third access log.
    logging.getLogger("uvicorn.access").disabled = True


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Assigns a request ID, logs one line per request with method, path,
    status and duration, and returns the request ID in the X-Request-ID header.
    """

    _logger = logging.getLogger("app.access")

    async def dispatch(self, request: Request, call_next):
        request_id = _safe_request_id(request.headers.get("X-Request-ID"))
        token = request_id_ctx.set(request_id)

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            # Unhandled errors must never crash the worker — log with full
            # traceback and return a clean 500.
            self._logger.exception(
                f'{request.method} {request.url.path} -> 500 in {duration_ms}ms'
            )
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error."},
            )
            response.headers["X-Request-ID"] = request_id
            request_id_ctx.reset(token)
            return response

        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        client = request.client.host if request.client else "-"
        self._logger.info(
            f'{client} {request.method} {request.url.path} '
            f'-> {response.status_code} in {duration_ms}ms'
        )
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-ms"] = str(duration_ms)
        request_id_ctx.reset(token)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds a conservative set of security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
        )
        # This is a JSON API; a restrictive CSP is safe and cheap.
        response.headers.setdefault(
            "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
        )
        # Authenticated responses carry candidate records and hiring decisions;
        # nothing here is safe for a shared cache to keep (A9). Well-behaved
        # caches already decline to store responses to Authorization-bearing
        # requests, so this states the intent rather than changing behaviour.
        #
        # `setdefault`, like every header above it: a route that deliberately
        # sets its own Cache-Control keeps it. That is what makes this safe to
        # apply blanket — it cannot silently make a cacheable endpoint uncached.
        response.headers.setdefault("Cache-Control", "no-store")
        # HSTS instructs browsers never to talk to this host over plaintext again.
        # Only sent for requests that actually arrived over TLS (directly or via a
        # terminating proxy) — emitting it on a local http:// dev server would pin
        # localhost to https for two years in the developer's browser.
        if _is_secure_request(request):
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
            )
        return response


def _is_secure_request(request: Request) -> bool:
    """True when the original client request used HTTPS."""
    if request.url.scheme == "https":
        return True
    # Set by TLS-terminating proxies (Render, Vercel, most load balancers).
    return request.headers.get("x-forwarded-proto", "").split(",")[0].strip() == "https"


def client_ip(request: Request) -> str:
    """Best-effort originating client IP.

    Behind a TLS-terminating proxy — which is how this service is deployed —
    `request.client.host` is the *proxy's* address, identical for every user. A
    per-IP rate limiter keyed on it therefore shares one bucket across all
    traffic, so a single abusive client exhausts the limit for everyone: a
    self-inflicted denial of service rather than a protection.

    `X-Forwarded-For` is only trusted when `TRUST_PROXY_HEADERS` is enabled,
    because the header is client-supplied and trusting it unconditionally would
    let anyone mint a fresh bucket per request. The deployment sets the flag; the
    edge is responsible for overwriting (not appending to) the header.
    """
    if getattr(settings, "TRUST_PROXY_HEADERS", False):
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            # Leftmost entry is the original client; the rest are proxy hops.
            first = forwarded.split(",")[0].strip()
            if first:
                return first
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-process, per-IP sliding-window rate limiter for expensive / unauthenticated
    endpoints (LLM analysis, copilot chat, PDF export). A cost/DoS abuse safety
    net — production should ALSO enforce limits at the edge (reverse proxy / WAF).
    Fail-open: never blocks on limiter error; ignores cheap/GET traffic.
    """
    # path prefix -> (max POSTs, window seconds)
    _LIMITS = {
        "/api/v1/batch-analysis": (20, 60),
        "/api/v1/ats-analysis": (30, 60),
        "/api/v1/match-analysis": (30, 60),
        "/api/v1/copilot/chat": (30, 60),
        "/api/v1/export-report": (30, 60),
        "/api/v1/export-match-report": (30, 60),
        # Agent scan reasons over a whole campaign — the most expensive single
        # call in the product, and it was unlimited (A5).
        "/api/v1/agent/scan": (10, 60),
        # Semantic search and similar-candidate lookup. A5 covered the endpoints
        # that spend at the LLM; these spend at the EMBEDDING provider, which is
        # a different vendor bill and was therefore missed. Every call embeds the
        # query through NVIDIA before it can rank anything, so an authenticated
        # caller could bill the account at request rate.
        "/api/v1/search": (30, 60),
    }

    # path SUFFIX -> (max POSTs, window seconds).
    #
    # The authenticated LLM endpoints carry resource IDs mid-path
    # (/campaigns/{id}/candidates/{id}/interview), so the prefix table above
    # cannot reach them — which is precisely why they were unlimited (A5).
    # Matching the trailing segment is the smallest change that covers them;
    # the limiter itself is untouched, and the distributed-counter problem
    # remains S-6.
    #
    # Being authenticated is not a rate limit. It bounds WHO can spend, not how
    # fast, and every one of these paths is a paid Groq call.
    _SUFFIX_LIMITS = {
        "/compare": (20, 60),
        "/interview": (20, 60),
        "/resume": (30, 60),          # upload + analysis; "/resume-url" is a GET
        "/embeddings/reindex": (5, 60),
    }
    _MAX_KEYS = 50_000  # hard memory bound for the abuse case

    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[tuple, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def _rule(self, path: str):
        for prefix, limit in self._LIMITS.items():
            if path.startswith(prefix):
                return limit
        for suffix, limit in self._SUFFIX_LIMITS.items():
            if path.endswith(suffix):
                return limit
        return None

    async def dispatch(self, request: Request, call_next):
        try:
            rule = self._rule(request.url.path)
            if rule and request.method == "POST":
                max_n, window = rule
                key = (client_ip(request), request.url.path)
                now = time.time()
                with self._lock:
                    if len(self._hits) > self._MAX_KEYS:
                        self._hits.clear()  # crude memory bound; safety net only
                    dq = self._hits[key]
                    while dq and dq[0] <= now - window:
                        dq.popleft()
                    if len(dq) >= max_n:
                        retry = int(window - (now - dq[0])) + 1
                        return JSONResponse(
                            status_code=429,
                            content={"detail": "Too many requests. Please slow down and retry shortly."},
                            headers={"Retry-After": str(max(1, retry))},
                        )
                    dq.append(now)
        except Exception:  # pragma: no cover — never break requests on limiter error
            pass
        return await call_next(request)


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    """
    Rejects oversized requests early based on the Content-Length header,
    before the body is fully read into memory. The streaming size check in
    the upload path is the authoritative limit; this is a cheap fast-fail.
    """

    async def dispatch(self, request: Request, call_next):
        # The batch endpoint accepts many files; size it for a full batch.
        # Single-file endpoints still enforce their own per-file streaming limit.
        if request.url.path.endswith("/batch-analysis"):
            limit = settings.max_file_size_bytes * settings.MAX_BATCH_SIZE + (4 * 1024 * 1024)
        else:
            limit = settings.max_file_size_bytes + (1 * 1024 * 1024)
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > limit:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Request body exceeds maximum allowed size "
                                      f"of {limit // (1024 * 1024)}MB."
                        },
                    )
            except ValueError:
                pass
        return await call_next(request)

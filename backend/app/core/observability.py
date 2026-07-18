"""
Operational plumbing: structured logging, request-scoped request IDs,
request/response access logging, security headers, and an early body-size
guard. Kept dependency-free so it runs anywhere the app runs.
"""

import logging
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

# Holds the current request's ID so every log line emitted during the request
# can be correlated, even from deep in the parsing / LLM stack.
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(request_id)s | %(name)s | %(message)s"


class RequestIdLogFilter(logging.Filter):
    """Injects the current request ID into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


def configure_logging() -> None:
    """Install the request-ID-aware formatter on the root logger."""
    root = logging.getLogger()
    root.setLevel(logging.INFO)

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


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Assigns a request ID, logs one line per request with method, path,
    status and duration, and returns the request ID in the X-Request-ID header.
    """

    _logger = logging.getLogger("app.access")

    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("X-Request-ID")
        request_id = incoming or uuid.uuid4().hex[:12]
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
        return response


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    """
    Rejects oversized requests early based on the Content-Length header,
    before the body is fully read into memory. The streaming size check in
    the upload path is the authoritative limit; this is a cheap fast-fail.
    """

    async def dispatch(self, request: Request, call_next):
        # Allow multipart overhead on top of the raw file size limit.
        limit = settings.max_file_size_bytes + (1 * 1024 * 1024)
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > limit:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "detail": f"Request body exceeds maximum allowed size "
                                      f"of {settings.MAX_FILE_SIZE_MB}MB."
                        },
                    )
            except ValueError:
                pass
        return await call_next(request)

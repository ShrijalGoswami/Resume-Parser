# Hirevo API — container image.
#
# Render deploys this repo from source via `render.yaml`, so this image is the
# portable path: any container host (Fly, Cloud Run, ECS, a VM) and the local
# `docker-compose.yml`. It must stay behaviourally identical to the Render
# service, so the start command below mirrors `backend/Procfile` exactly —
# including `--proxy-headers`, without which the client IP seen by the rate
# limiter is the proxy's and HSTS is never emitted.
#
# Python is pinned to the same version as `runtime.txt` / `render.yaml`.

# ── Build stage: compile wheels into a self-contained virtualenv ──────────────
FROM python:3.11.9-slim AS builder

# PyMuPDF and reportlab ship manylinux wheels, so no build toolchain is needed
# for the pinned set. gcc is deliberately absent from both stages: adding it
# would grow the image and the attack surface for no benefit. If a future
# dependency needs to compile, add build-essential HERE only — never to runtime.
WORKDIR /build
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install from the LOCK, not requirements.txt. requirements.txt declares open
# lower bounds, so two builds on different days produce different applications —
# measured: a fresh resolve selected fastapi 0.140.0 / groq 1.6.0 while the
# release was verified against 0.139.2 / 1.5.0. render.yaml installs from the
# same file so the container and the hosted service are the same application.
COPY requirements.lock.txt ./
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.lock.txt

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM python:3.11.9-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000 \
    # Uploads are written here while being parsed and deleted immediately after.
    # Must be writable by the non-root user; startup fails fast if it is not.
    TEMP_UPLOAD_DIR=/tmp/hirelens_uploads

COPY --from=builder /opt/venv /opt/venv

# Run unprivileged. The app never needs to write outside TEMP_UPLOAD_DIR.
RUN useradd --create-home --uid 10001 hirelens
WORKDIR /app
COPY --chown=hirelens:hirelens . .
USER hirelens

EXPOSE 8000

# The platform's own probe is authoritative in production (Render uses
# healthCheckPath: /health). This HEALTHCHECK exists so `docker compose up`
# and plain `docker run` get the same signal locally. urllib is used rather
# than curl because the slim image has no curl and adding one for a probe is
# not worth the layer.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT','8000'), timeout=4).status == 200 else 1)"

# Identical to backend/Procfile. Keep the two in lockstep.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips=\"*\""]

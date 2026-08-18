# Hirevo frontend — container image.
#
# Vercel is the deployed target; this image is the portable path (self-hosting,
# `docker-compose.yml`, air-gapped installs). It mirrors the Vercel build with
# one difference: `NEXT_OUTPUT_STANDALONE=1` so the runtime stage needs no
# node_modules. See the comment on `output` in next.config.mjs.
#
# CRITICAL — NEXT_PUBLIC_* are inlined into the client bundle at BUILD time, not
# read at runtime. They must be passed as --build-arg, and an image built for one
# environment cannot be promoted to another. Building with the wrong
# NEXT_PUBLIC_SUPABASE_URL ships a frontend that authenticates against the wrong
# project; there is no runtime override that fixes it.

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM node:24.15.0-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
# --frozen-lockfile fails rather than silently resolving a different tree, so a
# stale lockfile is a build error instead of a production surprise.
RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:24.15.0-alpine AS builder
WORKDIR /app
RUN corepack enable

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_OUTPUT_STANDALONE=1 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:24.15.0-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 10001 nodejs && adduser -u 10001 -G nodejs -S nextjs

# `standalone` traces exactly the files the server needs; static assets and
# public/ are not traced and must be copied alongside it or the app renders
# unstyled with 404ing assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# `/` is served by the marketing route group and needs no backend or Supabase,
# so it is a true liveness signal rather than a dependency check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode<400?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]

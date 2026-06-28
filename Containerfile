# =============================================================================
# ainything app image  (Alpine-based, ~3x smaller than bookworm-slim)
# Build:  podman build -t ainything-app .
#   atau: docker build -t ainything-app .
# Run:    podman run --rm -p 3000:3000 --env-file .env ainything-app
# =============================================================================

# ---- 1. Dependencies (cached layer) ----------------------------------------
FROM docker.io/library/node:22-alpine AS deps
WORKDIR /app

# All bcrypt/pg deps are pure-JS or use optional native builds — Alpine compat.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack enable \
 && corepack prepare pnpm@10.0.0 --activate \
 && pnpm install --frozen-lockfile --prod=false

# ---- 2. Build --------------------------------------------------------------
FROM docker.io/library/node:22-alpine AS build
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.json svelte.config.js vite.config.ts ./
COPY src ./src
COPY static ./static

# PUBLIC_* vars are baked in at build time by SvelteKit
# Pass real values via --build-arg in CI/CD; empty string = disable
ARG PUBLIC_SENTRY_DSN=""
ENV PUBLIC_SENTRY_DSN=$PUBLIC_SENTRY_DSN

RUN pnpm build

# ---- 3. Runtime ------------------------------------------------------------
FROM docker.io/library/node:22-alpine AS runtime
WORKDIR /app

# tini: proper PID 1 — forwards SIGTERM so graceful shutdown works
RUN apk add --no-cache tini

# Run as unprivileged node user (uid 1000, pre-exists in node:alpine)
USER node
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# SvelteKit adapter-node bundles all app deps into build/ — no node_modules needed for the app itself.
COPY --chown=node:node --from=build /app/build ./build

# node_modules needed only for migration script (scripts/db.mjs imports 'pg' directly).
# This could be eliminated later by bundling scripts/db.mjs or using a separate migrate image.
COPY --chown=node:node --from=deps /app/node_modules ./node_modules

# Migration SQL files + runner script
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node db ./db
COPY --chown=node:node package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/backend',(r)=>process.exit(r.statusCode===200?0:1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "build"]

LABEL org.opencontainers.image.title="ainything-app" \
      org.opencontainers.image.description="ainything SvelteKit app" \
      org.opencontainers.image.source="https://github.com/Ridlo543/Ainything" \
      org.opencontainers.image.licenses="UNLICENSED"

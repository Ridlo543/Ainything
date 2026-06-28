# =============================================================================
# ainything — multi-stage container image
#
# Stages:
#   deps    — install all node_modules (cached layer)
#   build   — compile SvelteKit app
#   migrate — lightweight runner for DB migrations (node + pg only)
#   runtime — production app server (SvelteKit adapter-node)
#
# Build app:     docker build --target runtime -t ainything-app .
# Build migrate: docker build --target migrate -t ainything-migrate .
# Local run:     docker run --rm -p 3000:3000 --env-file .env ainything-app
# =============================================================================

# ---- 1. Dependencies --------------------------------------------------------
FROM docker.io/library/node:22-alpine AS deps
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Copy manifests only — layer is cache-busted only when deps change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

RUN corepack enable \
  && corepack prepare pnpm@10.0.0 --activate \
  && pnpm install --frozen-lockfile --prod=false

# ---- 2. Build ---------------------------------------------------------------
FROM docker.io/library/node:22-alpine AS build
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.json svelte.config.js vite.config.ts ./
COPY src ./src
COPY static ./static

# PUBLIC_* env vars are baked in by SvelteKit at build time.
# Pass real values via --build-arg in CI; empty string = feature disabled.
ARG PUBLIC_SENTRY_DSN=""
ENV PUBLIC_SENTRY_DSN=$PUBLIC_SENTRY_DSN

RUN pnpm build

# ---- 3. Migrate (separate lightweight image) --------------------------------
# Contains only: node runtime + migration scripts + pg driver
# Used as an init container in CI/CD deploy job — runs migrations before
# the app container is restarted.  Does NOT contain the full app build.
FROM docker.io/library/node:22-alpine AS migrate
WORKDIR /app

RUN apk add --no-cache tini

USER node

ENV NODE_ENV=production

# Only copy what the migration runner needs
COPY --chown=node:node package.json ./
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node db ./db

# pg and other runtime deps needed by scripts/db.mjs
COPY --chown=node:node --from=deps /app/node_modules ./node_modules

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "scripts/db.mjs", "migrate"]

LABEL org.opencontainers.image.title="ainything-migrate" \
      org.opencontainers.image.description="ainything DB migration runner" \
      org.opencontainers.image.source="https://github.com/Ridlo543/Ainything" \
      org.opencontainers.image.licenses="UNLICENSED"

# ---- 4. Runtime -------------------------------------------------------------
# Minimal production image — SvelteKit adapter-node bundles all app deps
# into build/, so node_modules is NOT needed for the app itself.
FROM docker.io/library/node:22-alpine AS runtime
WORKDIR /app

# tini: proper PID 1 — forwards SIGTERM so graceful shutdown works
RUN apk add --no-cache tini

# Run as unprivileged node user (uid 1000, pre-exists in node:alpine)
USER node

ENV NODE_ENV=production \
  PORT=3000 \
  HOST=0.0.0.0

# App bundle from SvelteKit adapter-node
COPY --chown=node:node --from=build /app/build ./build

# Static assets
COPY --chown=node:node static ./static

# package.json required by adapter-node at runtime
COPY --chown=node:node package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/backend',(r)=>process.exit(r.statusCode===200?0:1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "build"]

LABEL org.opencontainers.image.title="ainything-app" \
      org.opencontainers.image.description="ainything SvelteKit production server" \
      org.opencontainers.image.source="https://github.com/Ridlo543/Ainything" \
      org.opencontainers.image.licenses="UNLICENSED"

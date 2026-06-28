# =============================================================================
# ainything app image
# Build:  podman build -t ainything-app .
#   atau: docker build -t ainything-app .
# Run:    podman run --rm -p 3000:3000 --env-file .env ainything-app
# =============================================================================

# ---- 1. Dependencies (cached layer) ----------------------------------------
FROM docker.io/library/node:22-bookworm-slim AS deps
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack enable \
 && corepack prepare pnpm@10.0.0 --activate \
 && pnpm install --frozen-lockfile --prod=false

# ---- 2. Build --------------------------------------------------------------
FROM docker.io/library/node:22-bookworm-slim AS build
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Activate corepack + pnpm in this stage (needed for RUN pnpm build)
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files needed for build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.json svelte.config.js vite.config.ts ./
COPY src ./src
COPY static ./static

# PUBLIC_* vars needed by SvelteKit at build time (static/public env)
# Pass real values via --build-arg in CI/CD; empty string disables Sentry
ARG PUBLIC_SENTRY_DSN=""
ENV PUBLIC_SENTRY_DSN=$PUBLIC_SENTRY_DSN

RUN pnpm build

# ---- 3. Runtime ------------------------------------------------------------
FROM docker.io/library/node:22-bookworm-slim AS runtime
WORKDIR /app

# Install tini for proper PID 1 signal handling (SIGTERM on graceful shutdown)
RUN apt-get update -qq \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

# Run as unprivileged node user (uid 1000)
USER node
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# adapter-node bundles all required deps into build/ — no node_modules needed
COPY --chown=node:node --from=build /app/build ./build

# Migration scripts + SQL files (needed for: docker compose run --rm app node scripts/db.mjs migrate)
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node db ./db
COPY --chown=node:node package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/backend',(r)=>process.exit(r.statusCode===200?0:1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "build"]

LABEL org.opencontainers.image.title="ainything-app" \
      org.opencontainers.image.description="ainything SvelteKit app" \
      org.opencontainers.image.source="https://github.com/Ridlo543/Ainything" \
      org.opencontainers.image.licenses="UNLICENSED"

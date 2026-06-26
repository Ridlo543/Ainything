# =============================================================================
# ainything app image (template — switch to @sveltejs/adapter-node to use it).
# Build:  podman build -t ainything-app -f Containerfile .
# Run:    podman run --rm -p 3000:3000 --env-file .env ainything-app
# Compose works with both `docker build` and `podman build`; OCI labels and
# multi-stage layout follow Podman Build best practices.
# =============================================================================

# ---- 1. Dependencies (cached) ----------------------------------------------
FROM docker.io/library/node:22-bookworm-slim AS deps
WORKDIR /app

# pnpm via Corepack (ships with Node 22). Pin to the version in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack enable \
 && corepack prepare pnpm@10.0.0 --activate \
 && pnpm install --frozen-lockfile --prod=false

# ---- 2. Build --------------------------------------------------------------
FROM docker.io/library/node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Prune dev dependencies for the runtime image.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ---- 3. Runtime ------------------------------------------------------------
FROM docker.io/library/node:22-bookworm-slim AS runtime
WORKDIR /app

# Run as the unprivileged `node` user (uid 1000) — rootless-friendly.
USER node
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

COPY --chown=node:node --from=build /app/build ./build
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node package.json ./

EXPOSE 3000

# tini gives us proper PID 1 signal handling (SIGTERM, SIGINT) for graceful
# shutdowns on Podman + systemd-less environments.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "build"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

LABEL org.opencontainers.image.title="ainything-app" \
      org.opencontainers.image.description="ainything SvelteKit app (container template)" \
      org.opencontainers.image.source="https://github.com/Ridlo543/Ainything" \
      org.opencontainers.image.licenses="UNLICENSED"

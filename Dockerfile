# Multi-stage Docker build for Ainything
# Optimized for production deployment with Podman/Docker

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy package files first (layer cache: deps change less often than src)
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source and config files needed for build
COPY tsconfig.json svelte.config.js vite.config.ts ./
COPY src ./src
COPY static ./static

# Build application
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only the built output — adapter-node bundles all required deps into build/
COPY --from=builder --chown=nodejs:nodejs /app/build ./build

# Copy migration scripts and seed (needed for pnpm db:migrate at deploy time)
COPY --chown=nodejs:nodejs scripts ./scripts
COPY --chown=nodejs:nodejs package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/backend', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start application
CMD ["node", "build"]

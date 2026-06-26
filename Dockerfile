# Multi-stage Docker build for Ainything
# Optimized for production deployment with Podman/Docker

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy package files
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile --offline || pnpm install

# Copy source code
COPY src ./src
COPY svelte.config.js ./
COPY vite.config.ts ./

# Build application
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built assets from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/.svelte-kit ./node_modules/.svelte-kit

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start application
CMD ["node", "build"]

# Use specific Node.js version for consistency
ARG NODE_VERSION=jod
ARG PNPM_VERSION=11.9.0

# ==============================================================================
# Base stage - Common dependencies and user setup
# ==============================================================================
FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION

# Install essential system dependencies including OpenSSL for Prisma
RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y --no-install-recommends \
  curl \
  ca-certificates \
  openssl \
  dumb-init && \
  apt-get autoremove -y && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/* /tmp/* /var/tmp/*

# Install pnpm with caching
RUN --mount=type=cache,target=/root/.npm \
  npm install -g pnpm@${PNPM_VERSION}

# ==============================================================================
# Dependencies stage - Install and cache dependencies
# ==============================================================================
FROM base AS dependencies

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY --chown=node:node package.json pnpm-lock.yaml ./

# Create cache directory and install dependencies with caching
RUN --mount=type=cache,target=/home/node/.local/share/pnpm,uid=1000,gid=1000 \
  --mount=type=cache,target=/home/node/.cache/pnpm,uid=1000,gid=1000 \
  pnpm install --frozen-lockfile --ignore-scripts

# ==============================================================================
# Build stage - Build the application
# ==============================================================================
FROM dependencies AS builder

# Dev-only hooks (husky prepare) must not run in the image build: skip pnpm's pre-run auto install.
ENV PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false

# Set working directory
WORKDIR /app

# Copy source code (use .dockerignore to exclude unnecessary files)
COPY --chown=node:node . .

# Generate Prisma client (engines/cache persisted across builds)
RUN --mount=type=cache,target=/home/node/.cache,uid=1000,gid=1000 \
  pnpm prisma generate

# Build the application
RUN --mount=type=cache,target=/home/node/.cache,uid=1000,gid=1000 \
  pnpm build

# ==============================================================================
# Production dependencies stage - Optimized production install
# ==============================================================================
FROM base AS prod-deps

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=node:node package.json pnpm-lock.yaml ./

# Copy all the dependencies from the dependencies stage
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules/

# Prune development dependencies with caching
RUN --mount=type=cache,target=/home/node/.local/share/pnpm,uid=1000,gid=1000 \
  --mount=type=cache,target=/home/node/.cache/pnpm,uid=1000,gid=1000 \
  pnpm prune --prod --ignore-scripts

# ==============================================================================
# Runtime stage - Final production image
# ==============================================================================
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

# Install runtime dependencies including OpenSSL and Chromium
RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y --no-install-recommends \
  curl \
  ca-certificates \
  openssl \
  dumb-init \
  chromium \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libxcomposite1 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libxss1 \
  libasound2 && \
  apt-get autoremove -y && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/* /tmp/* /var/tmp/*

# Switch to non-root user
USER node
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
  NODE_OPTIONS="--max-old-space-size=512" \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy production dependencies
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules/

# Copy package files
COPY --from=prod-deps --chown=node:node /app/package.json /app/pnpm-lock.yaml ./

# Copy built application
COPY --from=builder --chown=node:node /app/dist ./

# Copy Prisma schema and generated client
COPY --from=builder --chown=node:node /app/prisma ./prisma/

# Build args for configuration
ARG PORT=80
ARG TCP_PORT=4010
ENV PORT=${PORT} TCP_PORT=${TCP_PORT}
EXPOSE ${PORT} ${TCP_PORT}

# Health check with proper error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health 2>/dev/null || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/main"]

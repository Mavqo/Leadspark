# syntax = docker/dockerfile:1

# =============================================================================
# LEADSPARK - Optimized Dockerfile
# Astro 4 + Node Adapter + Tailwind CSS
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20.18-alpine3.20 AS deps
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20.18-alpine3.20 AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY astro.config.mjs ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src ./src
COPY public ./public

# Build Tailwind CSS and Astro application
# Note: build:css è incluso nello script build di package.json
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production (Minimal & Secure)
# -----------------------------------------------------------------------------
FROM node:20.18-alpine3.20 AS production
WORKDIR /app

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astro -u 1001

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy only necessary files from builder
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/package.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Switch to non-root user
USER astro

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))" || exit 1

# Start the application
CMD ["node", "./dist/server/entry.mjs"]

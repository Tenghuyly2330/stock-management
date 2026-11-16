# ==============================================================================
# Stock & Inventory Management System - Backend Production Dockerfile
# Multi-stage, lightweight Alpine image with non-root security execution
# ==============================================================================

# Stage 1: Dependency resolution and pruning
FROM node:20-alpine AS deps
WORKDIR /app

# Install build tools if native dependencies require them
RUN apk add --no-cache libc6-compat

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# ==============================================================================
# Stage 2: Production Runtime
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install curl/wget for container health checks
RUN apk add --no-cache wget

# Create unprivileged system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Configure environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Prepare uploads folder with unprivileged permissions
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

# Copy cached production dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application source code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose internal Express listening port
EXPOSE 5000

# Docker native container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the Node.js production server
CMD ["node", "src/server.js"]

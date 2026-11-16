# ==============================================================================
# Stock & Inventory Management System - Frontend Production Dockerfile
# Multi-stage: Node.js Vite Build -> Nginx Alpine High-Performance Static Host
# ==============================================================================

# Stage 1: Build the React Application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

# Install exact dependencies
RUN npm ci

# Dynamic API Base URL injection during build time (defaults to relative /api)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy frontend source code
COPY . .

# Build production assets using Vite
RUN npm run build

# ==============================================================================
# Stage 2: Serve with High-Performance Nginx Alpine
# ==============================================================================
FROM nginx:1.27-alpine AS runner

# Install curl for container health check
RUN apk add --no-cache curl

# Remove default Nginx welcome site
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/healthz || exit 1

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]


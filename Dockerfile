# ==========================================
# MULTI-STAGE DOCKER BUILD
# Drain Fortin Production System
# ==========================================

# ==========================================
# STAGE 1: Frontend Build
# ==========================================
FROM node:20-alpine AS frontend-builder

# Set working directory
WORKDIR /app/frontend

# Install dependencies first (better caching)
COPY frontend/package*.json ./
RUN npm ci --only=production --no-audit --prefer-offline

# Copy source code and build
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Production Runtime
# ==========================================
FROM node:20-alpine AS production

# Add security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S drainfortin -u 1001

# Set working directory
WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder --chown=drainfortin:nodejs /app/frontend/dist ./frontend/dist

# Copy necessary config files
COPY --chown=drainfortin:nodejs config/ ./config/
COPY --chown=drainfortin:nodejs scripts/ ./scripts/

# Install global dependencies for runtime
RUN npm install -g serve@14.2.3

# Switch to non-root user
USER drainfortin

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["serve", "-s", "frontend/dist", "-l", "3000"]

# ==========================================
# METADATA
# ==========================================
LABEL maintainer="Jean-Samuel Leboeuf <support@drainfortin.com>"
LABEL version="1.0.0"
LABEL description="Drain Fortin Production System - AI Voice Assistant"
LABEL org.opencontainers.image.source="https://github.com/your-org/drain-fortin-production-clean"
LABEL org.opencontainers.image.documentation="https://github.com/your-org/drain-fortin-production-clean/blob/main/README.md"
LABEL org.opencontainers.image.licenses="Proprietary"
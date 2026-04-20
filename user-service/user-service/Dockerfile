# ─────────────────────────────────────────────────────────────────
# Dockerfile for NeoBank User Service
# ─────────────────────────────────────────────────────────────────
#
# A Dockerfile is a recipe for building a Docker "image".
# An image is like a snapshot of your app + everything it needs to run.
# You ship that image to AWS ECR, then Kubernetes runs it as a container.
#
# STAGE 1: Build stage
# We use a full Node.js image to install dependencies
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy package files first (Docker caches layers - if package.json
# hasn't changed, it skips the npm install step next time = faster builds)
COPY package*.json ./

# Install ONLY production dependencies (skip dev tools like nodemon, jest)
RUN npm ci --only=production

# ─────────────────────────────────────────────────────────────────
# STAGE 2: Production stage
# We copy only what we need into a clean, small image
# This keeps the final image small and secure
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Create a non-root user for security
# Running as root inside a container is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeuser -u 1001

WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source code
COPY src/ ./src/
COPY package.json ./

# Change ownership to our non-root user
RUN chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Document which port this service listens on
EXPOSE 3001

# Health check: Docker/Kubernetes will call this to verify the container is healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "src/app.js"]

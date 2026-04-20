# Dockerfile for NeoBank Notification Service
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./
RUN chown -R nodeuser:nodejs /app
USER nodeuser
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/api/notifications/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"
CMD ["node", "src/app.js"]

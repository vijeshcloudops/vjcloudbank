#!/bin/bash
# ─────────────────────────────────────────────
# VjCloudBank Transaction Service — Local Startup Script
# ─────────────────────────────────────────────
# Usage: bash start-local.sh
# Edit DB_PASSWORD and JWT_SECRET below before running

export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=vjcloudbank_accounts
export DB_USER=postgres
export DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
export JWT_SECRET=YOUR_JWT_SECRET_HERE
export PORT=3003

echo "Starting VjCloudBank Transaction Service..."
echo "DB: $DB_NAME on $DB_HOST:$DB_PORT"
echo ""

mvn spring-boot:run

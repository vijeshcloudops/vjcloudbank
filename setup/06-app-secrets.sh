#!/usr/bin/env bash
# 06-app-secrets.sh — Create Kubernetes Secrets for all app services
# Pulls RDS passwords from Secrets Manager (auto-created by RDS)
# Uses YAML+base64 pattern (no shell escaping issues)
# Reads JWT_SECRET from .env.secrets

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"
source "${SCRIPT_DIR}/.env.secrets"

log_step "6. Create Kubernetes Secrets"

# ============================================================
# Step 1: Ensure namespace exists
# ============================================================
log_info "Creating namespace $APP_NAMESPACE if missing..."
kubectl create namespace "$APP_NAMESPACE" 2>/dev/null || log_info "Namespace already exists"

# ============================================================
# Step 2: Pull RDS endpoints + passwords from Secrets Manager
# ============================================================
log_info "Reading RDS endpoints..."
USERS_HOST=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_USERS_ID" \
  --region "$AWS_REGION" \
  --query "DBInstances[0].Endpoint.Address" --output text)

ACCOUNTS_HOST=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_ACCOUNTS_ID" \
  --region "$AWS_REGION" \
  --query "DBInstances[0].Endpoint.Address" --output text)

log_success "Users DB endpoint: $USERS_HOST"
log_success "Accounts DB endpoint: $ACCOUNTS_HOST"

# Each RDS instance with managed master password has a Secrets Manager entry
# Find them by looking at the DB instance metadata
log_info "Reading RDS master passwords from Secrets Manager..."
USERS_SECRET_ARN=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_USERS_ID" \
  --region "$AWS_REGION" \
  --query "DBInstances[0].MasterUserSecret.SecretArn" --output text)

ACCOUNTS_SECRET_ARN=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_ACCOUNTS_ID" \
  --region "$AWS_REGION" \
  --query "DBInstances[0].MasterUserSecret.SecretArn" --output text)

USERS_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "$USERS_SECRET_ARN" \
  --region "$AWS_REGION" \
  --query "SecretString" --output text | jq -r '.password')

ACCOUNTS_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "$ACCOUNTS_SECRET_ARN" \
  --region "$AWS_REGION" \
  --query "SecretString" --output text | jq -r '.password')

if [ -z "$USERS_PASSWORD" ] || [ -z "$ACCOUNTS_PASSWORD" ]; then
  log_error "Could not retrieve one or both RDS passwords"
  exit 1
fi
log_success "Both RDS passwords retrieved (lengths: ${#USERS_PASSWORD}, ${#ACCOUNTS_PASSWORD})"

# ============================================================
# Step 3: Base64-encode every value (avoids shell escaping issues)
# ============================================================
log_info "Encoding secret values..."

b64() { echo -n "$1" | base64 -w0; }

USERS_HOST_B64=$(b64 "$USERS_HOST")
ACCOUNTS_HOST_B64=$(b64 "$ACCOUNTS_HOST")
PORT_B64=$(b64 "5432")
USERS_DB_B64=$(b64 "$DB_USERS_NAME")
ACCOUNTS_DB_B64=$(b64 "$DB_ACCOUNTS_NAME")
USER_B64=$(b64 "$DB_MASTER_USER")
USERS_PW_B64=$(b64 "$USERS_PASSWORD")
ACCOUNTS_PW_B64=$(b64 "$ACCOUNTS_PASSWORD")
JWT_B64=$(b64 "$JWT_SECRET")
JWT_EXP_B64=$(b64 "7d")
REGION_B64=$(b64 "$AWS_REGION")
MOCK_B64=$(b64 "false")

# ============================================================
# Step 4: Apply all 5 secrets via a single YAML manifest
# ============================================================
log_info "Applying all secrets via YAML..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: user-service-secrets
  namespace: ${APP_NAMESPACE}
type: Opaque
data:
  DB_HOST: ${USERS_HOST_B64}
  DB_PORT: ${PORT_B64}
  DB_NAME: ${USERS_DB_B64}
  DB_USER: ${USER_B64}
  DB_PASSWORD: ${USERS_PW_B64}
  JWT_SECRET: ${JWT_B64}
  JWT_EXPIRES_IN: ${JWT_EXP_B64}
---
apiVersion: v1
kind: Secret
metadata:
  name: account-service-secrets
  namespace: ${APP_NAMESPACE}
type: Opaque
data:
  DB_HOST: ${ACCOUNTS_HOST_B64}
  DB_PORT: ${PORT_B64}
  DB_NAME: ${ACCOUNTS_DB_B64}
  DB_USER: ${USER_B64}
  DB_PASSWORD: ${ACCOUNTS_PW_B64}
  JWT_SECRET: ${JWT_B64}
---
apiVersion: v1
kind: Secret
metadata:
  name: transaction-service-secrets
  namespace: ${APP_NAMESPACE}
type: Opaque
data:
  DB_HOST: ${ACCOUNTS_HOST_B64}
  DB_PORT: ${PORT_B64}
  DB_NAME: ${ACCOUNTS_DB_B64}
  DB_USER: ${USER_B64}
  DB_PASSWORD: ${ACCOUNTS_PW_B64}
  JWT_SECRET: ${JWT_B64}
---
apiVersion: v1
kind: Secret
metadata:
  name: notification-service-secrets
  namespace: ${APP_NAMESPACE}
type: Opaque
data:
  JWT_SECRET: ${JWT_B64}
  AWS_REGION: ${REGION_B64}
  USE_MOCK_NOTIFICATIONS: ${MOCK_B64}
---
apiVersion: v1
kind: Secret
metadata:
  name: api-gateway-secrets
  namespace: ${APP_NAMESPACE}
type: Opaque
data:
  JWT_SECRET: ${JWT_B64}
EOF

log_success "All 5 secrets created in $APP_NAMESPACE"

# Verify
echo ""
log_info "Verification:"
kubectl get secrets -n "$APP_NAMESPACE"

echo ""
log_success "Secrets ready. Proceed to ./07-app-deploy.sh"

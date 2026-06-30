#!/usr/bin/env bash
# setup-all.sh — Run all setup scripts in order
# Stops if any script fails (set -e)
# Total time: ~35-45 min mostly waiting for AWS resources

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

START_TIME=$(date +%s)

log_step "🚀 VjCloudBank — Full automated setup"
echo ""
echo "Estimated time: 35-45 minutes (mostly RDS + EKS provisioning)"
echo ""

bash "${SCRIPT_DIR}/00-prerequisites.sh"
bash "${SCRIPT_DIR}/01-ecr-push.sh"
bash "${SCRIPT_DIR}/02-rds.sh"
bash "${SCRIPT_DIR}/03-eks-cluster.sh"
bash "${SCRIPT_DIR}/04-oidc-lbc.sh"
bash "${SCRIPT_DIR}/05-subnet-tags.sh"
bash "${SCRIPT_DIR}/06-app-secrets.sh"
bash "${SCRIPT_DIR}/07-app-deploy.sh"
bash "${SCRIPT_DIR}/08-verify.sh"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
log_step "✅ Total time: ${MINUTES}m ${SECONDS}s"
log_success "VjCloudBank is fully deployed and verified."

#!/usr/bin/env bash
# 00-prerequisites.sh — Verify everything needed for the rest of the scripts
# Safe to run anytime. Does not modify anything in AWS.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

log_step "0. Prerequisites Check"

# Check required tools
log_info "Checking required CLI tools..."
MISSING=0
for tool in aws kubectl helm eksctl docker jq; do
  if ! command -v $tool > /dev/null 2>&1; then
    log_error "$tool not found in PATH"
    MISSING=$((MISSING+1))
  else
    VERSION=$($tool version --short 2>/dev/null || $tool --version 2>/dev/null | head -1)
    log_success "$tool — $VERSION"
  fi
done

if [ $MISSING -gt 0 ]; then
  log_error "$MISSING tools missing. Install them and re-run."
  echo ""
  echo "Installation hints (Git Bash on Windows):"
  echo "  aws:     https://aws.amazon.com/cli/"
  echo "  kubectl: https://kubernetes.io/docs/tasks/tools/"
  echo "  helm:    choco install kubernetes-helm  (or download from helm.sh)"
  echo "  eksctl:  choco install eksctl  (or download from eksctl.io)"
  echo "  docker:  Docker Desktop"
  echo "  jq:      choco install jq"
  exit 1
fi

# Check AWS auth
log_info "Checking AWS authentication..."
CURRENT_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text 2>/dev/null || echo "FAILED")
if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
  log_error "AWS account mismatch. Expected: $AWS_ACCOUNT_ID, Got: $CURRENT_ACCOUNT"
  log_error "Run 'aws configure' to set up credentials."
  exit 1
fi
CURRENT_USER=$(aws sts get-caller-identity --query "Arn" --output text)
log_success "Authenticated as: $CURRENT_USER"

# Check region
CURRENT_REGION=$(aws configure get region)
if [ "$CURRENT_REGION" != "$AWS_REGION" ]; then
  log_warn "Default region is '$CURRENT_REGION', scripts use '$AWS_REGION' explicitly so this is OK"
fi

# Check Docker is running
log_info "Checking Docker daemon..."
if ! docker ps > /dev/null 2>&1; then
  log_error "Docker daemon not running. Start Docker Desktop."
  exit 1
fi
log_success "Docker is running"

# Check local images exist
log_info "Checking that all 6 Docker images exist locally..."
MISSING_IMAGES=0
for svc in "${SERVICES[@]}"; do
  if docker image inspect "vjcloudbank/${svc}:latest" > /dev/null 2>&1; then
    log_success "vjcloudbank/${svc}:latest found"
  else
    log_error "vjcloudbank/${svc}:latest NOT found in local Docker"
    MISSING_IMAGES=$((MISSING_IMAGES+1))
  fi
done

if [ $MISSING_IMAGES -gt 0 ]; then
  log_error "$MISSING_IMAGES images missing. Build them first or rename existing ones."
  exit 1
fi

# Check repo structure
log_info "Checking repo structure..."
if [ ! -d "$REPO_ROOT" ]; then
  log_error "Repo not found at $REPO_ROOT"
  log_error "Update REPO_ROOT in config.sh"
  exit 1
fi
log_success "Repo found at $REPO_ROOT"

if [ ! -d "$MANIFESTS_DIR" ]; then
  log_warn "Manifests dir not found at $MANIFESTS_DIR — you'll need to create it before step 08"
fi

# Check .env.secrets exists
log_info "Checking for .env.secrets file..."
if [ ! -f "${SCRIPT_DIR}/.env.secrets" ]; then
  log_warn ".env.secrets not found"
  log_info "Copy the template: cp .env.secrets.template .env.secrets"
  log_info "Then edit it and put your JWT_SECRET"
  exit 1
fi
source "${SCRIPT_DIR}/.env.secrets"
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "PASTE_YOUR_JWT_SECRET_HERE" ]; then
  log_error "JWT_SECRET not set in .env.secrets"
  exit 1
fi
log_success ".env.secrets loaded — JWT_SECRET is set (length: ${#JWT_SECRET})"

echo ""
log_success "All prerequisites met. Proceed to ./01-ecr-push.sh"

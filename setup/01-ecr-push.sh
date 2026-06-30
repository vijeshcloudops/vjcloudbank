#!/usr/bin/env bash
# 01-ecr-push.sh — Create ECR repos and push existing local Docker images
# Idempotent: re-running just skips already-existing repos and re-pushes images

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

log_step "1. ECR — Create repos and push images"

# Step 1: Authenticate Docker to ECR
log_info "Authenticating Docker to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_BASE" > /dev/null 2>&1
log_success "Docker authenticated to ECR"

# Step 2: Create repos (idempotent)
for svc in "${SERVICES[@]}"; do
  REPO_NAME="vjcloudbank/${svc}"
  if aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" > /dev/null 2>&1; then
    log_info "ECR repo $REPO_NAME already exists, skipping create"
  else
    log_info "Creating ECR repo: $REPO_NAME"
    aws ecr create-repository \
      --repository-name "$REPO_NAME" \
      --region "$AWS_REGION" \
      --image-scanning-configuration scanOnPush=true \
      --output text > /dev/null
    log_success "Created $REPO_NAME"
  fi
done

# Step 3: Tag + push each image
for svc in "${SERVICES[@]}"; do
  LOCAL_TAG="vjcloudbank/${svc}:latest"
  REMOTE_TAG="${ECR_BASE}/vjcloudbank/${svc}:latest"

  log_info "Tagging $LOCAL_TAG → $REMOTE_TAG"
  docker tag "$LOCAL_TAG" "$REMOTE_TAG"

  log_info "Pushing $REMOTE_TAG (this may take a minute on first run)..."
  docker push "$REMOTE_TAG" 2>&1 | grep -E "Pushed|digest|already exists|denied" | head -5

  log_success "Pushed $svc"
done

# Step 4: Verify
echo ""
log_info "Verifying images in ECR..."
for svc in "${SERVICES[@]}"; do
  COUNT=$(aws ecr list-images \
    --repository-name "vjcloudbank/${svc}" \
    --region "$AWS_REGION" \
    --query "length(imageIds)" --output text 2>/dev/null || echo "0")
  log_success "vjcloudbank/${svc}: ${COUNT} image(s) in ECR"
done

echo ""
log_success "ECR push complete. Proceed to ./02-rds.sh"

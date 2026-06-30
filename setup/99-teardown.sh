#!/usr/bin/env bash
# 99-teardown.sh — Tear down everything in reverse order
# WARNING: destructive. Confirms before each major step.
# Skips ECR images by default (keep them to save rebuild time tomorrow)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

log_step "99. TEARDOWN — VjCloudBank Infrastructure"

echo ""
log_warn "This will DELETE the following:"
echo "  • All Kubernetes services in vjcloudbank (deletes the 2 NLBs)"
echo "  • The EKS cluster $CLUSTER_NAME (~10-15 min)"
echo "  • Both RDS instances (data is GONE forever)"
echo "  • Orphaned OIDC providers in IAM"
echo ""
log_info "Will NOT delete (kept for rebuild speed):"
echo "  • ECR repos and images"
echo "  • IAM policy/role for LBC"
echo "  • IAM role for EBS CSI"
echo "  • Subnet tags (harmless)"
echo ""

read -p "Type 'yes' to continue, anything else to abort: " confirm
if [ "$confirm" != "yes" ]; then
  log_info "Aborted."
  exit 0
fi

# ============================================================
# Step 1: Delete app services first (so NLBs get deleted cleanly)
# ============================================================
log_step "Step 1/4: Deleting app NLB services"
if kubectl get ns "$APP_NAMESPACE" > /dev/null 2>&1; then
  kubectl delete svc api-gateway frontend -n "$APP_NAMESPACE" 2>/dev/null || true
  log_info "Sleeping 30s for AWS to actually delete the NLBs..."
  sleep 30
else
  log_info "Namespace $APP_NAMESPACE doesn't exist, skipping"
fi

# Confirm no orphan NLBs
ORPHAN_NLBS=$(aws elbv2 describe-load-balancers \
  --region "$AWS_REGION" \
  --query "LoadBalancers[?contains(LoadBalancerName, 'k8s-')].LoadBalancerName" \
  --output text)
if [ -n "$ORPHAN_NLBS" ]; then
  log_warn "Orphan NLBs detected: $ORPHAN_NLBS"
  log_warn "These cost ~\$18/month each. Delete manually from EC2 console."
else
  log_success "No orphan NLBs"
fi

# ============================================================
# Step 2: Delete EKS cluster (eksctl handles nodegroup + addons)
# ============================================================
log_step "Step 2/4: Deleting EKS cluster $CLUSTER_NAME"
if aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" > /dev/null 2>&1; then
  log_info "Deleting cluster — this takes 10-15 minutes..."
  eksctl delete cluster --name "$CLUSTER_NAME" --region "$AWS_REGION"
  log_success "Cluster deleted"
else
  log_info "Cluster $CLUSTER_NAME doesn't exist, skipping"
fi

# ============================================================
# Step 3: Delete both RDS instances
# ============================================================
log_step "Step 3/4: Deleting both RDS instances"
for ID in "$DB_USERS_ID" "$DB_ACCOUNTS_ID"; do
  if aws rds describe-db-instances \
      --db-instance-identifier "$ID" \
      --region "$AWS_REGION" > /dev/null 2>&1; then
    log_info "Disabling deletion protection on $ID..."
    aws rds modify-db-instance \
      --db-instance-identifier "$ID" \
      --no-deletion-protection \
      --apply-immediately \
      --region "$AWS_REGION" > /dev/null 2>&1 || true

    log_info "Deleting $ID..."
    aws rds delete-db-instance \
      --db-instance-identifier "$ID" \
      --skip-final-snapshot \
      --delete-automated-backups \
      --region "$AWS_REGION" \
      --output text > /dev/null
    log_success "Deletion initiated for $ID"
  else
    log_info "$ID doesn't exist, skipping"
  fi
done

# ============================================================
# Step 4: Clean up orphaned OIDC providers
# ============================================================
log_step "Step 4/4: Cleaning up orphaned OIDC providers"
aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[*].Arn" --output text | tr '\t' '\n' | \
  while read -r ARN; do
    if [[ "$ARN" == *"oidc.eks.${AWS_REGION}.amazonaws.com"* ]]; then
      log_info "Deleting orphan OIDC: $ARN"
      aws iam delete-open-id-connect-provider --open-id-connect-provider-arn "$ARN" 2>/dev/null || true
    fi
  done
log_success "OIDC cleanup done"

echo ""
log_step "Final audit"

echo "--- EKS Clusters ---"
aws eks list-clusters --region "$AWS_REGION" --output text

echo ""
echo "--- RDS Instances (any 'deleting' status is normal, just wait) ---"
aws rds describe-db-instances --region "$AWS_REGION" \
  --query "DBInstances[?contains(DBInstanceIdentifier, 'vjcloudbank')].{ID:DBInstanceIdentifier,Status:DBInstanceStatus}" \
  --output table

echo ""
echo "--- Load Balancers ---"
aws elbv2 describe-load-balancers --region "$AWS_REGION" \
  --query "LoadBalancers[*].LoadBalancerName" --output text

echo ""
log_success "Teardown complete. Costs should drop to near-zero shortly."
log_info "ECR images, IAM resources, and subnet tags are kept for tomorrow's rebuild."

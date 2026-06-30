#!/usr/bin/env bash
# 04-oidc-lbc.sh — Phase 7a: OIDC setup + IAM role + ServiceAccount + LBC via Helm
# Idempotent: handles existing resources gracefully and updates trust policy with current OIDC

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

log_step "4. Phase 7a — AWS Load Balancer Controller with IRSA"

# ============================================================
# Sub-step 1: Get current cluster's OIDC ID
# ============================================================
OIDC_ID=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" \
  --query "cluster.identity.oidc.issuer" --output text | awk -F'/' '{print $NF}')

if [ -z "$OIDC_ID" ]; then
  log_error "Could not get OIDC ID from cluster $CLUSTER_NAME"
  exit 1
fi
log_success "Current cluster OIDC ID: $OIDC_ID"

# ============================================================
# Sub-step 2: Clean up orphaned OIDC providers in IAM
# ============================================================
log_info "Checking for orphaned OIDC providers..."
ALL_OIDC=$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[*].Arn" --output text | tr '\t' '\n')

ORPHAN_COUNT=0
for arn in $ALL_OIDC; do
  if [[ "$arn" != *"$OIDC_ID"* ]]; then
    if [[ "$arn" == *"oidc.eks."* ]]; then
      log_warn "Deleting orphan OIDC: $arn"
      aws iam delete-open-id-connect-provider --open-id-connect-provider-arn "$arn" 2>/dev/null || true
      ORPHAN_COUNT=$((ORPHAN_COUNT+1))
    fi
  fi
done
if [ $ORPHAN_COUNT -gt 0 ]; then
  log_success "Deleted $ORPHAN_COUNT orphan OIDC provider(s)"
else
  log_success "No orphans found"
fi

# Verify the active OIDC is registered (eksctl should've done this)
ACTIVE_REGISTERED=$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?contains(Arn, '$OIDC_ID')].Arn" --output text)
if [ -z "$ACTIVE_REGISTERED" ]; then
  log_warn "Active OIDC not registered in IAM. Registering now..."
  eksctl utils associate-iam-oidc-provider \
    --cluster "$CLUSTER_NAME" \
    --region "$AWS_REGION" \
    --approve
fi
log_success "Active OIDC registered: $ACTIVE_REGISTERED"

# ============================================================
# Sub-step 3: Download IAM policy + create (or refresh)
# ============================================================
LBC_DIR="${MANIFESTS_DIR}/aws-load-balancer-controller"
mkdir -p "$LBC_DIR"
cd "$LBC_DIR"

if [ ! -f iam_policy.json ]; then
  log_info "Downloading official LBC IAM policy..."
  curl -sLO https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.13.4/docs/install/iam_policy.json
fi

# Create policy if missing
if aws iam get-policy --policy-arn "$LBC_POLICY_ARN" > /dev/null 2>&1; then
  log_info "IAM policy $LBC_POLICY_NAME already exists"
else
  log_info "Creating IAM policy $LBC_POLICY_NAME..."
  aws iam create-policy \
    --policy-name "$LBC_POLICY_NAME" \
    --policy-document file://iam_policy.json \
    --description "Policy for AWS Load Balancer Controller — managed by VjCloudBank setup script" \
    --output text > /dev/null
  log_success "Created policy"
fi

# ============================================================
# Sub-step 4: Create/update IAM role with IRSA trust policy
# ============================================================
log_info "Generating trust policy with current OIDC ID..."
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/oidc.eks.${AWS_REGION}.amazonaws.com/id/${OIDC_ID}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.${AWS_REGION}.amazonaws.com/id/${OIDC_ID}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller",
          "oidc.eks.${AWS_REGION}.amazonaws.com/id/${OIDC_ID}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

if aws iam get-role --role-name "$LBC_ROLE_NAME" > /dev/null 2>&1; then
  log_info "IAM role $LBC_ROLE_NAME exists — updating trust policy with current OIDC ID"
  aws iam update-assume-role-policy \
    --role-name "$LBC_ROLE_NAME" \
    --policy-document file://trust-policy.json
else
  log_info "Creating IAM role $LBC_ROLE_NAME..."
  aws iam create-role \
    --role-name "$LBC_ROLE_NAME" \
    --assume-role-policy-document file://trust-policy.json \
    --description "IRSA role for AWS Load Balancer Controller" \
    --output text > /dev/null
fi
log_success "IAM role $LBC_ROLE_NAME ready"

# Attach policy (idempotent)
aws iam attach-role-policy \
  --role-name "$LBC_ROLE_NAME" \
  --policy-arn "$LBC_POLICY_ARN" 2>/dev/null || true
log_success "Policy attached to role"

# ============================================================
# Sub-step 5: Create Kubernetes ServiceAccount with role annotation
# ============================================================
log_info "Creating ServiceAccount in kube-system..."
cat > service-account.yaml <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
  labels:
    app.kubernetes.io/component: controller
    app.kubernetes.io/name: aws-load-balancer-controller
  annotations:
    eks.amazonaws.com/role-arn: ${LBC_ROLE_ARN}
EOF

kubectl apply -f service-account.yaml
log_success "ServiceAccount ready"

# ============================================================
# Sub-step 6: Install LBC via Helm
# ============================================================
log_info "Adding EKS Helm repo..."
helm repo add eks https://aws.github.io/eks-charts 2>/dev/null || true
helm repo update > /dev/null
log_success "Helm repo updated"

VPC_ID=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" \
  --query "cluster.resourcesVpcConfig.vpcId" --output text)
log_info "VPC: $VPC_ID"

if helm list -n kube-system | grep -q "aws-load-balancer-controller"; then
  log_info "LBC Helm release exists — upgrading"
  helm upgrade aws-load-balancer-controller eks/aws-load-balancer-controller \
    --namespace kube-system \
    --set clusterName="$CLUSTER_NAME" \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller \
    --set region="$AWS_REGION" \
    --set vpcId="$VPC_ID"
else
  log_info "Installing LBC via Helm..."
  helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
    --namespace kube-system \
    --set clusterName="$CLUSTER_NAME" \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller \
    --set region="$AWS_REGION" \
    --set vpcId="$VPC_ID"
fi

# Wait for LBC to be ready
log_info "Waiting for LBC pods to be ready..."
kubectl wait --for=condition=available --timeout=180s \
  deployment/aws-load-balancer-controller -n kube-system
log_success "LBC deployment is available"

# Verify pods are running
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

echo ""
log_success "Phase 7a complete. Proceed to ./05-subnet-tags.sh"

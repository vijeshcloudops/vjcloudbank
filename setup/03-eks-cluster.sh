#!/usr/bin/env bash
# 03-eks-cluster.sh — Create the EKS cluster + node group + addons via eksctl
# Idempotent: skips if cluster already exists
# Uses default VPC (no custom networking for the lab)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

log_step "3. EKS — Create cluster, node group, and addons"

# Check if cluster already exists
if aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" > /dev/null 2>&1; then
  STATUS=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" \
    --query "cluster.status" --output text)
  log_info "Cluster $CLUSTER_NAME already exists with status: $STATUS"
  if [ "$STATUS" = "ACTIVE" ]; then
    log_success "Cluster is active, updating kubeconfig"
    aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"
    exit 0
  else
    log_warn "Cluster exists but is not ACTIVE. Wait and try again."
    exit 1
  fi
fi

# Write the eksctl ClusterConfig
log_info "Generating eksctl ClusterConfig..."
CONFIG_FILE="/tmp/eksctl-${CLUSTER_NAME}.yaml"
cat > "$CONFIG_FILE" <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: ${CLUSTER_NAME}
  region: ${AWS_REGION}
  version: "${CLUSTER_VERSION}"

iam:
  withOIDC: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver
    podIdentityAssociations:
      - serviceAccountName: ebs-csi-controller-sa
        namespace: kube-system
        roleName: ${EBS_CSI_ROLE_NAME}
        permissionPolicyARNs:
          - arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy
  - name: eks-pod-identity-agent
  - name: amazon-cloudwatch-observability
  - name: metrics-server

managedNodeGroups:
  - name: ${NODE_GROUP_NAME}
    instanceType: ${NODE_TYPE}
    desiredCapacity: ${NODE_COUNT}
    minSize: 1
    maxSize: 4
    volumeSize: 30
    ssh:
      allow: false
    labels:
      role: workers
    tags:
      Name: ${CLUSTER_NAME}-node
      Project: vjcloudbank
EOF

log_info "ClusterConfig saved to $CONFIG_FILE"
log_info "Creating EKS cluster (this takes ~15-20 minutes)..."
log_info "Brew a coffee. ☕"
echo ""

# Create cluster — this blocks until done
eksctl create cluster -f "$CONFIG_FILE"

log_success "EKS cluster created"

# Update kubeconfig
log_info "Updating kubeconfig..."
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"

# Verify
log_info "Verifying cluster..."
kubectl get nodes
echo ""
kubectl get pods -n kube-system

echo ""
log_success "EKS setup complete. Proceed to ./04-oidc-lbc.sh"

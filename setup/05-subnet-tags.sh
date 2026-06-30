#!/usr/bin/env bash
# 05-subnet-tags.sh — Tag default VPC subnets so the LBC can discover them
# Required for ALB provisioning in Phase 7b
# Idempotent: re-running just re-applies the same tag

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

log_step "5. Tag default VPC subnets for ALB discovery"

VPC_ID=$(aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text)

log_info "Default VPC: $VPC_ID"

SUBNET_IDS=$(aws ec2 describe-subnets \
  --region "$AWS_REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" --output text)

if [ -z "$SUBNET_IDS" ]; then
  log_error "No subnets found in default VPC. Something's wrong."
  exit 1
fi

log_info "Subnets to tag: $SUBNET_IDS"

# Tag each subnet for public ALB discovery
for SUBNET in $SUBNET_IDS; do
  aws ec2 create-tags \
    --region "$AWS_REGION" \
    --resources "$SUBNET" \
    --tags Key=kubernetes.io/role/elb,Value=1
  log_success "Tagged $SUBNET with kubernetes.io/role/elb=1"
done

# Verify
echo ""
log_info "Verification — subnets with elb tag:"
aws ec2 describe-subnets \
  --region "$AWS_REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:kubernetes.io/role/elb,Values=1" \
  --query "Subnets[*].{ID:SubnetId,AZ:AvailabilityZone}" \
  --output table

echo ""
log_success "Subnet tagging complete. Proceed to ./06-app-secrets.sh"

#!/usr/bin/env bash
# config.sh — Shared configuration for VjCloudBank automation
# This file is sourced by all other scripts. Edit values here, not in each script.

# =====================================================
# AWS Configuration
# =====================================================
export AWS_ACCOUNT_ID="135808958462"
export AWS_REGION="ap-south-1"
export ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# =====================================================
# Cluster Configuration
# =====================================================
export CLUSTER_NAME="vjcloudbank-eks"
export CLUSTER_VERSION="1.35"
export NODE_GROUP_NAME="vjcloudbank-nodes"
export NODE_TYPE="t3.medium"
export NODE_COUNT="2"

# =====================================================
# Database Configuration
# =====================================================
export DB_USERS_ID="vjcloudbank-users-db"
export DB_ACCOUNTS_ID="vjcloudbank-accounts-db"
export DB_USERS_NAME="vjcloudbank_users"
export DB_ACCOUNTS_NAME="vjcloudbank_accounts"
export DB_MASTER_USER="vjcloud_admin"
export DB_INSTANCE_CLASS="db.t3.micro"
export DB_ENGINE_VERSION="15.15"
export DB_STORAGE="20"

# =====================================================
# Application Configuration
# =====================================================
export APP_NAMESPACE="vjcloudbank"
export REPO_ROOT="/d/real-projects/vjcloudbank/vjcloudbank-repo"
export MANIFESTS_DIR="${REPO_ROOT}/k8s-manifests"

# Services list — used by ECR push, deployment, etc.
export SERVICES=(api-gateway user-service account-service transaction-service notification-service frontend)

# =====================================================
# Phase 7a — LBC IAM resources
# =====================================================
export LBC_POLICY_NAME="AWSLoadBalancerControllerIAMPolicy"
export LBC_ROLE_NAME="AmazonEKSLoadBalancerControllerRole"
export LBC_POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${LBC_POLICY_NAME}"
export LBC_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${LBC_ROLE_NAME}"

# =====================================================
# EBS CSI Pod Identity
# =====================================================
export EBS_CSI_ROLE_NAME="AmazonEKS_EBS_CSI_DriverRole"
export EBS_CSI_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${EBS_CSI_ROLE_NAME}"

# =====================================================
# Helpers — pretty output
# =====================================================
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ️  $*${NC}"; }
log_success() { echo -e "${GREEN}✅ $*${NC}"; }
log_warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
log_error()   { echo -e "${RED}❌ $*${NC}"; }
log_step()    { echo ""; echo -e "${BLUE}═══════ $* ═══════${NC}"; }

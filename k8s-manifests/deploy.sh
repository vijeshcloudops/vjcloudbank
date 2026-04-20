#!/bin/bash
# ─────────────────────────────────────────────
# VjCloudBank — Master Deploy Script
# Deploys all services to EKS in correct order
# ─────────────────────────────────────────────
# Usage: bash deploy.sh

set -e  # Exit on any error

echo "╔══════════════════════════════════════════╗"
echo "║   VjCloudBank — Deploying to EKS         ║"
echo "╚══════════════════════════════════════════╝"

# Verify kubectl is connected
echo ""
echo "→ Verifying cluster connection..."
kubectl cluster-info --context=$(kubectl config current-context) > /dev/null 2>&1
echo "✅ Connected to EKS cluster"

# Verify namespace
kubectl get namespace vjcloudbank > /dev/null 2>&1 || \
  kubectl create namespace vjcloudbank
echo "✅ Namespace vjcloudbank ready"

# Deploy services in order
echo ""
echo "→ Deploying User Service..."
kubectl apply -f user-service/deployment.yaml
echo "✅ User Service deployed"

echo "→ Deploying Account Service..."
kubectl apply -f account-service/deployment.yaml
echo "✅ Account Service deployed"

echo "→ Deploying Transaction Service..."
kubectl apply -f transaction-service/deployment.yaml
echo "✅ Transaction Service deployed"

echo "→ Deploying Notification Service..."
kubectl apply -f notification-service/deployment.yaml
echo "✅ Notification Service deployed"

echo "→ Deploying API Gateway..."
kubectl apply -f api-gateway/deployment.yaml
echo "✅ API Gateway deployed"

echo "→ Deploying Frontend..."
kubectl apply -f frontend/deployment.yaml
echo "✅ Frontend deployed"

# Wait for rollout
echo ""
echo "→ Waiting for all deployments to be ready..."
kubectl rollout status deployment/user-service -n vjcloudbank
kubectl rollout status deployment/account-service -n vjcloudbank
kubectl rollout status deployment/transaction-service -n vjcloudbank
kubectl rollout status deployment/notification-service -n vjcloudbank
kubectl rollout status deployment/api-gateway -n vjcloudbank
kubectl rollout status deployment/frontend -n vjcloudbank

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   All services deployed successfully!    ║"
echo "╚══════════════════════════════════════════╝"

# Show pod status
echo ""
echo "→ Pod status:"
kubectl get pods -n vjcloudbank

# Show services and Load Balancer URLs
echo ""
echo "→ Services and Load Balancer URLs:"
kubectl get services -n vjcloudbank

echo ""
echo "→ Getting Load Balancer URLs..."
echo "API Gateway URL:"
kubectl get service api-gateway -n vjcloudbank \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
echo ""
echo "Frontend URL:"
kubectl get service frontend -n vjcloudbank \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
echo ""

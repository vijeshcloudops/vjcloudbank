#!/usr/bin/env bash
# 07-app-deploy.sh — Apply Phase 6 Kubernetes manifests
# Scales replicas to 1 to fit in t3.medium x 2 cluster
# Idempotent: kubectl apply is safe to re-run

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

log_step "7. Deploy application services"

if [ ! -d "$MANIFESTS_DIR" ]; then
  log_error "Manifests directory not found: $MANIFESTS_DIR"
  log_error "Make sure your k8s-manifests folder exists with subdirs per service"
  exit 1
fi

# Apply each service's manifest
for svc in "${SERVICES[@]}"; do
  MANIFEST="${MANIFESTS_DIR}/${svc}/deployment.yaml"
  if [ -f "$MANIFEST" ]; then
    log_info "Applying $svc..."
    kubectl apply -f "$MANIFEST"
    log_success "Applied $svc"
  else
    log_warn "Manifest not found: $MANIFEST — skipping"
  fi
done

# Scale to 1 replica to fit in cluster
log_info "Scaling all deployments to 1 replica (fits in t3.medium x 2)..."
kubectl scale deployment account-service api-gateway frontend \
  user-service transaction-service \
  --replicas=1 \
  -n "$APP_NAMESPACE" 2>/dev/null || true

# Wait for all pods to be ready
log_info "Waiting for all pods to be Running (timeout 3 min)..."
sleep 5

TIMEOUT=180
ELAPSED=0
INTERVAL=10
while [ $ELAPSED -lt $TIMEOUT ]; do
  TOTAL=$(kubectl get pods -n "$APP_NAMESPACE" --no-headers 2>/dev/null | wc -l)
  READY=$(kubectl get pods -n "$APP_NAMESPACE" --no-headers 2>/dev/null | grep -c " Running " || echo 0)

  if [ "$TOTAL" -gt 0 ] && [ "$READY" = "$TOTAL" ]; then
    log_success "All $TOTAL pods Running"
    break
  fi
  echo -n "  $READY/$TOTAL pods ready... "
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
  echo "(${ELAPSED}s elapsed)"
done

echo ""
kubectl get pods -n "$APP_NAMESPACE"
echo ""
kubectl get svc -n "$APP_NAMESPACE"

echo ""
log_success "Application deployed. Proceed to ./08-verify.sh"

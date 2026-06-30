#!/usr/bin/env bash
# 08-verify.sh — End-to-end smoke test
# Tests: pods Running, services reachable, API healthy, registration works

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

log_step "8. End-to-end verification"

# Check all pods Running
log_info "Checking application pods..."
NOT_READY=$(kubectl get pods -n "$APP_NAMESPACE" --no-headers 2>/dev/null | \
  awk '$3 != "Running" {print $1}' | wc -l)
TOTAL=$(kubectl get pods -n "$APP_NAMESPACE" --no-headers 2>/dev/null | wc -l)
if [ "$NOT_READY" -gt 0 ]; then
  log_error "$NOT_READY out of $TOTAL pods not Running"
  kubectl get pods -n "$APP_NAMESPACE"
  exit 1
fi
log_success "All $TOTAL pods Running"

# Check LBC pods
log_info "Checking LBC pods..."
LBC_NOT_READY=$(kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller --no-headers 2>/dev/null | \
  awk '$3 != "Running" {print $1}' | wc -l)
LBC_TOTAL=$(kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller --no-headers 2>/dev/null | wc -l)
if [ "$LBC_NOT_READY" -gt 0 ]; then
  log_error "$LBC_NOT_READY out of $LBC_TOTAL LBC pods not Running"
  exit 1
fi
log_success "$LBC_TOTAL/$LBC_TOTAL LBC pods Running"

# Get API URL
log_info "Getting API Gateway URL..."
API_URL=""
TIMEOUT=120
ELAPSED=0
while [ -z "$API_URL" ] && [ $ELAPSED -lt $TIMEOUT ]; do
  API_URL=$(kubectl get svc api-gateway -n "$APP_NAMESPACE" \
    -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
  if [ -z "$API_URL" ]; then
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo "  Waiting for NLB hostname... (${ELAPSED}s)"
  fi
done

if [ -z "$API_URL" ]; then
  log_error "Could not get API URL after ${TIMEOUT}s"
  exit 1
fi
log_success "API URL: http://$API_URL"

FRONTEND_URL=$(kubectl get svc frontend -n "$APP_NAMESPACE" \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
log_success "Frontend URL: http://$FRONTEND_URL"

# Wait for NLB to actually serve traffic (NLBs take ~2 min to be fully ready)
log_info "Waiting for NLB to start serving traffic..."
for i in $(seq 1 24); do
  if curl -s -m 5 -o /dev/null -w "%{http_code}" "http://$API_URL/health" | grep -q "200"; then
    break
  fi
  echo -n "."
  sleep 10
done
echo ""

# Health check
log_info "Testing /health endpoint..."
HEALTH=$(curl -s -m 10 "http://$API_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
  log_success "API Gateway is healthy"
  echo "$HEALTH" | python -m json.tool 2>/dev/null || echo "$HEALTH"
else
  log_error "Health check failed"
  echo "Response: $HEALTH"
  exit 1
fi

# Registration test
echo ""
log_info "Testing registration flow..."
EMAIL="verify_$(date +%s)@vjcloudbank.com"
RESULT=$(curl -s -m 10 -X POST "http://$API_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"full_name\":\"Verify User\",\"email\":\"$EMAIL\",\"password\":\"SecurePass1\"}")

if echo "$RESULT" | grep -q "success.*true"; then
  log_success "Registration works"
  echo "$RESULT" | python -m json.tool 2>/dev/null || echo "$RESULT"
else
  log_error "Registration failed"
  echo "Response: $RESULT"
  exit 1
fi

echo ""
log_step "🎉 VjCloudBank is LIVE!"
echo ""
echo "  Frontend:  http://$FRONTEND_URL"
echo "  API:       http://$API_URL"
echo ""
echo "Try registering and logging in from the browser."
echo "Then proceed to Phase 7b (manual): convert api-gateway to ClusterIP + Ingress"
echo ""
echo "When done for the day, run: ./99-teardown.sh"

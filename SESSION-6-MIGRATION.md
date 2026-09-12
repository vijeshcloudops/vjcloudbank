# Session 6 — SIT Environment Migration Guide

**Purpose:** Rename `vjcloudbank` namespace → `sit`. Deploy via new ArgoCD apps. Wire up SIT deployment pipeline with smoke tests.

---

## What's in this bundle

```
manifests/argocd-apps/               ← Updated ArgoCD apps (namespace: sit)
├── user-service.yaml                (name: sit-user-service)
├── account-service.yaml             (name: sit-account-service)
├── transaction-service.yaml         (name: sit-transaction-service)
├── notification-service.yaml        (name: sit-notification-service)
├── api-gateway.yaml                 (name: sit-api-gateway)
└── frontend.yaml                    (name: sit-frontend)

manifests/values/
└── api-gateway-values.yaml          ← Cross-service URLs updated to *.sit.svc.cluster.local

tests/postman/
├── vjcloudbank-sit-smoke.postman_collection.json    ← 11 smoke tests
└── environments/
    └── sit.postman_environment.json                  ← baseUrl placeholder

Jenkinsfile.sit-deploy                                ← New SIT deployment pipeline

docs/TESTING-STRATEGY.md                              ← Interview-facing narrative
```

---

## Migration steps

### 1. Extract bundle to repo

```bash
cd /d/real-projects/vjcloudbank/vjcloudbank-repo
unzip -o ~/Downloads/phase6-sit-pipeline.zip
```

Overwrites all 6 ArgoCD apps + `api-gateway-values.yaml`. Adds `tests/postman/`, `Jenkinsfile.sit-deploy`, `docs/TESTING-STRATEGY.md`.

### 2. Delete old vjcloudbank ArgoCD apps (BEFORE applying new ones)

If your infra is currently UP with the old apps:

```bash
# List current apps
kubectl -n argocd get applications

# Delete the old vjcloudbank-* apps
kubectl -n argocd delete application vjcloudbank-user-service
kubectl -n argocd delete application vjcloudbank-account-service
kubectl -n argocd delete application vjcloudbank-transaction-service
kubectl -n argocd delete application vjcloudbank-notification-service
kubectl -n argocd delete application vjcloudbank-api-gateway
kubectl -n argocd delete application vjcloudbank-frontend

# Wait for ArgoCD to clean up the vjcloudbank namespace resources
kubectl -n vjcloudbank get all
# Once empty, delete the namespace itself
kubectl delete namespace vjcloudbank
```

If infra is DOWN, skip this — nothing to clean.

### 3. Apply new SIT ArgoCD apps

```bash
kubectl apply -f manifests/argocd-apps/
```

ArgoCD will:
- Create the `sit` namespace (`CreateNamespace=true` in the app spec)
- Deploy all 6 services to `sit`
- Provision the api-gateway NLB
- Auto-sync from Git going forward

### 4. Copy K8s Secrets to sit namespace

Your services need their DB creds + JWT_SECRET as K8s Secrets. Since we renamed the namespace, the Secrets need to be re-created in `sit`.

```bash
# For each service that needs secrets:
# user-service, account-service, transaction-service, notification-service, api-gateway

# If you still have secrets in vjcloudbank namespace:
for SVC in user-service account-service transaction-service notification-service api-gateway; do
  kubectl get secret ${SVC}-secrets -n vjcloudbank -o yaml \
    | sed 's/namespace: vjcloudbank/namespace: sit/' \
    | kubectl apply -f -
done

# If you're starting fresh, create them manually.
# See your existing REBUILD-RUNBOOK for the create-secret commands.
```

### 5. Verify deployment

```bash
# Wait a few minutes for ArgoCD to sync
kubectl -n argocd get applications

# All should show Synced + Healthy:
# sit-user-service       Synced  Healthy
# sit-account-service    Synced  Healthy
# ...

# Check pods
kubectl -n sit get pods

# Get the api-gateway NLB hostname
kubectl -n sit get svc api-gateway
```

### 6. Test manually first

Once NLB is serving:

```bash
export API_GATEWAY_URL=$(kubectl -n sit get svc api-gateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "API Gateway: http://${API_GATEWAY_URL}"

# Test health
curl http://${API_GATEWAY_URL}/health
curl http://${API_GATEWAY_URL}/api/users/health
curl http://${API_GATEWAY_URL}/api/accounts/health
curl http://${API_GATEWAY_URL}/api/transactions/health

# All should return 200 with { "status": "healthy" }
```

### 7. Run smoke tests locally (optional, before Jenkins)

```bash
# Install newman if you don't have it
npm install -g newman

# Update baseUrl in environment file
sed -i "s|http://REPLACE_WITH_API_GATEWAY_NLB_HOSTNAME|http://${API_GATEWAY_URL}|" \
  tests/postman/environments/sit.postman_environment.json

# Run smoke tests
newman run tests/postman/vjcloudbank-sit-smoke.postman_collection.json \
  --environment tests/postman/environments/sit.postman_environment.json

# Should see all tests pass
```

### 8. Configure Jenkins for the new SIT pipeline

**Credentials needed:**

1. **`github-manifest-repo`** — Username/password credential
   - Username: your GitHub username (`vijeshcloudops`)
   - Password: GitHub Personal Access Token with `repo` scope
   - Purpose: pipeline commits image tag updates to the manifest repo

2. **`argocd-auth-token`** — Secret text credential
   - Value: ArgoCD API token
   - How to generate:
     ```bash
     # Login to ArgoCD CLI first
     argocd account generate-token --account admin

     # Or if you have RBAC set up:
     argocd account generate-token --account jenkins-deploy
     ```

**Create Jenkins pipeline job:**

- New Item → Pipeline (not Multibranch — this is a one-off deployment pipeline)
- Name: `sit-deploy`
- Pipeline script from SCM
- SCM: Git (your repo URL)
- Branch: `main`
- Script Path: `Jenkinsfile.sit-deploy`
- Save

**First run:**

- Build with Parameters
- Enter image tag for one service you want to deploy (leave others blank)
- Check "Run smoke tests"
- Build

### 9. Commit + push everything

```bash
cd /d/real-projects/vjcloudbank/vjcloudbank-repo

git status
git add manifests/argocd-apps/ manifests/values/api-gateway-values.yaml \
        tests/postman/ Jenkinsfile.sit-deploy docs/TESTING-STRATEGY.md

git commit -m "Session 6: SIT environment + smoke test pipeline

- Renamed all ArgoCD apps from vjcloudbank-* to sit-* deploying to sit namespace
- Updated api-gateway cross-service URLs to *.sit.svc.cluster.local
- Added Postman smoke collection (health checks + full user journey)
- Added Jenkinsfile.sit-deploy: parameterized deployment pipeline
  - Updates manifest tags via yq + Git commit
  - Waits for ArgoCD sync via CLI
  - Runs Newman smoke tests, publishes JUnit results
- Added TESTING-STRATEGY.md with environment map, ownership model,
  and interview positioning talking points"

git push origin main
```

---

## Troubleshooting

### `sit` namespace not created

ArgoCD app spec has `CreateNamespace=true` — should auto-create. If not:

```bash
kubectl create namespace sit
```

Then re-sync the ArgoCD apps.

### Pod stuck in `ImagePullBackOff`

Image tag doesn't exist in ECR. Check:

```bash
aws ecr describe-images --region ap-south-1 \
  --repository-name vjcloudbank/user-service \
  --query 'imageDetails[*].imageTags'
```

Fix: rebuild via commit pipeline, or push tag manually.

### Pod stuck in `CrashLoopBackOff`

Usually missing Secret. Check:

```bash
kubectl -n sit describe pod <pod-name>
```

Look for `Warning FailedMount` — tells you which secret is missing.

### NLB never becomes healthy

Health check on ALB is `/health` path. If your api-gateway isn't responding on that path, health check fails. Check:

```bash
kubectl -n sit logs deployment/api-gateway
```

### ArgoCD app fails to sync — "namespace not allowed"

ArgoCD Project restrictions may block deploying to `sit`. Check:

```bash
kubectl -n argocd get appproject default -o yaml
```

Ensure `sit` is in the `destinations` list (or `namespaces: - '*'`).

---

## What's next (Session 7)

After Session 6 works end-to-end:

- **Sub-phase 12f** — Jenkins commit-back to manifest repo from commit pipeline. Closes the CI→CD loop. (~1 hour)
- **Phase 8** — Prometheus + Grafana on SIT namespace. (~2 sessions)
- **Phase 13** — Master documentation consolidation. (~2 sessions)

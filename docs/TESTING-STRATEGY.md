# Testing Strategy — VjCloudBank

**Owner (DevOps SPOC):** Vijesh
**Scope:** SIT environment for the VjCloudBank microservices
**Last updated:** September 2026

---

## Executive summary

VjCloudBank's testing strategy follows the standard BFSI testing pyramid across three layers:

1. **Unit tests** — developer-owned, run in the commit pipeline
2. **SIT (System Integration Testing) smoke** — QA-owned, run after every SIT deployment
3. **Regression** — QA-owned, run nightly against SIT

As DevOps SPOC for the SIT environment, I own:
- The Jenkins pipelines that execute tests
- The test infrastructure (Postman runner, coverage tools, Sonar integration)
- The SIT environment stability
- Coordination between development and QA

I don't write the tests (that's dev + QA), but I ensure they run reliably, fail fast, and provide clear signal.

---

## Environment map

| Environment | Namespace | Purpose | Who deploys | Test cadence |
|---|---|---|---|---|
| DEV | (developer laptops) | Local development | Developer | On demand |
| SIT | `sit` | Component + integration testing | Me (via `Jenkinsfile.sit-deploy`) | Multiple times/day |
| UAT | `uat` (future) | Business user acceptance | Release mgr | Weekly |
| PROD | `prod` (future) | Live customer traffic | Release mgr with change board | Sprint end |

**Current portfolio scope: SIT only.** The pattern generalizes to more environments.

---

## Testing layers

### Layer 1 — Unit tests (commit pipeline)

**Who owns:** Developer
**When runs:** Every commit to any branch
**Where:** Commit pipeline in Jenkins (each service's `Jenkinsfile`)
**Duration:** ~3-5 minutes total per service

**Tools per language:**

| Service | Framework | Coverage tool |
|---|---|---|
| user-service (Node.js) | Jest | lcov |
| account-service (Python) | pytest | coverage.xml (Cobertura) |
| transaction-service (Java) | JUnit 5 + Mockito + AssertJ | JaCoCo |
| notification-service (Node.js) | Jest | lcov |
| api-gateway (Node.js) | Jest | lcov |

**What they cover:**
- Controllers/routes — request validation, response shape
- Business logic — happy path + error cases (insufficient funds, unauthorized, etc.)
- Utility classes — password hashing, JWT signing, validation helpers

**What they don't cover:**
- Database interactions (mocked)
- Cross-service HTTP calls (mocked)
- Real ArgoCD/Kubernetes state (mocked)

**Coverage feed to SonarQube:**
- Each Jenkinsfile has a `SonarQube Analysis` stage
- Coverage report (lcov, coverage.xml, or jacoco.xml) fed to Sonar
- Quality Gate enforces coverage threshold — build fails if below

**As DevOps SPOC:**
- Own the Jest/pytest/Maven pipeline stages
- Own the Sonar Quality Gate configuration
- Coordinate with dev leads when a Quality Gate needs adjustment

---

### Layer 2 — SIT smoke tests (deploy pipeline)

**Who owns:** QA team writes tests. I own the pipeline that runs them.
**When runs:** After every deployment to SIT (`Jenkinsfile.sit-deploy`)
**Where:** SIT deployment pipeline, `Smoke tests` stage
**Duration:** ~30-60 seconds

**Tool:** Postman collections executed via Newman CLI

**Scope:**
- Health checks for all services (api-gateway, user, account, transaction)
- Full user journey: register → login → create account → deposit → view history
- Cross-service integration (login gives JWT that other services accept)

**Assertions:**
- HTTP status codes
- Response shape validation
- Data flow correctness (deposit updates balance correctly)
- Security assertions (password hash never exposed)

**Location in repo:**
```
tests/postman/
├── vjcloudbank-sit-smoke.postman_collection.json   ← Collection
└── environments/
    └── sit.postman_environment.json                ← baseUrl per env
```

**As DevOps SPOC:**
- Own the Newman container in the pipeline
- Own the JUnit XML publishing to Jenkins
- Own environment file management (base URLs, credentials)
- Escalate to QA lead when smoke tests start failing consistently

---

### Layer 3 — SIT regression (future, out of current portfolio scope)

**Who owns:** QA team
**When runs:** Nightly at 2 AM against SIT (planned)
**Duration:** 30-60 minutes (large collection)

**Not implemented in this portfolio scope.** Interview narrative: "Regression is on the roadmap. QA team owns the suite content. I've done the infrastructure work — Newman container, Jenkins cron trigger — but haven't wired up the full collection yet since QA hasn't defined it."

---

## SIT deployment pipeline in detail

### Trigger

Manual, via Jenkins "Build with Parameters" page. Release coordinator selects:
- Which services to deploy (blank tag = skip)
- Whether to run smoke tests after deployment

### Stages

1. **Show parameters** — sanity check what's about to happen
2. **Update manifest tags** — GitOps pattern
   - Clone manifest repo
   - Use `yq` to update `image.tag` in each service's `values.yaml`
   - Commit + push to `main`
3. **Wait for ArgoCD sync**
   - Trigger ArgoCD refresh (rather than wait 3 min for polling)
   - Wait for each SIT app to reach Healthy + Synced
4. **Get SIT endpoint** — capture the api-gateway NLB hostname
5. **Wait for NLB to serve traffic** — poll `/health` until 200
6. **Smoke tests** — Newman runs collection, results published to Jenkins

### Failure handling

- **Manifest update fails** — Git conflict, credential issue. Pipeline stops.
- **ArgoCD sync times out** — usually image pull failure (missing tag in ECR). Fix: push image, re-run.
- **NLB health check fails** — pod scheduling issue, or app crash on startup. Investigate pod logs.
- **Smoke tests fail** — assert failure or actual bug. QA team escalated, developer fixes.

---

## Ownership model — who does what

| Activity | DevOps SPOC (me) | Dev | QA |
|---|---|---|---|
| Write unit tests | | ✓ | |
| Fix unit test failures | | ✓ | |
| Configure Sonar Quality Gate | ✓ | | |
| Write Postman smoke tests | | | ✓ |
| Fix smoke test failures (test issue) | | | ✓ |
| Fix smoke test failures (app bug) | | ✓ | |
| Own SIT deployment pipeline | ✓ | | |
| Own Jenkins agent images | ✓ | | |
| Deploy to SIT | ✓ | | |
| Certify SIT deployment | | | ✓ |
| Own regression schedule | ✓ | | |
| Write regression suite | | | ✓ |

**Escalation flow:**
- Test failure in unit tests → dev lead
- Test failure in SIT smoke → QA lead (they triage: bug vs test issue)
- Environment down → me (DevOps SPOC)
- Infrastructure change needed → me + release manager

---

## Real-world nuances I've hit as DevOps SPOC

Interview answers should include these — they signal genuine ownership.

### Test data pollution

**Problem:** Smoke tests use random emails but same test password. Old test users accumulate in the users DB, eventually exhausting UUID pool for account_number.

**Solution:** Nightly cleanup job (Kubernetes CronJob) purges test users created > 24 hours ago.

**Status:** Documented, not yet implemented. Would build next.

### NLB warmup delay

**Problem:** After ArgoCD deploys api-gateway, NLB status shows "Active" immediately but takes 2-3 minutes to actually route traffic. Naive smoke tests fail with connection timeout.

**Solution:** Explicit "Wait for NLB to serve traffic" stage in the pipeline. Polls `/health` until 200 or 5 min timeout.

**Status:** Implemented.

### ArgoCD auto-sync polling delay

**Problem:** ArgoCD polls Git every 3 minutes by default. If we just commit and wait, smoke tests may run against the OLD image.

**Solution:** Use ArgoCD CLI to trigger an explicit refresh + wait for sync completion.

**Status:** Implemented.

### JWT_SECRET drift between services

**Problem:** user-service signs JWT with `JWT_SECRET`. If account-service has a different `JWT_SECRET`, its middleware rejects the token → smoke tests fail with 401.

**Solution:** ExternalSecrets Operator (planned) will source all `JWT_SECRET` values from a single Secrets Manager entry, guaranteeing consistency.

**Status:** Manual today. ESO implementation is on the roadmap.

---

## Interview positioning cheat sheet

### "What's your test coverage strategy?"

"Unit tests in the commit pipeline for every service — Jest for Node.js, pytest for Python, JUnit 5 for Java. Coverage feeds SonarQube's Quality Gate. Post-deployment we run Postman smoke tests via Newman as part of the SIT deploy pipeline. Regression is nightly against SIT — QA owns the suite, I own the infrastructure."

### "Walk me through your SIT deployment"

"Release coordinator triggers the pipeline with image tags for services they want deployed. Pipeline updates values files in the manifest repo — pure GitOps. ArgoCD detects the change, syncs to SIT namespace. Pipeline waits for Healthy+Synced. Then discovers the api-gateway NLB, waits for NLB warmup, runs smoke tests. Results published to Jenkins as JUnit XML."

### "How do you handle test data in SIT?"

"Each smoke test run generates a unique test user email using timestamp + random suffix. Password is fixed per run. Nightly cleanup job purges test users older than 24 hours. If a smoke test fails mid-way through, the test user doesn't get cleaned up in that run — nightly catches it."

### "What's your biggest testing gap?"

"Contract tests between services — we don't have Pact yet. And integration test coverage of the notification-service is low. Both on the roadmap. The unit test suite covers our critical paths but doesn't guarantee cross-service compatibility."

### "How do you coordinate with QA?"

"Slack channel for immediate issues. Shared Confluence page tracks smoke test failures and their resolution owner. When QA needs a specific image tag deployed for testing, they file a ticket + tag me — I trigger the SIT deploy pipeline with their requested tags."

---

## Roadmap

Not yet implemented but planned:

- [ ] External Secrets Operator (JWT_SECRET consistency)
- [ ] Contract tests (Pact) for top 3 service boundaries
- [ ] Nightly regression pipeline with cron trigger
- [ ] Test data cleanup CronJob
- [ ] Prometheus + Grafana dashboards for SIT health
- [ ] Test result trending (build over build) via Sonar
- [ ] Multi-environment (SIT1, SIT2 with dedicated ArgoCD apps)
- [ ] Performance smoke via k6 (post-deploy)

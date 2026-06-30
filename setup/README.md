# VjCloudBank — Setup Automation

Scripts that automate the manual rebuild process from Phases 1-7a so you can focus on learning new things instead of re-doing setup.

---

## What this does

Recreates everything Phases 1-7a build, in 35-45 minutes hands-off:

- ✅ Pushes existing Docker images from your laptop to ECR
- ✅ Creates 2 RDS PostgreSQL instances with AWS-managed passwords
- ✅ Creates an EKS cluster via eksctl (with addons, IRSA, EBS CSI via Pod Identity)
- ✅ Installs AWS Load Balancer Controller with proper IRSA
- ✅ Tags default VPC subnets for ALB discovery
- ✅ Creates all Kubernetes Secrets via YAML+base64 (no shell escaping bugs)
- ✅ Deploys all 6 microservices, scaled to 1 replica
- ✅ Verifies end-to-end: pod health + API health + registration flow

**What it does NOT do:** Phase 7b and beyond. Those are still manual so you keep learning.

---

## One-time setup

### 1. Verify prerequisites are installed

You need: `aws`, `kubectl`, `helm`, `eksctl`, `docker`, `jq`.

Quick check:
```bash
aws --version && kubectl version --client && helm version --short && \
eksctl version && docker --version && jq --version
```

### 2. Configure AWS CLI (if not done)

```bash
aws configure
# Default region: ap-south-1
```

### 3. Create your `.env.secrets` file

```bash
cd /d/real-projects/vjcloudbank/vjcloudbank-repo/setup
cp .env.secrets.template .env.secrets
# Now edit .env.secrets and paste your JWT_SECRET
```

### 4. Add `.env.secrets` to `.gitignore`

```bash
cd /d/real-projects/vjcloudbank/vjcloudbank-repo
echo "setup/.env.secrets" >> .gitignore
git add .gitignore && git commit -m "ignore .env.secrets"
```

### 5. Place this `setup/` folder in your repo

Your repo should look like:
```
vjcloudbank-repo/
├── api-gateway/
├── user-service/
├── ... (other services)
├── k8s-manifests/
└── setup/                  ← THIS FOLDER
    ├── config.sh
    ├── .env.secrets        ← LOCAL only, gitignored
    ├── 00-prerequisites.sh
    ├── 01-ecr-push.sh
    ├── 02-rds.sh
    ├── 03-eks-cluster.sh
    ├── 04-oidc-lbc.sh
    ├── 05-subnet-tags.sh
    ├── 06-app-secrets.sh
    ├── 07-app-deploy.sh
    ├── 08-verify.sh
    ├── 99-teardown.sh
    ├── setup-all.sh
    └── README.md (this file)
```

### 6. Make scripts executable

```bash
chmod +x *.sh
```

---

## Daily usage

### Morning — spin everything up

```bash
cd /d/real-projects/vjcloudbank/vjcloudbank-repo/setup
./setup-all.sh
```

That's it. Walk away, come back in ~40 min, your platform is live.

The script:
- Verifies tools and creds (`00`)
- Pushes existing Docker images to ECR (`01`)
- Creates both RDS instances in parallel (`02`)
- Creates EKS cluster with all addons (`03`)
- Sets up IRSA + LBC via Helm (`04`)
- Tags subnets for ALB discovery (`05`)
- Creates K8s Secrets via YAML+base64 (`06`)
- Deploys 6 microservices, scales to 1 replica (`07`)
- Runs end-to-end health checks (`08`)

### Evening — tear it down

```bash
./99-teardown.sh
```

Asks for confirmation, then deletes:
- The 2 NLBs (frontend + api-gateway)
- The EKS cluster
- Both RDS instances
- Orphaned OIDC providers

Keeps (saves rebuild time):
- ECR repos and images
- IAM policy + role (LBC)
- IAM role (EBS CSI)
- Default VPC subnet tags

---

## Running individual scripts

If something fails mid-flight, you can re-run from any step. All scripts are idempotent.

```bash
./00-prerequisites.sh   # always safe to re-run
./01-ecr-push.sh        # safe — skips existing repos, re-pushes images
./02-rds.sh             # safe — skips existing RDS, waits for available
./03-eks-cluster.sh     # safe — exits early if cluster exists and ACTIVE
./04-oidc-lbc.sh        # safe — updates trust policy with current OIDC
./05-subnet-tags.sh     # safe — re-tags same value
./06-app-secrets.sh     # safe — kubectl apply is idempotent
./07-app-deploy.sh      # safe — kubectl apply + scale
./08-verify.sh          # read-only health check
```

---

## Troubleshooting

### "Image not found in local Docker"
You need the 6 images built locally with names like `vjcloudbank/api-gateway:latest`.

To rebuild from source:
```bash
cd /d/real-projects/vjcloudbank/vjcloudbank-repo
for svc in api-gateway user-service account-service transaction-service notification-service frontend; do
  docker build -t vjcloudbank/$svc:latest ./$svc/
done
```

### "AWS account mismatch"
Edit `config.sh` and update `AWS_ACCOUNT_ID` to your actual account.

### "EKS cluster creation failed"
Read the eksctl error. Common causes:
- Region quota for VPCs/EIPs/etc.
- Old CloudFormation stack stuck — delete via console
- IAM permission issue

### "Pods stuck in Pending"
Means scheduling failed — usually node capacity. Re-run `07-app-deploy.sh` (it scales to 1 replica) or scale to 1 manually:
```bash
kubectl scale deployment account-service api-gateway frontend \
  user-service transaction-service --replicas=1 -n vjcloudbank
```

### "Registration fails with timeout"
The NLB takes ~2 min to actually start serving traffic even after status shows Active. The verify script handles this. If running manually, wait 2-3 minutes and try again.

---

## Cost expectations

When everything is running:
- EKS control plane: $0.10/hr (~$72/mo)
- 2× t3.medium nodes: ~$0.084/hr (~$60/mo)
- 2× RDS db.t3.micro: free tier first 12 months
- 2× NLB: ~$0.05/hr (~$36/mo)
- **Hourly: ~$0.23 while running**
- Monthly if left running 24/7: ~$170

If you run it 8 hours/day, 5 days/week: ~$40/mo.

---

## What to do AFTER `./setup-all.sh` succeeds

You're at the start of Phase 7b. From here, proceed manually:

1. Convert api-gateway from `LoadBalancer` to `ClusterIP` Service
2. Create the first `Ingress` resource for `/api/*`
3. Watch the LBC provision an ALB

The scripts get you to the launchpad. Phase 7b onwards is where you learn new things.

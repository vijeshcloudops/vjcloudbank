# VjCloudBank — Terraform Infrastructure

Complete IaC for the VjCloudBank portfolio project. ~114 resources across 8 modules.

## Prerequisites

- **Terraform** >= 1.5.0
- **AWS CLI** configured with credentials for `vjcloudbank-admin` IAM user
- **kubectl** (for verification and post-apply operations)
- **helm** (used internally by Terraform Helm provider)

## Directory Structure
infra/terraform/
├── envs/
│ └── dev/
│ ├── main.tf # Module composition
│ ├── variables.tf # Root-level variables
│ ├── outputs.tf # Root-level outputs
│ ├── providers.tf # AWS + Kubernetes + Helm providers
│ ├── versions.tf # Terraform + provider version constraints
│ ├── terraform.tfvars # Actual values (gitignored)
│ └── terraform.tfvars.example # Template
│
└── modules/
├── vpc/ # VPC + subnets + IGW + NAT + route tables
├── iam/ # EKS/Jenkins/Sonar roles (non-IRSA)
├── security/ # All security groups (defense in depth)
├── eks/ # EKS cluster + node group + OIDC + EBS CSI IRSA + addons
├── irsa/ # IRSA roles (kaniko + LBC)
├── rds/ # 3 PostgreSQL instances + Secrets Manager
├── ecr/ # 6 microservice repos + lifecycle policies
├── efs/ # Jenkins persistent state
├── cicd/ # Jenkins + Sonar Launch Templates + ASGs + ALB
└── k8s-addons/ # LBC via Helm + jenkins-agents namespace + RBAC

## State Backend

- **S3 bucket:** `vjcloudbank-terraform-state-135808958462`
  - Versioning enabled (recovery from accidental deletion)
  - SSE-S3 encryption at rest
  - All public access blocked
- **DynamoDB table:** `vjcloudbank-terraform-state-lock`
  - Pay-per-request billing
  - Prevents concurrent apply conflicts

Bootstrap resources are NOT Terraform-managed (chicken-and-egg avoided).

## First-Time Setup

### 1. Bootstrap state backend (one-time)

```bash
export TF_STATE_BUCKET=vjcloudbank-terraform-state-135808958462

aws s3 mb s3://${TF_STATE_BUCKET} --region ap-south-1
aws s3api put-bucket-versioning --bucket ${TF_STATE_BUCKET} \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket ${TF_STATE_BUCKET} \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block --bucket ${TF_STATE_BUCKET} \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws dynamodb create-table --region ap-south-1 \
  --table-name vjcloudbank-terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 2. Configure variables

```bash
cd infra/terraform/envs/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set admin_ip_cidr and any addon versions
```

### 3. Initialize + apply

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

**Time:** ~20-25 minutes (RDS and EKS are slowest).

## Bring-Up After Teardown

```bash
cd infra/terraform/envs/dev
terraform apply -auto-approve
```

Idempotent — apply as many times as needed.

## Teardown

```bash
cd infra/terraform/envs/dev
terraform destroy -auto-approve
```

**Time:** ~15-20 minutes.

**Preserved (not destroyed):**
- S3 state bucket
- DynamoDB state lock table
- EC2 key pair (`vjcloudbank-cicd-key`)

## What's Terraformed

| Component | Module | Resources |
|---|---|---|
| VPC + networking | `vpc` | 17 |
| IAM roles (non-IRSA) | `iam` | 18 |
| Security groups | `security` | ~20 |
| EKS cluster + addons | `eks` | 12 |
| IRSA (kaniko + LBC) | `irsa` | 4 |
| RDS + secrets | `rds` | 13 |
| ECR | `ecr` | 12 |
| EFS | `efs` | 2 |
| CI/CD tier | `cicd` | 10 |
| K8s-side (LBC + RBAC) | `k8s-addons` | 6 |
| **Total** | | **~114** |

## What's NOT Terraformed

- **Application deployments** — managed by ArgoCD (see `manifests/`)
- **CloudFront + WAF** — future work
- **Jenkins jobs config** — Jenkins JCasC could Terraformize this, currently manual
- **SonarQube projects** — manual creation via UI

## Post-Apply Manual Steps

After `terraform apply`, these still require manual action:

1. **Scale up Jenkins ASG:**
```bash
   aws autoscaling update-auto-scaling-group --region ap-south-1 \
     --auto-scaling-group-name vjcloudbank-jenkins-asg \
     --desired-capacity 1 --min-size 1
```

2. **Scale up Sonar ASG:**
```bash
   aws autoscaling update-auto-scaling-group --region ap-south-1 \
     --auto-scaling-group-name vjcloudbank-sonar-asg \
     --desired-capacity 1 --min-size 1
```

3. **Get kubeconfig:**
```bash
   aws eks update-kubeconfig --region ap-south-1 --name vjcloudbank-eks
```

## Common Operations

### Add a new microservice ECR repo

Edit `modules/ecr/variables.tf` — append to the `services` list default:

```hcl
default = [
  "user-service",
  "account-service",
  # ... existing services
  "new-service"     # add here
]
```

Then:
```bash
terraform apply
```

### Change EKS node type

Edit `variables.tf`:
```hcl
variable "node_instance_type" {
  default = "t3.large"  # was t3.medium
}
```

Then:
```bash
terraform apply
```

EKS handles the rolling replacement (drain old nodes, launch new, keep pods running).

### Regenerate RDS password

```bash
terraform taint 'module.rds.random_password.users_db'
terraform apply
```

New random password generated, Secrets Manager updated, apps get new value on next pod restart.

### Rebuild EKS after cluster loss

```bash
terraform destroy -target=module.eks -auto-approve
terraform apply -auto-approve
```

**IRSA trust policies automatically regenerated with new OIDC issuer URL** — no manual patching required (the fix for the OIDC drift gotcha from pre-Terraform era).

## Cost Estimates

**Full stack running 24/7:** ~$3-5/day
- EKS control plane: $0.10/hour
- 2 × t3.medium nodes: $0.083/hour
- 3 × db.t3.micro RDS: $0.056/hour
- NAT Gateway: $0.048/hour
- ALB (CI/CD): $0.025/hour
- EFS: negligible for portfolio-scale
- Storage (RDS + EBS): ~$0.20/day

**Session-only (destroy at end):** ~$0.50-2/session

**Cost-saving pattern:** teardown between sessions. `terraform destroy` at end, `terraform apply` next session — takes ~20 min to bring up.

## Troubleshooting

### `Error: NoSuchEntity: OpenIDConnect provider not found`

Cluster was destroyed but IRSA module wasn't cleaned up. Run:
```bash
terraform destroy -target=module.irsa -auto-approve
terraform apply -auto-approve
```

### `Error: creating Secrets Manager Secret: secret with this name is already scheduled for deletion`

Secret from prior state exists in "scheduled deletion" limbo. Force-delete:
```bash
aws secretsmanager delete-secret --region ap-south-1 \
  --secret-id vjcloudbank/sonar/db-credentials \
  --force-delete-without-recovery
```

Then retry apply.

### `Error: Cannot find version X.Y for postgres`

RDS engine version isn't available. Query current:
```bash
aws rds describe-db-engine-versions --region ap-south-1 \
  --engine postgres \
  --query 'DBEngineVersions[?starts_with(EngineVersion, `16.`)].EngineVersion'
```

Update `db_engine_version` in tfvars.

### `Addon version specified is not supported`

EKS addon version isn't valid for the cluster's K8s version. Query current:
```bash
aws eks describe-addon-versions --region ap-south-1 \
  --kubernetes-version 1.34 --addon-name <addon-name>
```

Update the version in tfvars.

## Interview Talking Points

- **State management:** Remote S3 with DynamoDB locking, versioning enabled, encryption at rest, all public access blocked
- **Module structure:** Root + modules pattern, one module per concern, ~114 resources
- **IRSA:** Dedicated module reads OIDC from EKS output — trust policies regenerate automatically on rebuild
- **RDS credentials:** Terraform-generated random passwords stored in Secrets Manager, zero credentials in Git
- **Security groups:** Chained SG referencing (SG-to-SG, not IP), defense in depth
- **K8s-side:** helm_release + kubernetes_* resources — single `terraform apply` provisions AWS AND K8s workloads
- **Idempotent:** `terraform apply` is safe to re-run at any point; produces identical results
- **Documentation-driven:** Every gotcha we hit is now encoded in the module logic

## Session History

- **Session 1** — VPC + IAM (non-IRSA) — 35 resources
- **Session 2** — Security + EKS + IRSA + RDS + ECR — +61 resources
- **Session 3** — EFS + CI/CD tier — +12 resources
- **Session 4** — K8s-side (LBC + jenkins-agents) — +6 resources

**Total: ~114 resources under Terraform.**

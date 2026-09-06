# ------------------------------------------------------------
# VjCloudBank — Dev environment root Terraform config
# ------------------------------------------------------------

# VPC + Networking
module "vpc" {
  source = "../../modules/vpc"

  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  cicd_subnet_cidr     = var.cicd_subnet_cidr
  availability_zones   = var.availability_zones
}

# IAM roles (added in Session 1 later)
# module "iam" { ... }

# EKS cluster (Session 2)
# module "eks" { ... }

# RDS (Session 2)
# module "rds" { ... }

# ECR (Session 2)
# module "ecr" { ... }

# Secrets Manager (Session 3)
# module "secrets" { ... }

# EFS (Session 3)
# module "efs" { ... }

# CI/CD tier (Session 3)
# module "cicd" { ... }

# IAM roles (non-IRSA)
module "iam" {
  source = "../../modules/iam"

  project_name = var.project_name
  environment  = var.environment
}

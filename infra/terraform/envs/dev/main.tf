# ------------------------------------------------------------
# VjCloudBank — Dev environment root Terraform config
# ------------------------------------------------------------

data "aws_caller_identity" "current" {}

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

module "iam" {
  source = "../../modules/iam"

  project_name = var.project_name
  environment  = var.environment
}

module "security" {
  source = "../../modules/security"

  project_name  = var.project_name
  environment   = var.environment
  vpc_id        = module.vpc.vpc_id
  admin_ip_cidr = var.admin_ip_cidr
}

module "eks" {
  source = "../../modules/eks"

  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids
  cluster_role_arn    = module.iam.eks_cluster_role_arn
  node_role_arn       = module.iam.eks_node_role_arn
  admin_principal_arn = data.aws_caller_identity.current.arn
  vpc_cni_version     = var.vpc_cni_version
  coredns_version     = var.coredns_version
  kube_proxy_version  = var.kube_proxy_version
  ebs_csi_version     = var.ebs_csi_version
}

# App RDS ingress from EKS cluster SG
resource "aws_vpc_security_group_ingress_rule" "app_db_from_eks" {
  security_group_id            = module.security.app_db_sg_id
  description                  = "PostgreSQL 5432 from EKS cluster SG"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = module.eks.cluster_security_group_id
}

# IRSA roles (kaniko + LBC) — depend on EKS OIDC
module "irsa" {
  source = "../../modules/irsa"

  project_name      = var.project_name
  environment       = var.environment
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer_url   = module.eks.oidc_issuer_url
}

# RDS — 3 PostgreSQL instances (users, accounts, sonar)
module "rds" {
  source = "../../modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  private_subnet_ids = module.vpc.private_subnet_ids
  app_db_sg_id       = module.security.app_db_sg_id
  sonar_db_sg_id     = module.security.sonar_db_sg_id
  db_engine_version  = var.db_engine_version
}

# ECR — 6 repositories with lifecycle policies
module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

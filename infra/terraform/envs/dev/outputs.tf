output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

output "cicd_subnet_id" {
  description = "ID of CI/CD subnet"
  value       = module.vpc.cicd_subnet_id
}

# IAM outputs
output "eks_cluster_role_arn" {
  description = "ARN of EKS cluster role"
  value       = module.iam.eks_cluster_role_arn
}

output "eks_node_role_arn" {
  description = "ARN of EKS node role"
  value       = module.iam.eks_node_role_arn
}

output "jenkins_role_arn" {
  description = "ARN of Jenkins EC2 role"
  value       = module.iam.jenkins_role_arn
}

output "sonar_role_arn" {
  description = "ARN of Sonar EC2 role"
  value       = module.iam.sonar_role_arn
}

# EKS outputs
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_oidc_issuer_url" {
  description = "EKS OIDC issuer URL"
  value       = module.eks.oidc_issuer_url
}

output "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  value       = module.eks.oidc_provider_arn
}

# Security outputs
output "cicd_alb_sg_id" {
  description = "CI/CD ALB security group ID"
  value       = module.security.cicd_alb_sg_id
}

output "jenkins_sg_id" {
  description = "Jenkins security group ID"
  value       = module.security.jenkins_sg_id
}

output "sonar_sg_id" {
  description = "Sonar security group ID"
  value       = module.security.sonar_sg_id
}

output "efs_sg_id" {
  description = "EFS security group ID"
  value       = module.security.efs_sg_id
}

output "sonar_db_sg_id" {
  description = "Sonar RDS security group ID"
  value       = module.security.sonar_db_sg_id
}

output "app_db_sg_id" {
  description = "Application RDS security group ID"
  value       = module.security.app_db_sg_id
}

output "admin_ip" {
  description = "Admin IP configured (for SSH access)"
  value       = var.admin_ip_cidr
}

# IRSA outputs
output "kaniko_role_arn" {
  description = "Kaniko IRSA role ARN"
  value       = module.irsa.kaniko_role_arn
}

output "lbc_role_arn" {
  description = "LBC IRSA role ARN"
  value       = module.irsa.lbc_role_arn
}

# RDS outputs
output "users_db_endpoint" {
  description = "Users DB endpoint"
  value       = module.rds.users_db_endpoint
}

output "accounts_db_endpoint" {
  description = "Accounts DB endpoint"
  value       = module.rds.accounts_db_endpoint
}

output "sonar_db_endpoint" {
  description = "Sonar DB endpoint"
  value       = module.rds.sonar_db_endpoint
}

# ECR outputs
output "ecr_repository_urls" {
  description = "ECR repository URLs by service"
  value       = module.ecr.repository_urls
}

# EFS outputs
output "efs_file_system_id" {
  description = "EFS file system ID"
  value       = module.efs.file_system_id
}

output "efs_dns_name" {
  description = "EFS DNS name for mount commands"
  value       = module.efs.dns_name
}

# CI/CD outputs
output "cicd_alb_dns_name" {
  description = "CI/CD ALB DNS name (for Jenkins UI + webhook)"
  value       = module.cicd.alb_dns_name
}

output "jenkins_url" {
  description = "Jenkins UI URL"
  value       = "http://${module.cicd.alb_dns_name}:8080"
}

output "sonarqube_url" {
  description = "SonarQube UI URL"
  value       = "http://${module.cicd.alb_dns_name}:9000"
}

output "jenkins_asg_name" {
  description = "Jenkins ASG name (scale up: aws autoscaling set-desired-capacity ...)"
  value       = module.cicd.jenkins_asg_name
}

output "sonar_asg_name" {
  description = "Sonar ASG name"
  value       = module.cicd.sonar_asg_name
}

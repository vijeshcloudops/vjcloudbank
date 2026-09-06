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

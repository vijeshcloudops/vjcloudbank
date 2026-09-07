output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded cluster CA data"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "oidc_issuer_url" {
  description = "OIDC issuer URL (no https://)"
  value       = replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")
}

output "oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA trust policies"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "node_group_name" {
  description = "Node group name"
  value       = aws_eks_node_group.main.node_group_name
}

output "cluster_security_group_id" {
  description = "EKS cluster security group (auto-created)"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "eks_cluster_role_arn" {
  description = "ARN of EKS cluster role"
  value       = aws_iam_role.eks_cluster.arn
}

output "eks_node_role_arn" {
  description = "ARN of EKS node role"
  value       = aws_iam_role.eks_node.arn
}

output "jenkins_role_arn" {
  description = "ARN of Jenkins EC2 role"
  value       = aws_iam_role.jenkins.arn
}

output "jenkins_role_name" {
  description = "Name of Jenkins EC2 role"
  value       = aws_iam_role.jenkins.name
}

output "jenkins_instance_profile_name" {
  description = "Name of Jenkins instance profile"
  value       = aws_iam_instance_profile.jenkins.name
}

output "sonar_role_arn" {
  description = "ARN of Sonar EC2 role"
  value       = aws_iam_role.sonar.arn
}

output "sonar_instance_profile_name" {
  description = "Name of Sonar instance profile"
  value       = aws_iam_instance_profile.sonar.name
}

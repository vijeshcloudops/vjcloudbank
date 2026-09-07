output "kaniko_role_arn" {
  description = "Kaniko IRSA role ARN"
  value       = aws_iam_role.kaniko.arn
}

output "kaniko_role_name" {
  description = "Kaniko IRSA role name"
  value       = aws_iam_role.kaniko.name
}

output "lbc_role_arn" {
  description = "LBC IRSA role ARN"
  value       = aws_iam_role.lbc.arn
}

output "lbc_role_name" {
  description = "LBC IRSA role name"
  value       = aws_iam_role.lbc.name
}

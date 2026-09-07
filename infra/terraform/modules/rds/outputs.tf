output "users_db_endpoint" {
  description = "Users DB endpoint"
  value       = aws_db_instance.users.address
}

output "accounts_db_endpoint" {
  description = "Accounts DB endpoint"
  value       = aws_db_instance.accounts.address
}

output "sonar_db_endpoint" {
  description = "Sonar DB endpoint"
  value       = aws_db_instance.sonar.address
}

output "users_db_secret_arn" {
  description = "Users DB Secrets Manager ARN"
  value       = aws_secretsmanager_secret.users_db.arn
}

output "accounts_db_secret_arn" {
  description = "Accounts DB Secrets Manager ARN"
  value       = aws_secretsmanager_secret.accounts_db.arn
}

output "sonar_db_secret_arn" {
  description = "Sonar DB Secrets Manager ARN"
  value       = aws_secretsmanager_secret.sonar_db.arn
}

output "db_subnet_group_name" {
  description = "DB subnet group name"
  value       = aws_db_subnet_group.main.name
}

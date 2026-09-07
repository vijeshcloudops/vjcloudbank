output "cicd_alb_sg_id" {
  description = "CI/CD ALB security group ID"
  value       = aws_security_group.cicd_alb.id
}

output "jenkins_sg_id" {
  description = "Jenkins EC2 security group ID"
  value       = aws_security_group.jenkins.id
}

output "sonar_sg_id" {
  description = "Sonar EC2 security group ID"
  value       = aws_security_group.sonar.id
}

output "efs_sg_id" {
  description = "EFS security group ID"
  value       = aws_security_group.efs.id
}

output "sonar_db_sg_id" {
  description = "Sonar RDS security group ID"
  value       = aws_security_group.sonar_db.id
}

output "app_db_sg_id" {
  description = "Application RDS security group ID"
  value       = aws_security_group.app_db.id
}

output "alb_dns_name" {
  description = "CI/CD ALB DNS name"
  value       = aws_lb.cicd.dns_name
}

output "alb_arn" {
  description = "CI/CD ALB ARN"
  value       = aws_lb.cicd.arn
}

output "jenkins_target_group_arn" {
  description = "Jenkins target group ARN"
  value       = aws_lb_target_group.jenkins.arn
}

output "sonar_target_group_arn" {
  description = "Sonar target group ARN"
  value       = aws_lb_target_group.sonar.arn
}

output "jenkins_asg_name" {
  description = "Jenkins ASG name"
  value       = aws_autoscaling_group.jenkins.name
}

output "sonar_asg_name" {
  description = "Sonar ASG name"
  value       = aws_autoscaling_group.sonar.name
}

output "jenkins_launch_template_id" {
  description = "Jenkins launch template ID"
  value       = aws_launch_template.jenkins.id
}

output "sonar_launch_template_id" {
  description = "Sonar launch template ID"
  value       = aws_launch_template.sonar.id
}

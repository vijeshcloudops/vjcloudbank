output "file_system_id" {
  description = "EFS file system ID"
  value       = aws_efs_file_system.jenkins.id
}

output "dns_name" {
  description = "EFS DNS name for mounting"
  value       = "${aws_efs_file_system.jenkins.id}.efs.${data.aws_region.current.name}.amazonaws.com"
}

output "mount_target_id" {
  description = "EFS mount target ID"
  value       = aws_efs_mount_target.jenkins.id
}

data "aws_region" "current" {}

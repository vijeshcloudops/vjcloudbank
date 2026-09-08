# ------------------------------------------------------------
# EFS FILE SYSTEM — for Jenkins JENKINS_HOME persistence
# ------------------------------------------------------------
resource "aws_efs_file_system" "jenkins" {
  creation_token = "${var.project_name}-jenkins-efs"
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"
  encrypted        = true

  # Portfolio: no lifecycle policy (small file count, no need for IA transition)

  tags = {
    Name = "${var.project_name}-jenkins-efs"
  }
}

# ------------------------------------------------------------
# MOUNT TARGET — CI/CD subnet (single-AZ per project decision)
# ------------------------------------------------------------
resource "aws_efs_mount_target" "jenkins" {
  file_system_id  = aws_efs_file_system.jenkins.id
  subnet_id       = var.cicd_subnet_id
  security_groups = [var.efs_sg_id]
}

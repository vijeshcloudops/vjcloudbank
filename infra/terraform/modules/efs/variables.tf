variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cicd_subnet_id" {
  description = "CI/CD subnet ID for mount target (single-AZ per project decision)"
  type        = string
}

variable "efs_sg_id" {
  description = "Security group ID for EFS mount targets"
  type        = string
}

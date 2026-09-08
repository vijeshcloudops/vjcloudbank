variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB (2 AZs)"
  type        = list(string)
}

variable "cicd_subnet_id" {
  description = "CI/CD subnet ID for Jenkins/Sonar EC2 instances"
  type        = string
}

variable "cicd_alb_sg_id" {
  description = "Security group ID for CI/CD ALB"
  type        = string
}

variable "jenkins_sg_id" {
  description = "Security group ID for Jenkins EC2"
  type        = string
}

variable "sonar_sg_id" {
  description = "Security group ID for Sonar EC2"
  type        = string
}

variable "jenkins_instance_profile_name" {
  description = "IAM instance profile name for Jenkins"
  type        = string
}

variable "sonar_instance_profile_name" {
  description = "IAM instance profile name for Sonar"
  type        = string
}

variable "efs_file_system_id" {
  description = "EFS file system ID for Jenkins state"
  type        = string
}

variable "efs_dns_name" {
  description = "EFS DNS name for mount command"
  type        = string
}

variable "sonar_db_endpoint" {
  description = "Sonar RDS endpoint"
  type        = string
}

variable "sonar_db_secret_arn" {
  description = "Sonar DB Secrets Manager ARN"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for Jenkins and Sonar"
  type        = string
  default     = "t3.medium"
}

variable "key_pair_name" {
  description = "Existing EC2 key pair name for SSH"
  type        = string
  default     = "vjcloudbank-cicd-key"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 20
}

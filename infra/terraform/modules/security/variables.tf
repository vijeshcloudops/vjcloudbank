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

variable "admin_ip_cidr" {
  description = "Admin IP CIDR for SSH access (your public IP + /32)"
  type        = string
}

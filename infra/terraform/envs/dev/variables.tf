variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (dev/staging/prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used as resource prefix"
  type        = string
  default     = "vjcloudbank"
}

# VPC
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (EKS workers)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "cicd_subnet_cidr" {
  description = "CIDR block for CI/CD subnet (single-AZ per project decision)"
  type        = string
  default     = "10.0.10.0/24"
}

variable "availability_zones" {
  description = "AZs to use"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "admin_ip_cidr" {
  description = "Admin IP CIDR for SSH access to Jenkins/Sonar (your public IP with /32)"
  type        = string
  # No default — must be set in terraform.tfvars
}

variable "vpc_cni_version" {
  description = "VPC CNI addon version"
  type        = string
}

variable "coredns_version" {
  description = "CoreDNS addon version"
  type        = string
}

variable "kube_proxy_version" {
  description = "kube-proxy addon version"
  type        = string
}

variable "ebs_csi_version" {
  description = "AWS EBS CSI Driver addon version"
  type        = string
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
}

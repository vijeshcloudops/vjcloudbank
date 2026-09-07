variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.34"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for node group"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for cluster ENIs"
  type        = list(string)
}

variable "cluster_role_arn" {
  description = "ARN of EKS cluster IAM role"
  type        = string
}

variable "node_role_arn" {
  description = "ARN of EKS node IAM role"
  type        = string
}

variable "node_instance_type" {
  description = "EC2 instance type for nodes"
  type        = string
  default     = "t3.medium"
}

variable "node_desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 4
}

variable "node_disk_size" {
  description = "Node root disk size in GB"
  type        = number
  default     = 20
}

variable "admin_principal_arn" {
  description = "IAM ARN for admin cluster access (Access Entry)"
  type        = string
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

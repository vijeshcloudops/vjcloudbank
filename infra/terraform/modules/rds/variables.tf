variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for RDS subnet group (needs 2+ AZs even for single-AZ RDS)"
  type        = list(string)
}

variable "app_db_sg_id" {
  description = "Security group ID for application RDS instances (users, accounts)"
  type        = string
}

variable "sonar_db_sg_id" {
  description = "Security group ID for Sonar RDS"
  type        = string
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.4"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_backup_retention_days" {
  description = "Backup retention days"
  type        = number
  default     = 7
}

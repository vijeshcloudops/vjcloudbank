variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "services" {
  description = "List of microservice names (used as ECR repo names)"
  type        = list(string)
  default = [
    "user-service",
    "account-service",
    "transaction-service",
    "notification-service",
    "api-gateway",
    "frontend"
  ]
}

variable "max_image_count" {
  description = "Maximum number of images to keep per repo"
  type        = number
  default     = 10
}

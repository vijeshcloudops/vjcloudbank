provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "vjcloudbank"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "vjcloudops"
    }
  }
}

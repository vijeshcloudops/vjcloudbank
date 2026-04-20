# VjCloudBank — Cloud Native Banking Platform

A production-grade microservices banking application deployed on AWS EKS.
Built as a senior AWS DevOps Engineer portfolio project.

## Architecture

- **User Service** — Node.js + PostgreSQL (Authentication, JWT)
- **Account Service** — Python FastAPI + PostgreSQL (Account management)
- **Transaction Service** — Java Spring Boot + PostgreSQL (Deposits, withdrawals, transfers)
- **Notification Service** — Node.js + AWS SES/SNS (Email and SMS alerts)
- **API Gateway** — Node.js + Express (Single entry point, rate limiting)
- **Frontend** — React + Vite + Nginx (Banking dashboard)

## AWS Stack

EKS, ECR, RDS PostgreSQL, Secrets Manager, CloudWatch, Prometheus, Grafana, S3, CloudFront, CodePipeline, CodeBuild, Terraform

## Infrastructure

- VPC with public/private subnets across 2 AZs
- EKS cluster with managed node groups
- RDS PostgreSQL with AWS managed passwords
- All secrets in AWS Secrets Manager
- CloudWatch Container Insights + Prometheus + Grafana monitoring

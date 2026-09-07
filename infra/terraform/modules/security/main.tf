# ------------------------------------------------------------
# CI/CD ALB SG — fronts Jenkins + Sonar via HTTP
# ------------------------------------------------------------
resource "aws_security_group" "cicd_alb" {
  name        = "${var.project_name}-cicd-alb-sg"
  description = "ALB fronting Jenkins and Sonar"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.project_name}-cicd-alb-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "cicd_alb_http" {
  security_group_id = aws_security_group.cicd_alb.id
  description       = "HTTP from internet"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "cicd_alb_jenkins" {
  security_group_id = aws_security_group.cicd_alb.id
  description       = "Jenkins UI + webhook from internet (port 80 blocked by many ISPs)"
  ip_protocol       = "tcp"
  from_port         = 8080
  to_port           = 8080
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "cicd_alb_sonar" {
  security_group_id = aws_security_group.cicd_alb.id
  description       = "SonarQube UI from internet"
  ip_protocol       = "tcp"
  from_port         = 9000
  to_port           = 9000
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "cicd_alb_egress" {
  security_group_id = aws_security_group.cicd_alb.id
  description       = "All egress to VPC"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# ------------------------------------------------------------
# JENKINS EC2 SG — accepts from ALB only + SSH from admin
# ------------------------------------------------------------
resource "aws_security_group" "jenkins" {
  name        = "${var.project_name}-jenkins-sg"
  description = "Jenkins EC2 instances"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.project_name}-jenkins-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "jenkins_from_alb" {
  security_group_id            = aws_security_group.jenkins.id
  description                  = "Jenkins port 8080 from ALB"
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
  referenced_security_group_id = aws_security_group.cicd_alb.id
}

resource "aws_vpc_security_group_ingress_rule" "jenkins_ssh" {
  security_group_id = aws_security_group.jenkins.id
  description       = "SSH from admin IP"
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
  cidr_ipv4         = var.admin_ip_cidr
}

resource "aws_vpc_security_group_egress_rule" "jenkins_egress" {
  security_group_id = aws_security_group.jenkins.id
  description       = "All egress (to EFS, RDS, ECR, EKS API, GitHub)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# ------------------------------------------------------------
# SONAR EC2 SG — accepts from ALB only + SSH from admin
# ------------------------------------------------------------
resource "aws_security_group" "sonar" {
  name        = "${var.project_name}-sonar-sg"
  description = "SonarQube EC2 instance"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.project_name}-sonar-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "sonar_from_alb" {
  security_group_id            = aws_security_group.sonar.id
  description                  = "SonarQube port 9000 from ALB"
  ip_protocol                  = "tcp"
  from_port                    = 9000
  to_port                      = 9000
  referenced_security_group_id = aws_security_group.cicd_alb.id
}

resource "aws_vpc_security_group_ingress_rule" "sonar_ssh" {
  security_group_id = aws_security_group.sonar.id
  description       = "SSH from admin IP"
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
  cidr_ipv4         = var.admin_ip_cidr
}

resource "aws_vpc_security_group_egress_rule" "sonar_egress" {
  security_group_id = aws_security_group.sonar.id
  description       = "All egress (to Sonar DB, internet for plugin downloads)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# ------------------------------------------------------------
# EFS SG — NFS from Jenkins only
# ------------------------------------------------------------
resource "aws_security_group" "efs" {
  name        = "${var.project_name}-efs-sg"
  description = "EFS mount targets for Jenkins persistence"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.project_name}-efs-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "efs_nfs" {
  security_group_id            = aws_security_group.efs.id
  description                  = "NFS port 2049 from Jenkins SG only"
  ip_protocol                  = "tcp"
  from_port                    = 2049
  to_port                      = 2049
  referenced_security_group_id = aws_security_group.jenkins.id
}

resource "aws_vpc_security_group_egress_rule" "efs_egress" {
  security_group_id = aws_security_group.efs.id
  description       = "All egress (rarely needed but AWS default)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# ------------------------------------------------------------
# SONAR RDS SG — PostgreSQL 5432 from Sonar SG only
# ------------------------------------------------------------
resource "aws_security_group" "sonar_db" {
  name        = "${var.project_name}-sonar-db-sg"
  description = "SonarQube PostgreSQL RDS"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.project_name}-sonar-db-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "sonar_db_postgres" {
  security_group_id            = aws_security_group.sonar_db.id
  description                  = "PostgreSQL 5432 from Sonar EC2 only"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.sonar.id
}

resource "aws_vpc_security_group_egress_rule" "sonar_db_egress" {
  security_group_id = aws_security_group.sonar_db.id
  description       = "All egress (AWS default)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# ------------------------------------------------------------
# APP RDS SG — PostgreSQL 5432 from EKS pods
# EKS cluster SG will be added as source via aws_vpc_security_group_ingress_rule
# in the EKS module (or root main.tf after EKS exists)
# ------------------------------------------------------------
resource "aws_security_group" "app_db" {
  name        = "${var.project_name}-app-db-sg"
  description = "Application RDS (users + accounts) accessed by EKS pods"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.project_name}-app-db-sg"
  }
}

# Note: ingress rule for EKS cluster SG is added separately in EKS module
# (chicken-and-egg — EKS cluster SG is auto-created by EKS)

resource "aws_vpc_security_group_egress_rule" "app_db_egress" {
  security_group_id = aws_security_group.app_db.id
  description       = "All egress (AWS default)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

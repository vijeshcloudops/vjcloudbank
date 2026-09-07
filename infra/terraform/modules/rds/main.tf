# ------------------------------------------------------------
# DB SUBNET GROUP — used by all RDS instances
# Must include 2+ AZs even if instance is single-AZ
# ------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# ------------------------------------------------------------
# RANDOM PASSWORDS (stored in Secrets Manager)
# ------------------------------------------------------------
resource "random_password" "users_db" {
  length  = 32
  special = true
  # Exclude RDS-invalid chars: /, @, ", space
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "accounts_db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "sonar_db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# ------------------------------------------------------------
# USERS RDS — for user-service
# ------------------------------------------------------------
resource "aws_db_instance" "users" {
  identifier             = "${var.project_name}-users-db"
  engine                 = "postgres"
  engine_version         = var.db_engine_version
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name                = "vjcloudbank_users"
  username               = "vjcloud_admin"
  password               = random_password.users_db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.app_db_sg_id]

  multi_az               = false
  publicly_accessible    = false
  backup_retention_period = var.db_backup_retention_days
  skip_final_snapshot    = true

  # Portfolio: allow easier cleanup
  deletion_protection = false
  apply_immediately   = true

  tags = {
    Name    = "${var.project_name}-users-db"
    Purpose = "user-service"
  }
}

# ------------------------------------------------------------
# ACCOUNTS RDS — for account-service AND transaction-service
# ------------------------------------------------------------
resource "aws_db_instance" "accounts" {
  identifier             = "${var.project_name}-accounts-db"
  engine                 = "postgres"
  engine_version         = var.db_engine_version
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name                = "vjcloudbank_accounts"
  username               = "vjcloud_admin"
  password               = random_password.accounts_db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.app_db_sg_id]

  multi_az               = false
  publicly_accessible    = false
  backup_retention_period = var.db_backup_retention_days
  skip_final_snapshot    = true

  deletion_protection = false
  apply_immediately   = true

  tags = {
    Name    = "${var.project_name}-accounts-db"
    Purpose = "account-service+transaction-service"
  }
}

# ------------------------------------------------------------
# SONAR RDS — for SonarQube
# ------------------------------------------------------------
resource "aws_db_instance" "sonar" {
  identifier             = "${var.project_name}-sonar-db"
  engine                 = "postgres"
  engine_version         = var.db_engine_version
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name                = "sonar"
  username               = "sonar_admin"
  password               = random_password.sonar_db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.sonar_db_sg_id]

  multi_az               = false
  publicly_accessible    = false
  backup_retention_period = var.db_backup_retention_days
  skip_final_snapshot    = true

  deletion_protection = false
  apply_immediately   = true

  tags = {
    Name    = "${var.project_name}-sonar-db"
    Purpose = "sonarqube"
  }
}

# ------------------------------------------------------------
# SECRETS MANAGER — store DB credentials
# ------------------------------------------------------------
resource "aws_secretsmanager_secret" "users_db" {
  name                    = "${var.project_name}/users-db-credentials"
  description             = "PostgreSQL credentials for users DB"
  recovery_window_in_days = 0  # Portfolio: allow immediate re-creation

  tags = {
    Name = "${var.project_name}-users-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "users_db" {
  secret_id = aws_secretsmanager_secret.users_db.id
  secret_string = jsonencode({
    DB_HOST     = aws_db_instance.users.address
    DB_PORT     = tostring(aws_db_instance.users.port)
    DB_NAME     = aws_db_instance.users.db_name
    DB_USER     = aws_db_instance.users.username
    DB_PASSWORD = random_password.users_db.result
  })
}

resource "aws_secretsmanager_secret" "accounts_db" {
  name                    = "${var.project_name}/accounts-db-credentials"
  description             = "PostgreSQL credentials for accounts DB"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.project_name}-accounts-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "accounts_db" {
  secret_id = aws_secretsmanager_secret.accounts_db.id
  secret_string = jsonencode({
    DB_HOST     = aws_db_instance.accounts.address
    DB_PORT     = tostring(aws_db_instance.accounts.port)
    DB_NAME     = aws_db_instance.accounts.db_name
    DB_USER     = aws_db_instance.accounts.username
    DB_PASSWORD = random_password.accounts_db.result
  })
}

resource "aws_secretsmanager_secret" "sonar_db" {
  name                    = "${var.project_name}/sonar/db-credentials"
  description             = "PostgreSQL credentials for SonarQube DB"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.project_name}-sonar-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "sonar_db" {
  secret_id = aws_secretsmanager_secret.sonar_db.id
  secret_string = jsonencode({
    host     = aws_db_instance.sonar.address
    port     = tostring(aws_db_instance.sonar.port)
    dbname   = aws_db_instance.sonar.db_name
    username = aws_db_instance.sonar.username
    password = random_password.sonar_db.result
  })
}

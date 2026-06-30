#!/usr/bin/env bash
# 02-rds.sh — Create both RDS PostgreSQL instances with AWS-managed master passwords
# Idempotent: re-running just skips already-existing instances
# Starts both in parallel and waits for them to become available

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config.sh"

log_step "2. RDS — Create both PostgreSQL instances"

# Helper to check if instance exists (and isn't being deleted)
db_exists() {
  local id=$1
  local status=$(aws rds describe-db-instances \
    --db-instance-identifier "$id" \
    --region "$AWS_REGION" \
    --query "DBInstances[0].DBInstanceStatus" \
    --output text 2>/dev/null || echo "MISSING")
  if [ "$status" = "MISSING" ] || [ "$status" = "deleting" ]; then
    return 1
  fi
  return 0
}

# Helper to wait for instance to be available
wait_for_db() {
  local id=$1
  log_info "Waiting for $id to become available..."
  aws rds wait db-instance-available \
    --db-instance-identifier "$id" \
    --region "$AWS_REGION" &
  local wait_pid=$!

  # Show a spinner while waiting
  local spinner='|/-\'
  local i=0
  while kill -0 $wait_pid 2>/dev/null; do
    i=$(( (i+1) % 4 ))
    printf "\r${spinner:$i:1} Waiting for $id... "
    sleep 2
  done
  wait $wait_pid
  echo ""
  log_success "$id is available"
}

# Get default VPC's RDS security group (or create one if needed)
# For lab simplicity, we'll use the default VPC's default security group
# and add ingress for port 5432 from anywhere within the VPC
VPC_ID=$(aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text)

DEFAULT_SG=$(aws ec2 describe-security-groups \
  --region "$AWS_REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" \
  --query "SecurityGroups[0].GroupId" --output text)

log_info "Default VPC: $VPC_ID, Default SG: $DEFAULT_SG"

# # Auto-detect the latest stable PostgreSQL version (avoids hardcoding stale versions)
# log_info "Detecting latest PostgreSQL 16.x version available in $AWS_REGION..."
# DB_ENGINE_VERSION=$(aws rds describe-db-engine-versions \
#   --engine postgres \
#   --region "$AWS_REGION" \
#   --query "DBEngineVersions[?starts_with(EngineVersion, '16.')] | [-1].EngineVersion" \
#   --output text)

# if [ -z "$DB_ENGINE_VERSION" ] || [ "$DB_ENGINE_VERSION" = "None" ]; then
#   log_warn "No 16.x version found, falling back to latest 15.x"
#   DB_ENGINE_VERSION=$(aws rds describe-db-engine-versions \
#     --engine postgres \
#     --region "$AWS_REGION" \
#     --query "DBEngineVersions[?starts_with(EngineVersion, '15.')] | [-1].EngineVersion" \
#     --output text)
# fi

# log_success "Using PostgreSQL version: $DB_ENGINE_VERSION"

# Ensure port 5432 is open within the default SG (self-reference)
if ! aws ec2 describe-security-groups \
  --group-ids "$DEFAULT_SG" --region "$AWS_REGION" \
  --query "SecurityGroups[0].IpPermissions[?ToPort==\`5432\`]" --output text | grep -q "5432"; then
  log_info "Adding port 5432 ingress to default SG (self-reference)..."
  aws ec2 authorize-security-group-ingress \
    --group-id "$DEFAULT_SG" \
    --protocol tcp --port 5432 \
    --source-group "$DEFAULT_SG" \
    --region "$AWS_REGION" > /dev/null 2>&1 || log_warn "Rule may already exist"
fi

# Create RDS instance helper
create_db() {
  local id=$1
  local db_name=$2

  if db_exists "$id"; then
    log_info "RDS $id already exists, skipping create"
    return 0
  fi

  log_info "Creating RDS instance: $id (DB: $db_name)"
  aws rds create-db-instance \
    --db-instance-identifier "$id" \
    --db-instance-class "$DB_INSTANCE_CLASS" \
    --engine postgres \
    --engine-version "$DB_ENGINE_VERSION" \
    --master-username "$DB_MASTER_USER" \
    --manage-master-user-password \
    --allocated-storage "$DB_STORAGE" \
    --db-name "$db_name" \
    --vpc-security-group-ids "$DEFAULT_SG" \
    --publicly-accessible \
    --backup-retention-period 0 \
    --no-multi-az \
    --storage-encrypted \
    --region "$AWS_REGION" \
    --output text > /dev/null
  log_success "Submitted creation request for $id"
}

# Kick off both creations
create_db "$DB_USERS_ID" "$DB_USERS_NAME"
create_db "$DB_ACCOUNTS_ID" "$DB_ACCOUNTS_NAME"

# Wait for both (they create in parallel anyway)
wait_for_db "$DB_USERS_ID"
wait_for_db "$DB_ACCOUNTS_ID"

# Display final endpoints
echo ""
log_info "Final RDS endpoints:"
aws rds describe-db-instances \
  --region "$AWS_REGION" \
  --query "DBInstances[?contains(DBInstanceIdentifier, 'vjcloudbank')].{ID:DBInstanceIdentifier,Endpoint:Endpoint.Address,Status:DBInstanceStatus}" \
  --output table

echo ""
log_success "RDS setup complete. Proceed to ./03-eks-cluster.sh"
log_info "Master passwords are auto-managed in Secrets Manager (no manual handling needed)"

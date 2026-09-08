#!/bin/bash
set -euxo pipefail

exec > >(tee /var/log/sonar-bootstrap.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "===== [1/11] System update ====="
dnf update -y

echo "===== [2/11] Install base tools ====="
dnf install -y java-17-amazon-corretto git wget unzip jq nc

echo "===== [3/11] Configure kernel params for Elasticsearch ====="
echo "vm.max_map_count=524288" > /etc/sysctl.d/99-sonarqube.conf
echo "fs.file-max=131072" >> /etc/sysctl.d/99-sonarqube.conf
sysctl -p /etc/sysctl.d/99-sonarqube.conf

cat > /etc/security/limits.d/99-sonarqube.conf <<LIMITS
sonar   -   nofile   131072
sonar   -   nproc    8192
LIMITS

echo "===== [4/11] Create sonar user ====="
useradd -r -m -U -d /opt/sonarqube -s /bin/bash sonar

echo "===== [5/11] Download SonarQube ====="
SONAR_VERSION="10.7.0.96327"
cd /opt
wget -q "https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-$${SONAR_VERSION}.zip" -O sonarqube.zip
unzip -q sonarqube.zip
rm sonarqube.zip

rm -rf /opt/sonarqube
mv "/opt/sonarqube-$${SONAR_VERSION}" /opt/sonarqube
chown -R sonar:sonar /opt/sonarqube

echo "===== [6/11] Fetch RDS credentials from Secrets Manager ====="
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --region ${aws_region} \
  --secret-id vjcloudbank/sonar/db-credentials \
  --query 'SecretString' --output text)

RDS_USERNAME=$(echo "$${SECRET_JSON}" | jq -r .username)
RDS_PASSWORD=$(echo "$${SECRET_JSON}" | jq -r .password)
RDS_ENDPOINT=$(echo "$${SECRET_JSON}" | jq -r .host)
RDS_PORT=$(echo "$${SECRET_JSON}" | jq -r .port)
RDS_DBNAME=$(echo "$${SECRET_JSON}" | jq -r .dbname)

echo "RDS endpoint: $${RDS_ENDPOINT}"
echo "RDS database: $${RDS_DBNAME}"

echo "===== [7/11] Configure SonarQube properties ====="
SONAR_PROPS="/opt/sonarqube/conf/sonar.properties"

cat >> $${SONAR_PROPS} <<PROPS

# ===== VjCloudBank RDS PostgreSQL config =====
sonar.jdbc.username=$${RDS_USERNAME}
sonar.jdbc.password=$${RDS_PASSWORD}
sonar.jdbc.url=jdbc:postgresql://$${RDS_ENDPOINT}:$${RDS_PORT}/$${RDS_DBNAME}

sonar.web.host=0.0.0.0
sonar.web.port=9000
sonar.web.context=

sonar.search.host=127.0.0.1
PROPS

chown sonar:sonar $${SONAR_PROPS}
chmod 640 $${SONAR_PROPS}

echo "===== [8/11] Wait for RDS to be reachable ====="
echo "Waiting for $${RDS_ENDPOINT}:$${RDS_PORT}..."
for i in {1..30}; do
  if nc -z -w 5 "$${RDS_ENDPOINT}" "$${RDS_PORT}" 2>/dev/null; then
    echo "RDS is reachable."
    break
  fi
  echo "  ... attempt $i/30 ..."
  sleep 10
done

echo "===== [9/11] Create systemd service ====="
cat > /etc/systemd/system/sonarqube.service <<SERVICE
[Unit]
Description=SonarQube service
After=syslog.target network.target

[Service]
Type=forking
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop
User=sonar
Group=sonar
Restart=on-failure
LimitNOFILE=131072
LimitNPROC=8192
TimeoutStartSec=180

[Install]
WantedBy=multi-user.target
SERVICE

echo "===== [10/11] Enable and start SonarQube ====="
systemctl daemon-reload
systemctl enable sonarqube
systemctl start sonarqube

echo "===== [11/11] Wait for SonarQube to be ready ====="
echo "Waiting for SonarQube on port 9000 (can take 2-3 min for first start)..."
for i in {1..30}; do
  if ss -tlnp 2>/dev/null | grep -q ':9000'; then
    echo "SonarQube is listening on 9000."
    break
  fi
  echo "  ... attempt $i/30 ..."
  sleep 10
done

echo "===== Bootstrap complete ====="
echo "SonarQube reachable at http://<ALB_DNS>:9000"
echo "Default credentials: admin / admin (change on first login)"

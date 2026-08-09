#!/bin/bash
set -euxo pipefail

# Log everything for debugging
exec > >(tee /var/log/jenkins-bootstrap.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "===== [1/10] Update system packages ====="
dnf update -y

echo "===== [2/10] Install base tools ====="
dnf install -y java-21-amazon-corretto git wget unzip jq

echo "===== [3/10] Install Docker ====="
dnf install -y docker
systemctl enable docker
systemctl start docker

echo "===== [4/10] Install kubectl ====="
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
rm -f kubectl

echo "===== [5/10] Install helm ====="
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

echo "===== [6/10] Install amazon-efs-utils ====="
dnf install -y amazon-efs-utils

echo "===== [7/10] Mount EFS at /var/lib/jenkins ====="
EFS_DNS="fs-07bc8ffd4aeed729c.efs.ap-south-1.amazonaws.com"

# Create the mount point
mkdir -p /var/lib/jenkins

# Mount EFS
mount -t efs -o tls "${EFS_DNS}:/" /var/lib/jenkins

# Make it persist across reboot by adding to /etc/fstab
echo "${EFS_DNS}:/ /var/lib/jenkins efs _netdev,tls 0 0" >> /etc/fstab

# Verify mount
df -h | grep jenkins

echo "===== [8/10] Install Jenkins LTS ====="
# Import Jenkins GPG key
wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# Install
dnf install -y jenkins

echo "===== [9/10] Set ownership on EFS-mounted JENKINS_HOME ====="
# Jenkins package creates /var/lib/jenkins owned by jenkins:jenkins
# But our mount may have overridden that — ensure correct ownership
chown -R jenkins:jenkins /var/lib/jenkins
chmod 755 /var/lib/jenkins

# Add jenkins user to docker group (so Docker pipelines work)
usermod -aG docker jenkins

echo "===== [10/10] Enable and start Jenkins ====="
systemctl daemon-reload
systemctl enable jenkins
systemctl start jenkins

# Wait for Jenkins to be ready
echo "Waiting for Jenkins to start (this can take 1-2 minutes)..."
for i in {1..30}; do
  if systemctl is-active --quiet jenkins; then
    echo "Jenkins is running."
    break
  fi
  echo "  ... attempt $i/30 ..."
  sleep 10
done

echo "===== Bootstrap complete ====="
echo "Jenkins should be reachable on port 8080."
echo "Initial admin password file: /var/lib/jenkins/secrets/initialAdminPassword"

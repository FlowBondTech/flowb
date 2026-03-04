#!/usr/bin/env bash
# IONOS VPS (216.225.205.69) Bootstrap Script
# Run as root on a fresh Ubuntu/Debian server.
#
# Usage: ssh root@216.225.205.69 'bash -s' < setup.sh

set -euo pipefail

echo "=== IONOS VPS Setup: eGator Scraper ==="

# 1. System updates
echo "[1/5] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# 2. Install Docker (if not present)
if ! command -v docker &>/dev/null; then
  echo "[2/5] Installing Docker..."
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo "  Docker installed: $(docker --version)"
else
  echo "[2/5] Docker already installed: $(docker --version)"
fi

# 3. Firewall
echo "[3/5] Configuring UFW firewall..."
apt-get install -y -qq ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 8080/tcp comment "Scraper health"
ufw --force enable
echo "  UFW enabled: ports 22, 8080"

# 4. Create deploy directory
echo "[4/5] Setting up deploy directory..."
DEPLOY_DIR="/opt/egator-scraper"
mkdir -p "$DEPLOY_DIR"
echo "  Deploy dir: $DEPLOY_DIR"

# 5. Summary
echo "[5/5] Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy project files to $DEPLOY_DIR"
echo "  2. Create $DEPLOY_DIR/.env from .env.example"
echo "  3. cd $DEPLOY_DIR && docker compose up -d --build"
echo "  4. Verify: curl http://localhost:8080/health"
echo ""
echo "=== Done ==="

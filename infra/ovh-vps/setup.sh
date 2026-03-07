#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════
# OVH VPS-2 Bootstrap — Postiz + n8n
# Run: ssh root@15.204.172.65 'bash -s' < setup.sh
# Or:  scp -r infra/ovh-vps/ root@15.204.172.65:/opt/flowb-stack && ssh root@15.204.172.65 'cd /opt/flowb-stack && bash setup.sh'
# ══════════════════════════════════════════════════════════════

HOST_IP="15.204.172.65"
STACK_DIR="/opt/flowb-stack"

echo "══ [1/6] System update + essentials ══"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git ufw htop

echo "══ [2/6] Install Docker ══"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker installed: $(docker --version)"
else
  echo "Docker already installed: $(docker --version)"
fi

echo "══ [3/6] Firewall setup ══"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Caddy redirect → HTTPS)
ufw allow 443/tcp   # HTTPS (Caddy auto-SSL)
ufw --force enable
ufw status

echo "══ [4/6] Create stack directory ══"
mkdir -p "$STACK_DIR"
cd "$STACK_DIR"

# Generate secrets if .env doesn't exist
if [ ! -f .env ]; then
  echo "Generating .env with random secrets..."
  DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  JWT_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 48)
  N8N_ENC=$(openssl rand -base64 32 | tr -d '/+=' | head -c 48)
  N8N_PASS=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)

  cat > .env <<EOF
HOST_IP=${HOST_IP}
DB_PASSWORD=${DB_PASS}
POSTIZ_JWT_SECRET=${JWT_SECRET}
N8N_ENCRYPTION_KEY=${N8N_ENC}
N8N_USER=admin
N8N_PASSWORD=${N8N_PASS}
EOF

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  SAVE THESE CREDENTIALS:"
  echo "  n8n login:  admin / ${N8N_PASS}"
  echo "  DB pass:    ${DB_PASS}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
else
  echo ".env already exists, skipping secret generation"
fi

echo "══ [5/6] Pull images ══"
docker compose pull

echo "══ [6/6] Start stack ══"
docker compose up -d

echo ""
echo "══ Stack is up! ══"
echo "  Postiz:      http://${HOST_IP}:5000"
echo "  n8n:         http://${HOST_IP}:5678"
echo "  Temporal UI: http://${HOST_IP}:8080"
echo ""
echo "  Logs:        cd ${STACK_DIR} && docker compose logs -f"
echo "  Stop:        docker compose down"
echo "  Update:      docker compose pull && docker compose up -d"

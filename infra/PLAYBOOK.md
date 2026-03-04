# FlowB Operational Playbook

## Network Overview

```
                    ┌──────────────────────────────┐
                    │       flowb.fly.dev           │
                    │   Fastify API + TG Bot        │
                    │   Grammy + FlowBCore          │
                    └──────┬──────────┬─────────────┘
                           │          │
              ┌────────────┘          └────────────┐
              ▼                                    ▼
┌───────────────────────┐          ┌───────────────────────────┐
│   Supabase (hosted)   │          │   OVH VPS (15.204.172.65) │
│   eoajujwp...supabase │  ◄──┐   │   6 vCores / 12GB RAM     │
│   PostgreSQL + Auth   │     │   │                           │
└───────────────────────┘     │   │   postiz.koh.lol  :5000   │
                              │   │   n8n.koh.lol     :5678   │
┌───────────────────────┐     │   │   signal.koh.lol  :8080   │
│   Netlify (CDN)       │     │   │   temporal.koh.lol:8080   │
│   flowb.me (web)      │     │   │   Caddy (auto-SSL) :443   │
│   fc.flowb.me (FC)    │     │   └───────────────────────────┘
│   tg.flowb.me (TG)    │     │
│   docs.flowb.me       │     │   ┌───────────────────────────┐
│   pitch.flowb.me      │     │   │  IONOS (216.225.205.69)   │
│   crews.flowb.me      │     └── │  2GB RAM / eGator Scraper │
└───────────────────────┘         │  Scrapes: EB, Meetup,     │
                                  │  Luma, RA, SXSW, Lemonade │
                                  │  Health: :8080             │
                                  └───────────────────────────┘
```

## Servers

### Fly.io — `flowb.fly.dev`
- **Purpose**: Main API server, Telegram bot, all backend routes
- **Stack**: Fastify + Grammy + FlowBCore + plugins
- **Deploy**: `flyctl deploy --app flowb`
- **Secrets**: `flyctl secrets list --app flowb` (17 secrets)
- **Logs**: `flyctl logs --app flowb`
- **SSH**: `flyctl ssh console --app flowb`
- **Routes**: `/api/v1/events`, `/api/v1/categories`, `/api/v1/flow/*`, `/api/v1/signal/webhook`

### OVH VPS — `15.204.172.65`
- **Purpose**: Automation, social media, Signal, workflow orchestration
- **Stack**: Docker Compose (Caddy + Postgres + Redis + Postiz + n8n + Signal + Temporal)
- **SSH**: `ssh root@15.204.172.65` (password in vault)
- **Stack dir**: `/opt/flowb-stack` (symlink to `/flowb-stack`)
- **Disk**: 100GB on `/dev/sdb1` mounted at root, Docker data on big disk
- **Firewall**: UFW — ports 22, 80, 443 only

#### OVH Services

| Service | URL | Internal Port | Purpose |
|---------|-----|---------------|---------|
| Postiz | https://postiz.koh.lol | 5000 | Social media scheduling |
| n8n | https://n8n.koh.lol | 5678 | Workflow automation |
| Signal API | https://signal.koh.lol | 8080 | Signal messenger bot |
| Temporal UI | https://temporal.koh.lol | 8080 | Workflow orchestration UI |

#### OVH Commands
```bash
# Connect
ssh root@15.204.172.65

# Stack management
cd /opt/flowb-stack
docker compose ps              # Status
docker compose logs -f n8n     # Logs for specific service
docker compose restart postiz  # Restart a service
docker compose pull && docker compose up -d  # Update all

# DB access
docker compose exec postgres psql -U flowb -d postiz
docker compose exec postgres psql -U flowb -d n8n
```

### IONOS — `216.225.205.69`
- **Purpose**: eGator keyless event scraper
- **Stack**: Docker (Node.js scraper container)
- **SSH**: `ssh root@216.225.205.69`
- **Deploy dir**: `/opt/egator-scraper`
- **Health**: `curl http://216.225.205.69:8080/health`
- **Firewall**: UFW — ports 22, 8080 only
- **Sources**: Eventbrite, Meetup, Luma Discover, Resident Advisor, Lemonade, SXSW (all keyless)
- **Scan interval**: Every 2 hours (configurable via `SCAN_INTERVAL_HOURS`)
- **Cities**: Configurable via `SCRAPER_CITIES` (default: austin)

#### IONOS Commands
```bash
# Connect
ssh root@216.225.205.69

# Deploy / update scraper
cd /opt/egator-scraper
docker compose up -d --build

# Check status
docker logs egator-scraper --tail=50
curl http://localhost:8080/health

# Manual scan trigger
curl -X POST http://localhost:8080/scan

# View config
docker compose exec egator-scraper env | grep SCRAPER
```

### Supabase (Hosted)
- **Project**: `eoajujwpdkfuicnoxetk`
- **Dashboard**: https://supabase.com/dashboard/project/eoajujwpdkfuicnoxetk
- **Tables**: All prefixed `flowb_`
- **Used by**: Fly.io backend, all mini apps, web app

### Netlify (CDN)
- **DNS Zone**: `6990f5f30daa0fd5f0996c82`
- **IMPORTANT**: Always use `--site <id>` flag to avoid deploying to wrong site

| Site | Site ID | Source | Deploy |
|------|---------|--------|--------|
| flowb.me | `77294928-...` | `web/` | `netlify deploy --prod --dir=web --site 7729...` |
| fc.flowb.me | `67ccf00b-...` | `miniapp/farcaster/out/` | Build then `--no-build` |
| tg.flowb.me | `e167d298-...` | `miniapp/telegram/dist/` | Standard Vite |
| docs.flowb.me | `42b1723c-...` | `docs/.vitepress/dist/` | VitePress build |
| pitch.flowb.me | `fc0ec8c2-...` | pitch page | Static |
| crews.flowb.me | `0f6b786d-...` | crews landing | Static |

## Credentials Vault

Credentials are stored encrypted using **SOPS + age**.

```bash
# View all credentials (decrypted to stdout)
sops -d infra/credentials.enc.json

# Edit credentials (opens in $EDITOR, re-encrypts on save)
sops infra/credentials.enc.json

# Extract a specific value
sops -d --extract '["ovh_vps"]["password"]' infra/credentials.enc.json

# Key location
~/.config/sops/age/keys.txt
```

**Age public key**: `age1k047mtwq6n4tgkrd8awkxrte9lwh82gshx9dume0t8cyjfqc29ns7krrve`

SOPS config: `.sops.yaml` in project root. Any file matching `*.enc.json` or `*.enc.yaml` will use age encryption.

## External Services

| Service | Purpose | Dashboard |
|---------|---------|-----------|
| Resend | Transactional email | https://resend.com/api-keys |
| Privy | Web3 auth | https://dashboard.privy.io |
| Neynar | Farcaster API | https://neynar.com |
| Luma | Event discovery | https://lu.ma |
| EAS | Mobile builds | `eas build --platform ios` |

## DNS Records Needed

All `*.koh.lol` subdomains need A records pointing to OVH VPS:

| Subdomain | Type | Value |
|-----------|------|-------|
| postiz.koh.lol | A | 15.204.172.65 |
| n8n.koh.lol | A | 15.204.172.65 |
| signal.koh.lol | A | 15.204.172.65 |
| temporal.koh.lol | A | 15.204.172.65 |

## Signal Bot Setup (Pending)

1. Get a dedicated phone number (prepaid SIM or virtual)
2. Register via Signal API:
   ```bash
   # SMS registration
   curl -X POST https://signal.koh.lol/v1/register/+1PHONENUMBER
   # Verify with code
   curl -X POST https://signal.koh.lol/v1/register/+1PHONENUMBER/verify/CODE
   ```
3. Set webhook to FlowB:
   ```bash
   curl -X POST https://signal.koh.lol/v1/webhook \
     -H 'Content-Type: application/json' \
     -d '{"url":"https://flowb.fly.dev/api/v1/signal/webhook"}'
   ```
4. Update `.env` and Fly secrets with `SIGNAL_BOT_NUMBER` and `SIGNAL_WEBHOOK_SECRET`

## Common Operations

### Deploy Backend
```bash
cd /home/koh/Documents/flowb
flyctl deploy --app flowb
```

### Deploy Web App
```bash
netlify deploy --prod --dir=web --site 77294928-e5a5-495a-96cd-ab5530c1cfd7
```

### Deploy Farcaster Mini App
```bash
cd miniapp/farcaster && npm run build
netlify deploy --prod --dir=out --no-build --site 67ccf00b-6b89-4980-930f-00e8ccc1fc39
```

### Deploy Docs
```bash
cd docs && npx vitepress build
netlify deploy --prod --dir=.vitepress/dist --site 42b1723c-91ae-4725-b350-b4c2e796c713
```

### Update OVH Stack
```bash
scp infra/ovh-vps/docker-compose.yml infra/ovh-vps/Caddyfile root@15.204.172.65:/opt/flowb-stack/
ssh root@15.204.172.65 'cd /opt/flowb-stack && docker compose pull && docker compose up -d'
```

### Deploy IONOS Scraper
```bash
# Copy project to IONOS (scraper builds from project root)
rsync -az --exclude node_modules --exclude dist --exclude .git \
  /home/koh/Documents/flowb/ root@216.225.205.69:/opt/egator-scraper/

# Create .env (first time only)
ssh root@216.225.205.69 'cp /opt/egator-scraper/infra/ionos-vps/.env.example /opt/egator-scraper/infra/ionos-vps/.env'
# Then edit .env with Supabase creds from vault: sops -d infra/credentials.enc.json

# Build and start
ssh root@216.225.205.69 'cd /opt/egator-scraper/infra/ionos-vps && docker compose up -d --build'

# Verify
curl http://216.225.205.69:8080/health
```

### Add Fly Secret
```bash
flyctl secrets set KEY=value --app flowb
```

### Rotate Credentials
```bash
# 1. Edit vault
sops infra/credentials.enc.json
# 2. Update .env locally
# 3. Update Fly secrets
flyctl secrets set NEW_KEY=value --app flowb
# 4. Update OVH .env
ssh root@15.204.172.65 'cd /opt/flowb-stack && nano .env'
# 5. Restart affected services
```

## Monitoring

### Health Checks
```bash
# Fly.io backend
curl https://flowb.fly.dev/api/v1/health

# IONOS scraper
curl http://216.225.205.69:8080/health

# Signal bot
curl https://signal.koh.lol/v1/about

# n8n
curl -u admin:PASSWORD https://n8n.koh.lol/healthz

# Postiz
curl https://postiz.koh.lol
```

### Logs
```bash
# Fly.io
flyctl logs --app flowb

# IONOS scraper
ssh root@216.225.205.69 'docker logs egator-scraper --tail=50'

# OVH (all services)
ssh root@15.204.172.65 'cd /opt/flowb-stack && docker compose logs --tail=50'

# OVH (specific service)
ssh root@15.204.172.65 'cd /opt/flowb-stack && docker compose logs -f signal-api'
```

# Infrastructure & Deployment

Deployment architecture and configuration for the DANZ platform.

## Overview

| Component | Hosting | Domain |
|-----------|---------|--------|
| **Backend API** | Fly.io | api.danz.xyz |
| **Web Frontend** | Netlify | danz.xyz |
| **Miniapp** | Netlify | miniapp.danz.xyz |
| **Database** | Supabase | - |
| **Storage** | AWS S3 | - |

## Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │           CLOUDFLARE CDN            │
                    │      (DNS + Edge Caching)           │
                    └───────────────┬─────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │   Netlify   │          │   Netlify   │          │   Fly.io    │
    │  danz.xyz   │          │  miniapp.*  │          │   api.*     │
    │  (danz-web) │          │ (danz-miniapp)         │  (backend)  │
    └─────────────┘          └─────────────┘          └──────┬──────┘
                                                             │
                              ┌───────────────────────────────┤
                              │                               │
                              ▼                               ▼
                       ┌─────────────┐                 ┌─────────────┐
                       │  Supabase   │                 │   AWS S3    │
                       │ PostgreSQL  │                 │   Storage   │
                       └─────────────┘                 └─────────────┘
```

## Backend Deployment (Fly.io)

### Configuration

```toml
# fly.toml
app = "danz-api"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "tcp"
  internal_port = 8080

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

[checks]
  [checks.health]
    port = 8080
    type = "http"
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "GET"
    path = "/health"
```

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Start
CMD ["node", "dist/server.js"]

EXPOSE 8080
```

### Deployment Commands

```bash
# Login to Fly
fly auth login

# Deploy
fly deploy

# View logs
fly logs

# SSH into machine
fly ssh console

# Scale
fly scale count 2 --region iad

# Secrets
fly secrets set SUPABASE_URL=xxx
fly secrets set SUPABASE_SERVICE_KEY=xxx
fly secrets set PRIVY_APP_ID=xxx
fly secrets set PRIVY_APP_SECRET=xxx
fly secrets set STRIPE_SECRET_KEY=xxx
fly secrets set STRIPE_WEBHOOK_SECRET=xxx
```

## Frontend Deployment (Netlify)

### Build Settings

| Setting | danz-web | danz-miniapp |
|---------|----------|--------------|
| Build command | `bun run build` | `bun run build` |
| Publish directory | `.next` | `.next` |
| Node version | 20 | 20 |

### netlify.toml

```toml
# danz-web/netlify.toml
[build]
  command = "bun run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Environment Variables

Configure in Netlify dashboard or CLI:

```bash
# danz-web
NEXT_PUBLIC_API_URL=https://api.danz.xyz/graphql
NEXT_PUBLIC_PRIVY_APP_ID=xxx

# danz-miniapp
NEXT_PUBLIC_API_URL=https://api.danz.xyz/graphql
NEXT_PUBLIC_PRIVY_APP_ID=xxx
NEXT_PUBLIC_ONCHAINKIT_API_KEY=xxx
```

### Deploy Commands

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Link site
netlify link

# Deploy preview
netlify deploy

# Deploy production
netlify deploy --prod
```

## Database (Supabase)

### Connection

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
```

### Migrations

Run migrations via Supabase SQL Editor or CLI:

```bash
# Supabase CLI
supabase migration up

# Or manually in SQL Editor
\i migrations/001_initial.sql
```

### Backups

Supabase provides automatic daily backups (Pro plan). For manual backups:

```bash
# Export data
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

## Storage (AWS S3)

### Bucket Configuration

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::danz-uploads/*"
    }
  ]
}
```

### CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST"],
    "AllowedOrigins": [
      "https://danz.xyz",
      "https://miniapp.danz.xyz",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## CI/CD

### GitHub Actions (Backend)

```yaml
# .github/workflows/deploy.yml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### GitHub Actions (Frontend)

Netlify auto-deploys on push to main. For manual control:

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - run: bun install
      - run: bun run build

      - uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: '.next'
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Git Remotes

### Multiple Remote Setup

All projects maintain dual remotes:

```bash
# Backend
git remote add origin https://github.com/cryptokoh/danz-backend-experimental
git remote add flowbond https://github.com/FlowBondTech/danz-backend

# Web
git remote add origin https://github.com/FlowBondTech/danz-web
git remote add cryptokoh https://github.com/cryptokoh/danz-web

# Miniapp
git remote add origin https://github.com/FlowBondTech/danz-miniapp
git remote add cryptokoh https://github.com/cryptokoh/danz-miniapp
```

### Push to Both

::: warning Always Push Both
```bash
git push origin main && git push flowbond main
```
:::

## Monitoring

### Health Checks

```typescript
// Backend health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  })
})
```

### Logging

```typescript
import morgan from 'morgan'

// HTTP request logging
app.use(morgan('combined'))

// Custom logger
const logger = {
  info: (msg: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', msg, ...meta }))
  },
  error: (msg: string, error?: Error) => {
    console.error(JSON.stringify({
      level: 'error',
      msg,
      error: error?.message,
      stack: error?.stack,
    }))
  },
}
```

## Environment Matrix

| Variable | Backend | Web | Miniapp |
|----------|---------|-----|---------|
| `PORT` | 8080 | - | - |
| `SUPABASE_URL` | ✅ | - | - |
| `SUPABASE_SERVICE_KEY` | ✅ | - | - |
| `PRIVY_APP_ID` | ✅ | ✅ | ✅ |
| `PRIVY_APP_SECRET` | ✅ | - | - |
| `STRIPE_SECRET_KEY` | ✅ | - | - |
| `STRIPE_WEBHOOK_SECRET` | ✅ | - | - |
| `AWS_ACCESS_KEY_ID` | ✅ | - | - |
| `AWS_SECRET_ACCESS_KEY` | ✅ | - | - |
| `S3_BUCKET_NAME` | ✅ | - | - |
| `NEXT_PUBLIC_API_URL` | - | ✅ | ✅ |
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | - | - | ✅ |

## Deployment Checklist

### Pre-Deploy
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Secrets configured

### Post-Deploy
- [ ] Health check responding
- [ ] API endpoints working
- [ ] Authentication functional
- [ ] Webhooks configured
- [ ] Monitoring active

## Rollback

### Fly.io

```bash
# List releases
fly releases

# Rollback to previous
fly deploy --image registry.fly.io/danz-api:v123
```

### Netlify

Use Netlify dashboard to deploy previous version, or:

```bash
netlify deploy --prod --dir=.next-backup
```

## Next Steps

- [Environment Variables](/deployment/environment) - Complete env reference
- [CI/CD Details](/deployment/cicd) - Advanced pipelines
- [API Reference](/api/graphql) - GraphQL documentation

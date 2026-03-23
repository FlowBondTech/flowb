# Environment Variables

Complete environment variable reference for all DANZ platform services.

## Overview

Environment variables are organized by service and visibility:
- **Secret**: Backend-only, never exposed to client
- **Public**: Prefixed with `NEXT_PUBLIC_`, exposed to browser

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENVIRONMENT VARIABLE FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │  Backend     │    │  danz-web    │    │ danz-miniapp │         │
│  │  (Fly.io)    │    │  (Netlify)   │    │  (Netlify)   │         │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘         │
│         │                   │                   │                  │
│         ▼                   ▼                   ▼                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │   Secrets    │    │    Public    │    │    Public    │         │
│  │   + Public   │    │     Only     │    │     Only     │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Backend Environment Variables

### Core Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Server port | `8080` |
| `CORS_ORIGINS` | No | Allowed CORS origins | `https://danz.xyz,https://miniapp.danz.xyz` |

### Database (Supabase)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key (full access) | `eyJhbGci...` |
| `SUPABASE_ANON_KEY` | No | Anonymous key (if needed) | `eyJhbGci...` |
| `DATABASE_URL` | No | Direct PostgreSQL connection | `postgresql://...` |

::: warning Service Key Security
The `SUPABASE_SERVICE_KEY` bypasses Row Level Security. Never expose to clients.
:::

### Authentication (Privy)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PRIVY_APP_ID` | Yes | Privy application ID | `clx1234567890` |
| `PRIVY_APP_SECRET` | Yes | Privy secret key | `privy-secret-xxx` |

### Payments (Stripe)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key | `sk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret | `whsec_xxx` |
| `STRIPE_PRICE_ID_MOVER` | No | Mover subscription price | `price_xxx` |
| `STRIPE_PRICE_ID_GROOVER` | No | Groover subscription price | `price_xxx` |
| `STRIPE_PRICE_ID_LEGEND` | No | Legend subscription price | `price_xxx` |

### Storage (AWS S3)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key | `wJalrXUtnFEMI/K7MDENG/...` |
| `AWS_REGION` | Yes | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | Yes | S3 bucket name | `danz-uploads` |
| `S3_UPLOAD_EXPIRY` | No | Presigned URL expiry (seconds) | `300` |

### Optional Services

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SENTRY_DSN` | No | Sentry error tracking | `https://xxx@sentry.io/xxx` |
| `REDIS_URL` | No | Redis connection (caching) | `redis://localhost:6379` |
| `LOGTAIL_TOKEN` | No | Better Stack logging | `xxx` |

---

## Frontend Environment Variables

### danz-web

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | GraphQL API endpoint | `https://api.danz.xyz/graphql` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy application ID | `clx1234567890` |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket URL (subscriptions) | `wss://api.danz.xyz/graphql` |
| `NEXT_PUBLIC_STRIPE_KEY` | No | Stripe publishable key | `pk_live_xxx` |

### danz-miniapp

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | GraphQL API endpoint | `https://api.danz.xyz/graphql` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy application ID | `clx1234567890` |
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | Yes | OnchainKit API key | `xxx` |
| `NEXT_PUBLIC_WAGMI_PROJECT_ID` | No | WalletConnect project ID | `xxx` |

---

## Environment Templates

### Backend (.env)

```bash
# .env - Backend Environment Variables
# Copy to .env.local and fill in values

# ===================
# Core
# ===================
NODE_ENV=development
PORT=8080
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# ===================
# Database (Supabase)
# ===================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===================
# Authentication (Privy)
# ===================
PRIVY_APP_ID=clx1234567890
PRIVY_APP_SECRET=privy-secret-xxxxxxxx

# ===================
# Payments (Stripe)
# ===================
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Subscription Price IDs
STRIPE_PRICE_ID_MOVER=price_mover_monthly
STRIPE_PRICE_ID_GROOVER=price_groover_monthly
STRIPE_PRICE_ID_LEGEND=price_legend_monthly

# ===================
# Storage (AWS S3)
# ===================
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
S3_BUCKET_NAME=danz-uploads-dev

# ===================
# Optional Services
# ===================
# SENTRY_DSN=
# REDIS_URL=
# LOGTAIL_TOKEN=
```

### danz-web (.env.local)

```bash
# .env.local - Web Frontend Environment Variables

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/graphql

# Authentication
NEXT_PUBLIC_PRIVY_APP_ID=clx1234567890

# Optional
# NEXT_PUBLIC_WS_URL=ws://localhost:8080/graphql
# NEXT_PUBLIC_STRIPE_KEY=pk_test_xxx
```

### danz-miniapp (.env.local)

```bash
# .env.local - Miniapp Environment Variables

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/graphql

# Authentication
NEXT_PUBLIC_PRIVY_APP_ID=clx1234567890

# Web3 Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=xxx
NEXT_PUBLIC_WAGMI_PROJECT_ID=xxx
```

---

## Environment-Specific Values

### Development

```bash
# Backend
NODE_ENV=development
PORT=8080
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080/graphql

# Database (use separate dev project)
SUPABASE_URL=https://dev-project.supabase.co

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_xxx
```

### Staging

```bash
# Backend
NODE_ENV=staging
PORT=8080
CORS_ORIGINS=https://staging.danz.xyz,https://staging-miniapp.danz.xyz

# Frontend
NEXT_PUBLIC_API_URL=https://staging-api.danz.xyz/graphql

# Database (separate staging project)
SUPABASE_URL=https://staging-project.supabase.co

# Stripe (test mode with staging webhooks)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_staging_xxx
```

### Production

```bash
# Backend
NODE_ENV=production
PORT=8080
CORS_ORIGINS=https://danz.xyz,https://miniapp.danz.xyz

# Frontend
NEXT_PUBLIC_API_URL=https://api.danz.xyz/graphql

# Database
SUPABASE_URL=https://prod-project.supabase.co

# Stripe (live mode)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxx
```

---

## Setting Environment Variables

### Fly.io (Backend)

```bash
# Set single secret
fly secrets set SUPABASE_URL=https://xxx.supabase.co

# Set multiple secrets
fly secrets set \
  PRIVY_APP_ID=xxx \
  PRIVY_APP_SECRET=xxx \
  STRIPE_SECRET_KEY=xxx

# List secrets (names only)
fly secrets list

# Unset secret
fly secrets unset UNUSED_VAR

# Import from file
fly secrets import < .env.production
```

### Netlify (Frontend)

```bash
# CLI method
netlify env:set NEXT_PUBLIC_API_URL https://api.danz.xyz/graphql

# List variables
netlify env:list

# Import from file
netlify env:import .env.production
```

Or configure in Netlify dashboard:
1. Site settings → Environment variables
2. Add variable with key and value
3. Select deploy contexts (production, preview, etc.)

### Local Development

```bash
# Create local env file
cp .env.example .env.local

# Edit values
nano .env.local

# Load in shell (optional)
source .env.local

# Or use direnv
echo 'dotenv .env.local' > .envrc
direnv allow
```

---

## Security Best Practices

### DO

- Use `.env.local` for local development (gitignored)
- Store production secrets in hosting platform
- Use separate API keys per environment
- Rotate secrets periodically
- Use strong, unique values for secrets

### DON'T

- Commit `.env` files with real values
- Share secrets via insecure channels
- Use production keys in development
- Log environment variables
- Expose secrets in error messages

### Secret Rotation

```typescript
// Example: Validate secrets on startup
function validateSecrets() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'PRIVY_APP_ID',
    'PRIVY_APP_SECRET',
    'STRIPE_SECRET_KEY',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}

// Call on startup
validateSecrets()
```

---

## Troubleshooting

### Variable Not Loading

```bash
# Check if variable is set
echo $NEXT_PUBLIC_API_URL

# Verify in Node
node -e "console.log(process.env.NEXT_PUBLIC_API_URL)"

# Check Next.js build
next build 2>&1 | grep NEXT_PUBLIC
```

### Wrong Environment

```bash
# Verify NODE_ENV
echo $NODE_ENV

# Check which .env file is loaded
ls -la .env*
```

### Client-Side Variable Missing

::: warning NEXT_PUBLIC_ Prefix Required
Variables without `NEXT_PUBLIC_` prefix are NOT available in browser.

```typescript
// ✅ Works in browser
process.env.NEXT_PUBLIC_API_URL

// ❌ Undefined in browser
process.env.STRIPE_SECRET_KEY
```
:::

## Next Steps

- [Infrastructure](/deployment/infrastructure) - Hosting overview
- [CI/CD](/deployment/cicd) - Deployment pipelines
- [Security](/architecture/security) - Security practices

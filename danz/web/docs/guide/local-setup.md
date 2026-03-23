# Local Setup

Detailed setup instructions for running the DANZ platform locally.

## Prerequisites

Ensure you have the following installed:

```bash
# Check Node.js (20+)
node --version

# Check Bun
bun --version

# Check pnpm
pnpm --version

# Check Git
git --version
```

## Clone Repository

```bash
cd /home/koh/Documents
# Repository already exists at /home/koh/Documents/DANZ
```

## Backend Setup

### 1. Install Dependencies

```bash
cd danz-backend-experimental
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Server
PORT=8080

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Authentication
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-secret

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Storage
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
```

### 3. Start Development Server

```bash
pnpm run dev
```

Backend runs at `http://localhost:8080/graphql`

## Web Frontend Setup

### 1. Install Dependencies

```bash
cd danz-web
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/graphql
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

### 3. Generate GraphQL Types

```bash
bun run codegen
```

### 4. Start Development Server

```bash
bun run dev
```

Web app runs at `http://localhost:3000`

## Miniapp Setup

### 1. Install Dependencies

```bash
cd danz-miniapp
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/graphql
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your-onchainkit-key
```

### 3. Generate GraphQL Types

```bash
bun run codegen
```

### 4. Start Development Server

```bash
bun run dev
```

Miniapp runs at `http://localhost:3001`

## Run All Services

Open three terminal windows:

::: code-group

```bash [Terminal 1 - Backend]
cd danz-backend-experimental
pnpm run dev
```

```bash [Terminal 2 - Web]
cd danz-web
bun run dev
```

```bash [Terminal 3 - Miniapp]
cd danz-miniapp
bun run dev
```

:::

## Verify Setup

### Backend Health Check

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GraphQL Playground

Open `http://localhost:8080/graphql` in your browser to access Apollo Studio.

### Frontend

- Web: `http://localhost:3000`
- Miniapp: `http://localhost:3001`

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `EACCES` permission error | Use `sudo` or fix npm permissions |
| Missing dependencies | Delete `node_modules` and reinstall |
| Port already in use | Kill process or use different port |
| GraphQL errors | Run `bun run codegen` after schema changes |

### Reset Everything

```bash
# Backend
cd danz-backend-experimental
rm -rf node_modules
pnpm install

# Web
cd danz-web
rm -rf node_modules .next
bun install
bun run codegen

# Miniapp
cd danz-miniapp
rm -rf node_modules .next
bun install
bun run codegen
```

## Next Steps

- [Code Conventions](/guide/conventions) - Coding standards
- [Workflows](/guide/workflows) - Development workflows
- [API Reference](/api/graphql) - GraphQL documentation

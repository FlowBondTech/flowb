# Getting Started

Welcome to the DANZ platform documentation. This guide will help you set up your development environment and understand the project structure.

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| Bun | Latest | Package manager (frontend) |
| pnpm | Latest | Package manager (backend) |
| Git | Latest | Version control |

## Project Structure

```
/home/koh/Documents/DANZ/
├── danz-backend-experimental/   # GraphQL API server
├── danz-web/                    # Marketing site + dashboard
├── danz-miniapp/                # Farcaster miniapp
├── FLOWBOND-TECH/prototypes/    # Design variations
└── docs/                        # This documentation
```

## Quick Setup

### 1. Clone the Repository

```bash
cd /home/koh/Documents/DANZ
```

### 2. Backend Setup

```bash
cd danz-backend-experimental

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start development server
pnpm run dev
```

The backend runs on `http://localhost:8080/graphql`

### 3. Web Frontend Setup

```bash
cd danz-web

# Install dependencies (ALWAYS use bun)
bun install

# Configure environment
cp .env.example .env.local
# Edit .env.local

# Start development server
bun run dev
```

The web app runs on `http://localhost:3000`

### 4. Miniapp Setup

```bash
cd danz-miniapp

# Install dependencies
bun install

# Configure environment
cp .env.example .env.local

# Start development server
bun run dev
```

The miniapp runs on `http://localhost:3001`

## Environment Variables

### Backend `.env`

```bash
# Server
PORT=8080

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Privy Authentication
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-secret

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3 Storage
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
```

### Frontend `.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/graphql
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

## Development Workflow

### 1. Start All Services

Open three terminal windows:

::: code-group

```bash [Backend]
cd danz-backend-experimental
pnpm run dev
```

```bash [Web]
cd danz-web
bun run dev
```

```bash [Miniapp]
cd danz-miniapp
bun run dev
```

:::

### 2. GraphQL Code Generation

After backend schema changes:

```bash
# In danz-web
bun run codegen

# In danz-miniapp
bun run codegen
```

### 3. Code Quality

```bash
# Lint check
bun run lint

# Format code
bun run format
```

## Next Steps

- [Project Overview](/guide/overview) - Understand the platform features
- [Tech Stack](/guide/tech-stack) - Deep dive into technologies used
- [Architecture](/architecture/overview) - System design and data flow
- [API Reference](/api/graphql) - GraphQL queries and mutations

::: tip Important
Always use `bun` for frontend projects, never `npm` or `yarn`. The backend uses `pnpm`.
:::

::: warning Git Remotes
This project uses dual remotes. Always push to both:
```bash
git push origin main && git push flowbond main
```
:::

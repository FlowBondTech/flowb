# CI/CD Pipelines

Continuous integration and deployment configuration for the DANZ platform.

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CI/CD PIPELINE FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Push to GitHub                                                     │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────┐                                                   │
│  │   Trigger   │                                                   │
│  │   Actions   │                                                   │
│  └──────┬──────┘                                                   │
│         │                                                           │
│         ├──────────────────┬──────────────────┐                    │
│         ▼                  ▼                  ▼                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │    Lint     │    │    Test     │    │    Build    │            │
│  │  (Biome)    │    │   (Jest)    │    │ (TypeScript)│            │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘            │
│         │                  │                  │                    │
│         └──────────────────┴──────────────────┘                    │
│                            │                                        │
│                            ▼                                        │
│                     ┌─────────────┐                                │
│                     │   Deploy    │                                │
│                     │ (Fly/Netlify)                                │
│                     └─────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## GitHub Actions

### Backend Pipeline

```yaml
# .github/workflows/backend.yml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run Biome
        run: pnpm run lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run TypeScript
        run: pnpm run typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: danz_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run Tests
        run: pnpm test --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/danz_test
          NODE_ENV: test

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  deploy:
    name: Deploy to Fly.io
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy
        run: flyctl deploy --remote-only
```

### Frontend Pipeline (danz-web)

```yaml
# .github/workflows/web.yml
name: Web CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile

      - name: Run Biome
        run: bun run lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile

      - name: Generate GraphQL Types
        run: bun run codegen
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}

      - name: Run TypeScript
        run: bun run typecheck

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile

      - name: Build
        run: bun run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          NEXT_PUBLIC_PRIVY_APP_ID: ${{ secrets.NEXT_PUBLIC_PRIVY_APP_ID }}

      - name: Upload Build
        uses: actions/upload-artifact@v3
        with:
          name: web-build
          path: .next
          retention-days: 7

  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v3
        with:
          name: web-build
          path: .next

      - uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: '.next'
          production-deploy: false
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "PR #${{ github.event.number }}"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}

  deploy-production:
    name: Deploy Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v3
        with:
          name: web-build
          path: .next

      - uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: '.next'
          production-deploy: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy ${{ github.sha }}"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Miniapp Pipeline

```yaml
# .github/workflows/miniapp.yml
name: Miniapp CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    name: Lint & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          NEXT_PUBLIC_PRIVY_APP_ID: ${{ secrets.NEXT_PUBLIC_PRIVY_APP_ID }}
          NEXT_PUBLIC_ONCHAINKIT_API_KEY: ${{ secrets.NEXT_PUBLIC_ONCHAINKIT_API_KEY }}

  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: lint-and-build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile
      - run: bun run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          NEXT_PUBLIC_PRIVY_APP_ID: ${{ secrets.NEXT_PUBLIC_PRIVY_APP_ID }}
          NEXT_PUBLIC_ONCHAINKIT_API_KEY: ${{ secrets.NEXT_PUBLIC_ONCHAINKIT_API_KEY }}

      - uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: '.next'
          production-deploy: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_MINIAPP_SITE_ID }}
```

---

## Database Migrations

### Migration Workflow

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  migrate:
    name: Run Migrations
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run Migrations
        run: pnpm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Verify Migration
        run: pnpm run db:status
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Scheduled Tasks

### Health Check Cron

```yaml
# .github/workflows/health-check.yml
name: Health Check

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:

jobs:
  health-check:
    name: Check Services
    runs-on: ubuntu-latest
    steps:
      - name: Check API
        run: |
          status=$(curl -s -o /dev/null -w "%{http_code}" https://api.danz.xyz/health)
          if [ "$status" != "200" ]; then
            echo "API health check failed with status $status"
            exit 1
          fi

      - name: Check Web
        run: |
          status=$(curl -s -o /dev/null -w "%{http_code}" https://danz.xyz)
          if [ "$status" != "200" ]; then
            echo "Web health check failed with status $status"
            exit 1
          fi

      - name: Check Miniapp
        run: |
          status=$(curl -s -o /dev/null -w "%{http_code}" https://miniapp.danz.xyz)
          if [ "$status" != "200" ]; then
            echo "Miniapp health check failed with status $status"
            exit 1
          fi

      - name: Notify on Failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Health check failed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Pull Request Workflow

### PR Checks

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  label:
    name: Auto Label
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v4
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}

  size-check:
    name: PR Size Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check PR Size
        run: |
          additions=$(git diff --numstat origin/main...HEAD | awk '{ added += $1 } END { print added }')
          if [ "$additions" -gt 500 ]; then
            echo "::warning::Large PR detected ($additions lines added). Consider splitting."
          fi

  conventional-commits:
    name: Commit Messages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: wagoid/commitlint-github-action@v5
        with:
          configFile: .commitlintrc.json
```

---

## Secrets Management

### Required Secrets

| Secret | Used By | Description |
|--------|---------|-------------|
| `FLY_API_TOKEN` | Backend | Fly.io deployment token |
| `NETLIFY_AUTH_TOKEN` | Frontend | Netlify auth token |
| `NETLIFY_SITE_ID` | danz-web | Netlify site ID |
| `NETLIFY_MINIAPP_SITE_ID` | danz-miniapp | Netlify site ID |
| `NEXT_PUBLIC_API_URL` | Frontend | API endpoint |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Frontend | Privy app ID |
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | Miniapp | OnchainKit key |
| `DATABASE_URL` | Migrations | PostgreSQL connection |
| `SLACK_WEBHOOK` | Notifications | Slack webhook URL |
| `CODECOV_TOKEN` | Coverage | Codecov upload token |

### Setting Secrets

```bash
# GitHub CLI
gh secret set FLY_API_TOKEN --body "xxx"

# Or via GitHub UI:
# Repository → Settings → Secrets and variables → Actions
```

---

## Branch Protection

### Main Branch Rules

```yaml
# Branch protection settings (configure in GitHub)
branch: main
rules:
  - require_pull_request_reviews: true
    required_approving_review_count: 1
  - require_status_checks: true
    required_status_checks:
      - "Lint"
      - "Type Check"
      - "Test"
      - "Build"
  - require_branches_to_be_up_to_date: true
  - enforce_admins: false
  - require_linear_history: true
  - allow_force_pushes: false
  - allow_deletions: false
```

---

## Deployment Environments

### Environment Configuration

```yaml
# Define environments in GitHub repository settings
environments:
  staging:
    url: https://staging.danz.xyz
    reviewers:
      - team: developers
    wait_timer: 0

  production:
    url: https://danz.xyz
    reviewers:
      - team: maintainers
    wait_timer: 5
    deployment_branch_policy:
      protected_branches: true
```

---

## Rollback Procedures

### Manual Rollback

```yaml
# .github/workflows/rollback.yml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      service:
        description: 'Service to rollback'
        required: true
        type: choice
        options:
          - backend
          - web
          - miniapp
      version:
        description: 'Version/Release to rollback to'
        required: true

jobs:
  rollback-backend:
    if: github.event.inputs.service == 'backend'
    runs-on: ubuntu-latest
    steps:
      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Rollback
        run: flyctl deploy --image registry.fly.io/danz-api:${{ github.event.inputs.version }}
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  rollback-web:
    if: github.event.inputs.service == 'web'
    runs-on: ubuntu-latest
    steps:
      - name: Rollback
        run: |
          netlify deploy --prod --dir=.next \
            --auth ${{ secrets.NETLIFY_AUTH_TOKEN }} \
            --site ${{ secrets.NETLIFY_SITE_ID }} \
            --alias ${{ github.event.inputs.version }}
```

---

## Notifications

### Slack Integration

```yaml
# Add to any workflow job
- name: Notify Success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: custom
    custom_payload: |
      {
        "text": "Deployment successful!",
        "attachments": [{
          "color": "good",
          "fields": [
            {"title": "Service", "value": "${{ github.workflow }}", "short": true},
            {"title": "Branch", "value": "${{ github.ref_name }}", "short": true},
            {"title": "Commit", "value": "${{ github.sha }}", "short": false}
          ]
        }]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

- name: Notify Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    text: 'Deployment failed!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Next Steps

- [Infrastructure](/deployment/infrastructure) - Hosting overview
- [Environment Variables](/deployment/environment) - Config reference
- [Security](/architecture/security) - Security practices

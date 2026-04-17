# Supabase + GitHub Deployment Setup

This repo uses Supabase CLI migrations and GitHub Actions to validate and deploy schema updates.

## What is configured

- `supabase/config.toml`: local Supabase project config.
- `supabase/migrations/*`: ordered SQL migrations.
- `.github/workflows/supabase-migrations-ci.yml`: validates migrations on PR/push.
- `.github/workflows/supabase-deploy.yml`: deploys to staging on push to `main`, and allows manual staging/production deploys.

## Required GitHub Secrets

Add these in GitHub repository settings:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_STAGING_PROJECT_REF`
- `SUPABASE_STAGING_DB_PASSWORD`
- `SUPABASE_PROD_PROJECT_REF`
- `SUPABASE_PROD_DB_PASSWORD`

Recommended environment setup:

- Create GitHub environments named `staging` and `production`.
- Add the same secrets at environment scope where possible.
- Add required reviewers for the `production` environment.

## How deploy works

1. Merge migration changes to `main`.
2. `Supabase Migrations CI` verifies migrations can replay and lint locally.
3. `Supabase Deploy` auto-deploys to staging from `main`.
4. Trigger manual deploy for production from the Actions tab:
   - Workflow: `Supabase Deploy`
   - Input `environment=production`

## Local development

```bash
supabase start
supabase db reset --local
supabase db lint --local
```

## Adding new migrations

Create new migration files in `supabase/migrations` with an ordered timestamp prefix. Keep migrations additive and avoid editing previously applied files.

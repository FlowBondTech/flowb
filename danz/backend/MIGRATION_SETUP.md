# Database Migration Setup

## Quick Start

### Step 1: Create the exec_sql Helper Function (One-time setup)

1. Go to your Supabase project: https://supabase.com/dashboard/project/eoajujwpdkfuicnoxetk
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `migrations/000_create_exec_sql_function.sql`
4. Click **Run** to execute

This creates a helper function that allows running migrations programmatically via the service role.

### Step 2: Run the Migrations

After creating the helper function, run:

```bash
npx tsx run-migrations.ts
```

This will execute all pending migrations using your Supabase service role credentials.

## Alternative: Manual Migration

If you prefer to run migrations manually without the helper function:

1. Go to Supabase SQL Editor
2. Copy and paste the contents of each migration file in order:
   - `migrations/005_create_event_managers.sql`
   - `migrations/006_create_notifications.sql`
3. Run each one individually

## Migration Files

- `000_create_exec_sql_function.sql` - Helper function for programmatic execution (one-time setup)
- `005_create_event_managers.sql` - Event managers system with role-based permissions
- `006_create_notifications.sql` - Notification system for broadcasts and updates

## Troubleshooting

### Error: "Could not find the function public.exec_sql"
- Make sure you've run the `000_create_exec_sql_function.sql` in Supabase SQL Editor first

### Error: "permission denied"
- Verify your `SUPABASE_SECRET_KEY` in `.env` is the service role key (not anon key)

### Error: "already exists"
- These errors are expected if running migrations multiple times
- The migration script handles them gracefully

# DANZ NOW Landing Page - Setup Guide

## Current Architecture

We're using **Privy** for authentication (crypto wallet support) and **Supabase** for the database.

### Why Privy + Supabase?

- **Privy**: Handles Web3 wallets + Web2 auth (email, social) in one SDK
- **Supabase**: PostgreSQL database with real-time capabilities and easy API
- This combination gives us the best of both worlds: crypto features + reliable database

## Quick Setup Steps

### 1. Database Setup (One-Time)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `database/sql/setup-database.sql`
4. Click "Run" to execute the SQL

This creates:
- `danz_users` table (main user data)
- `launch_signups` table (fallback for signups)
- Automatic referral code generation
- Row Level Security policies

### 2. Environment Variables

Make sure your `.env` file has:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Privy (already configured in code)
# App ID: cmei6qqd0007hl20cjvh0h5md
```

### 3. Test Your Setup

Run the test script to verify everything is working:

```bash
node test-database.js
```

You should see:
- ✅ Table danz_users exists
- ✅ Successfully inserted test user
- ✅ Database is properly configured

### 4. Start the Application

```bash
npm install --legacy-peer-deps
npm run dev
```

## How It Works

### User Flow

1. **User clicks "Connect Wallet"** → Privy modal opens
2. **User authenticates** (wallet, email, or social)
3. **Onboarding modal appears** → Collects name & email (required)
4. **Data saved to Supabase** → `danz_users` table
5. **User gets referral code** → Auto-generated 6-char code

### Data Storage

The `danz_users` table stores:
- Privy ID (authentication identifier)
- Name, email, phone
- Wallet address(es)
- Referral code (auto-generated)
- Launch interest location
- Beta tester status

### Fallback System

If the main table fails, the system tries:
1. `danz_users` table (primary)
2. `launch_signups` table (fallback)
3. localStorage (last resort)

This ensures we never lose a signup!

## Common Issues & Solutions

### "Failed to sign up" error
**Solution**: Run `database/sql/setup-database.sql` in Supabase SQL editor

### "Table does not exist" error
**Solution**: The database tables haven't been created. Run the SQL setup.

### "Permission denied" error
**Solution**: RLS policies may be too restrictive. The setup SQL includes open policies for development.

### Buffer/crypto errors
**Solution**: Already fixed with Vite polyfills configuration

## Testing Checklist

- [ ] Can connect wallet via Privy
- [ ] Onboarding modal appears after auth
- [ ] Name and email are required fields
- [ ] Data saves to Supabase successfully
- [ ] Referral code is generated
- [ ] User info persists in localStorage

## Next Steps

Once everything is working:

1. **Deploy Updates**: Push to your hosting platform
2. **Monitor Signups**: Check Supabase dashboard for new users
3. **Test Referrals**: Share referral codes and track signups
4. **Launch Campaign**: Start marketing with working signup flow

## Database Management

### View Signups
```sql
-- In Supabase SQL editor
SELECT * FROM danz_users ORDER BY created_at DESC;
```

### View Referral Leaderboard
```sql
SELECT name, referral_code, referral_count 
FROM danz_users 
WHERE referral_count > 0 
ORDER BY referral_count DESC;
```

### Export Data
Use Supabase dashboard to export as CSV for analysis.

## Support

If you encounter issues:
1. Run `node test-database.js` to diagnose
2. Check browser console for errors
3. Verify environment variables are set
4. Ensure SQL has been run in Supabase

The system is designed to be resilient with multiple fallbacks, so signups should always work!
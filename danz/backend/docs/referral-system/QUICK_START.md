# Referral System - Quick Start Guide

## Implementation Steps

### 1. Database Setup (15 minutes)

Run the migration in Supabase SQL Editor:

```bash
# Open Supabase Dashboard → SQL Editor
# Paste contents of: migration_001_referral_system.sql
# Execute
```

### 2. Backend GraphQL (30 minutes)

1. **Add schema file**:
```bash
src/graphql/schema/referral.schema.ts
```

2. **Add resolvers file**:
```bash
src/graphql/resolvers/referral.resolvers.ts
```

3. **Update schema index** (`src/graphql/schema/index.ts`):
```typescript
import { referralTypeDefs } from './referral.schema.js';

export const typeDefs = mergeTypeDefs([
  baseTypeDefs,
  userTypeDefs,
  eventTypeDefs,
  uploadTypeDefs,
  referralTypeDefs,  // Add this
]);
```

4. **Update resolvers index** (`src/graphql/resolvers/index.ts`):
```typescript
import { referralResolvers } from './referral.resolvers.js';

export const resolvers = mergeResolvers([
  userResolvers,
  eventResolvers,
  uploadResolvers,
  referralResolvers,  // Add this
]);
```

### 3. Mobile App Deep Linking (45 minutes)

1. **Update app.json**:
```json
{
  "expo": {
    "scheme": "danz",
    "ios": {
      "bundleIdentifier": "com.danz.app",
      "associatedDomains": ["applinks:danz.now"]
    },
    "android": {
      "package": "com.danz.app",
      "intentFilters": [{
        "action": "VIEW",
        "autoVerify": true,
        "data": [{
          "scheme": "https",
          "host": "danz.now",
          "pathPrefix": "/i"
        }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}
```

2. **Add deep link hook**:
```bash
src/hooks/useReferralDeepLink.ts
```

3. **Add referral component**:
```bash
src/components/ReferralSection.tsx
```

4. **Integrate in profile screen**:
```typescript
import { ReferralSection } from '../components/ReferralSection';

// In your ProfileScreen component:
<ReferralSection />
```

### 4. Web Landing Page (30 minutes)

Create at `https://danz.now/i/[username]`:

1. **Static HTML page** (see plan for template)
2. **Apple App Site Association** at `.well-known/apple-app-site-association`
3. **Android Asset Links** at `.well-known/assetlinks.json`

### 5. Signup Integration (15 minutes)

In your onboarding flow:

```typescript
import { useReferralDeepLink } from '../hooks/useReferralDeepLink';

const { getReferralCode, clearReferralCode } = useReferralDeepLink();

// After username is set:
const referralCode = await getReferralCode();
if (referralCode) {
  await completeReferral({ variables: { code: referralCode } });
  await clearReferralCode();
}
```

### 6. Session Completion (15 minutes)

After first session completes:

```typescript
if (isFirstSession && duration >= 300) {  // 5 minutes
  const { data } = await client.query({
    query: GET_PENDING_REFERRAL
  });
  
  if (data?.myReferrals?.[0]) {
    await markReferralCompleted({
      variables: { referralId: data.myReferrals[0].id }
    });
  }
}
```

---

## Testing Flow

### Test on iOS

1. Create test user with username "testuser1"
2. Get referral link: `https://danz.now/i/testuser1`
3. Open Safari (not Chrome)
4. Paste link, should open app
5. Sign up with new account
6. Complete first session
7. Check testuser1's profile - should show +20 points

### Test on Android

1. Same flow as iOS
2. Use Chrome browser
3. Check App Links work

---

## Monitoring

### Check Referral Stats

```sql
-- Active referrals
SELECT * FROM referral_performance 
ORDER BY total_clicks DESC LIMIT 10;

-- Fraud alerts
SELECT * FROM referral_fraud_alerts 
WHERE fraud_flag != 'OK';

-- Recent conversions
SELECT * FROM referrals 
WHERE status = 'completed' 
ORDER BY completed_at DESC LIMIT 20;
```

---

## Common Issues

### "No referral code found"
- User needs to set username first
- Check `referral_codes` table
- Run migration to backfill existing users

### Deep link doesn't work
- iOS: Check Universal Links setup
- Android: Verify intent filters
- Test with actual device, not emulator

### Points not awarded
- Check session duration >= 5 minutes
- Verify `total_sessions` = 1
- Check `referrals` table status

### Fraud detection too aggressive
- Adjust thresholds in `check_referral_fraud` function
- Review `REFERRAL_LIMITS` constants

---

## Key Files Reference

```
Backend:
├── src/graphql/schema/referral.schema.ts
├── src/graphql/resolvers/referral.resolvers.ts
└── migrations/XXX_referral_system.sql

Mobile:
├── src/hooks/useReferralDeepLink.ts
├── src/components/ReferralSection.tsx
└── app.json (deep link config)

Web:
├── .well-known/apple-app-site-association
├── .well-known/assetlinks.json
└── i/[username]/index.html
```

---

## Support

- Detailed docs: `REFERRAL_SYSTEM_PLAN.md`
- Migration: `migration_001_referral_system.sql`
- API examples: See GraphQL schema file

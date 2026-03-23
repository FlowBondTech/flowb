# DANZ Referral System - Complete Implementation Plan

## Executive Summary

This document outlines a production-ready referral system for the DANZ mobile app with:
- Referral links in format: `danz.now/i/username`
- 20 points reward per successful referral
- Profile integration with "Refer a Friend" module
- Comprehensive fraud prevention
- Deep linking support for mobile app

---

## 1. Database Schema

### 1.1 New Tables

#### `referral_codes` Table
Stores unique referral codes for each user with their username.

```sql
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,  -- Same as username for simplicity
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT referral_codes_user_id_unique UNIQUE (user_id)
);

CREATE INDEX idx_referral_codes_code ON public.referral_codes USING btree (code);
CREATE INDEX idx_referral_codes_user_id ON public.referral_codes USING btree (user_id);
```

#### `referrals` Table
Tracks all referral relationships and their status.

```sql
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,  -- User who sent the referral
  referee_id TEXT NULL,       -- User who was referred (null until signup)
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, completed, expired, fraudulent
  
  -- Tracking fields
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  signed_up_at TIMESTAMP WITH TIME ZONE NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Fraud prevention
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  device_id TEXT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) 
    REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT referrals_referee_id_fkey FOREIGN KEY (referee_id) 
    REFERENCES users(privy_id) ON DELETE SET NULL,
  CONSTRAINT referrals_referral_code_fkey FOREIGN KEY (referral_code) 
    REFERENCES referral_codes(code) ON DELETE CASCADE,
  CONSTRAINT referrals_status_check CHECK (
    status IN ('pending', 'completed', 'expired', 'fraudulent')
  ),
  -- Prevent self-referral
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id != referee_id)
);

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);
CREATE INDEX idx_referrals_referee ON public.referrals USING btree (referee_id);
CREATE INDEX idx_referrals_code ON public.referrals USING btree (referral_code);
CREATE INDEX idx_referrals_status ON public.referrals USING btree (status);
CREATE INDEX idx_referrals_clicked_at ON public.referrals USING btree (clicked_at DESC);

-- Prevent duplicate referrals for same referee
CREATE UNIQUE INDEX idx_referrals_unique_referee 
  ON public.referrals (referee_id) 
  WHERE referee_id IS NOT NULL;
```

#### `referral_rewards` Table
Tracks all rewards issued for referrals.

```sql
CREATE TABLE public.referral_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL,
  user_id TEXT NOT NULL,  -- Who received the reward
  points_awarded INTEGER NOT NULL DEFAULT 20,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referral_id_fkey FOREIGN KEY (referral_id) 
    REFERENCES referrals(id) ON DELETE CASCADE,
  CONSTRAINT referral_rewards_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES users(privy_id) ON DELETE CASCADE,
  -- Prevent duplicate rewards for same referral
  CONSTRAINT referral_rewards_unique_referral UNIQUE (referral_id, user_id)
);

CREATE INDEX idx_referral_rewards_user ON public.referral_rewards USING btree (user_id);
CREATE INDEX idx_referral_rewards_referral ON public.referral_rewards USING btree (referral_id);
```

#### `referral_click_tracking` Table
Detailed click tracking for analytics and fraud detection.

```sql
CREATE TABLE public.referral_click_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Device fingerprinting
  ip_address TEXT,
  user_agent TEXT,
  device_id TEXT,
  device_type TEXT,  -- ios, android, web
  
  -- Geolocation
  country_code TEXT,
  city TEXT,
  
  -- Conversion tracking
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE NULL,
  
  CONSTRAINT referral_click_tracking_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_click_tracking_code ON public.referral_click_tracking USING btree (referral_code);
CREATE INDEX idx_click_tracking_clicked_at ON public.referral_click_tracking USING btree (clicked_at DESC);
CREATE INDEX idx_click_tracking_ip ON public.referral_click_tracking USING btree (ip_address);
```

### 1.2 Updates to Existing Tables

Add referral-related fields to the `users` table:

```sql
ALTER TABLE public.users
  ADD COLUMN referred_by TEXT NULL,  -- Username of referrer
  ADD COLUMN referral_count INTEGER DEFAULT 0,  -- Total successful referrals
  ADD COLUMN referral_points_earned INTEGER DEFAULT 0;  -- Points from referrals

-- Add foreign key
ALTER TABLE public.users
  ADD CONSTRAINT users_referred_by_fkey 
  FOREIGN KEY (referred_by) REFERENCES users(username) ON DELETE SET NULL;

-- Create index
CREATE INDEX idx_users_referred_by ON public.users USING btree (referred_by);
```

### 1.3 Database Functions & Triggers

#### Automatic Referral Code Creation
```sql
-- Function to create referral code when username is set
CREATE OR REPLACE FUNCTION create_referral_code_on_username()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if username is being set for the first time or changed
  IF NEW.username IS NOT NULL AND (OLD.username IS NULL OR OLD.username != NEW.username) THEN
    -- Insert or update referral code
    INSERT INTO referral_codes (user_id, code)
    VALUES (NEW.privy_id, NEW.username)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      code = EXCLUDED.code,
      updated_at = CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER trigger_create_referral_code
  AFTER UPDATE OF username ON users
  FOR EACH ROW
  WHEN (NEW.username IS NOT NULL)
  EXECUTE FUNCTION create_referral_code_on_username();
```

#### Update Referrer Stats
```sql
-- Function to update referrer statistics when referral completes
CREATE OR REPLACE FUNCTION update_referrer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE users
    SET 
      referral_count = referral_count + 1,
      referral_points_earned = referral_points_earned + 20,
      xp = COALESCE(xp, 0) + 20
    WHERE privy_id = NEW.referrer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER trigger_update_referrer_stats
  AFTER UPDATE OF status ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referrer_stats();
```

#### Fraud Detection Function
```sql
-- Function to check for potential fraud patterns
CREATE OR REPLACE FUNCTION check_referral_fraud(
  p_referrer_id TEXT,
  p_ip_address TEXT,
  p_device_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_same_ip_count INTEGER;
  v_same_device_count INTEGER;
  v_recent_referrals_count INTEGER;
BEGIN
  -- Check for multiple referrals from same IP within 24 hours
  SELECT COUNT(*) INTO v_same_ip_count
  FROM referrals
  WHERE referrer_id = p_referrer_id
    AND ip_address = p_ip_address
    AND clicked_at > NOW() - INTERVAL '24 hours';
  
  IF v_same_ip_count >= 3 THEN
    RETURN TRUE;  -- Potential fraud
  END IF;
  
  -- Check for multiple referrals from same device
  SELECT COUNT(*) INTO v_same_device_count
  FROM referrals
  WHERE referrer_id = p_referrer_id
    AND device_id = p_device_id
    AND clicked_at > NOW() - INTERVAL '7 days';
  
  IF v_same_device_count >= 2 THEN
    RETURN TRUE;  -- Potential fraud
  END IF;
  
  -- Check for too many referrals in short time
  SELECT COUNT(*) INTO v_recent_referrals_count
  FROM referrals
  WHERE referrer_id = p_referrer_id
    AND clicked_at > NOW() - INTERVAL '1 hour';
  
  IF v_recent_referrals_count >= 5 THEN
    RETURN TRUE;  -- Potential fraud
  END IF;
  
  RETURN FALSE;  -- No fraud detected
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. What Constitutes a "Successful" Referral?

A referral is considered successful and rewards are granted when:

1. **Click Tracked**: Referee clicks the referral link
2. **Sign Up**: Referee completes account creation with Privy
3. **Username Set**: Referee sets their username (completes onboarding)
4. **First Session**: Referee completes at least 1 dance session (5+ minutes)
5. **Fraud Check**: Passes all fraud prevention checks

### Referral Lifecycle States:

```
pending → signed_up → completed
   ↓
expired / fraudulent
```

- **pending**: Link clicked, no signup yet (expires after 30 days)
- **signed_up**: User created account but hasn't completed onboarding
- **completed**: User completed first session, reward issued
- **expired**: No signup within 30 days
- **fraudulent**: Failed fraud checks

---

## 3. Fraud Prevention Strategy

### 3.1 Detection Mechanisms

**Device Fingerprinting**:
- Track device ID, IP address, user agent
- Flag multiple accounts from same device/IP

**Behavioral Analysis**:
- Monitor signup patterns (too many too fast)
- Track time between click and signup (instant = suspicious)
- Analyze session completion patterns

**Rate Limiting**:
- Max 5 referral clicks per hour per referrer
- Max 3 signups from same IP per day
- Max 10 pending referrals per user

**Verification Requirements**:
- Email verification required
- Minimum 1 completed session (5+ minutes)
- 24-hour waiting period before reward

### 3.2 Fraud Rules Implementation

```sql
-- View for fraud detection
CREATE OR REPLACE VIEW referral_fraud_alerts AS
SELECT 
  r.id,
  r.referrer_id,
  r.referee_id,
  r.referral_code,
  r.ip_address,
  r.device_id,
  COUNT(*) OVER (PARTITION BY r.ip_address, DATE(r.clicked_at)) as same_ip_today,
  COUNT(*) OVER (PARTITION BY r.device_id) as same_device_total,
  COUNT(*) OVER (PARTITION BY r.referrer_id, DATE(r.clicked_at)) as referrer_today,
  EXTRACT(EPOCH FROM (r.signed_up_at - r.clicked_at)) as seconds_to_signup,
  CASE
    WHEN COUNT(*) OVER (PARTITION BY r.ip_address, DATE(r.clicked_at)) >= 3 THEN 'SAME_IP_ABUSE'
    WHEN COUNT(*) OVER (PARTITION BY r.device_id) >= 2 THEN 'SAME_DEVICE_ABUSE'
    WHEN COUNT(*) OVER (PARTITION BY r.referrer_id, DATE(r.clicked_at)) >= 10 THEN 'REFERRER_SPAM'
    WHEN EXTRACT(EPOCH FROM (r.signed_up_at - r.clicked_at)) < 5 THEN 'INSTANT_SIGNUP'
    ELSE 'OK'
  END as fraud_flag
FROM referrals r
WHERE r.status != 'fraudulent';
```

### 3.3 Limits & Rules

```typescript
const REFERRAL_LIMITS = {
  MAX_PENDING_PER_USER: 10,
  MAX_CLICKS_PER_HOUR: 5,
  MAX_SIGNUPS_PER_IP_PER_DAY: 3,
  MAX_SAME_DEVICE_REFERRALS: 2,
  MIN_SECONDS_TO_SIGNUP: 5,
  REFERRAL_EXPIRY_DAYS: 30,
  REWARD_DELAY_HOURS: 24,
  MIN_SESSION_DURATION_MINUTES: 5,
};
```

---

## 4. Deep Linking Implementation

### 4.1 URL Structure

**Format**: `https://danz.now/i/[username]`

**Examples**:
- `https://danz.now/i/sarahdancer`
- `https://danz.now/i/mike_123`

### 4.2 Expo Deep Link Configuration

Update `app.json`:

```json
{
  "expo": {
    "scheme": "danz",
    "name": "DANZ",
    "slug": "danz",
    "ios": {
      "bundleIdentifier": "com.danz.app",
      "associatedDomains": [
        "applinks:danz.now",
        "applinks:www.danz.now"
      ]
    },
    "android": {
      "package": "com.danz.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "danz.now",
              "pathPrefix": "/i"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

### 4.3 iOS Universal Links Setup

Create `apple-app-site-association` file (no extension) at `https://danz.now/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.danz.app",
        "paths": ["/i/*"]
      }
    ]
  }
}
```

### 4.4 Android App Links Setup

Create `assetlinks.json` at `https://danz.now/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.danz.app",
      "sha256_cert_fingerprints": [
        "YOUR_ANDROID_APP_SHA256_FINGERPRINT"
      ]
    }
  }
]
```

### 4.5 Web Landing Page

Create redirect page at `https://danz.now/i/[username]`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join DANZ - Invited by @{{username}}</title>
  
  <!-- iOS Smart App Banner -->
  <meta name="apple-itunes-app" content="app-id=YOUR_APP_ID">
  
  <!-- Open Graph for social sharing -->
  <meta property="og:title" content="Join me on DANZ!">
  <meta property="og:description" content="@{{username}} invited you to join DANZ - Dance, Earn, Connect">
  <meta property="og:image" content="https://danz.now/og-image.jpg">
  
  <script>
    // Track click
    fetch('/api/referral/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: '{{username}}',
        userAgent: navigator.userAgent,
        referrer: document.referrer
      })
    });
    
    // Attempt deep link
    const deepLink = 'danz://i/{{username}}';
    const appStoreLink = 'https://apps.apple.com/app/danz/YOUR_APP_ID';
    const playStoreLink = 'https://play.google.com/store/apps/details?id=com.danz.app';
    
    // Try to open app
    window.location = deepLink;
    
    // Fallback to store after delay
    setTimeout(() => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        window.location = appStoreLink;
      } else if (isAndroid) {
        window.location = playStoreLink;
      } else {
        // Desktop - show QR code
        document.getElementById('mobile-only').style.display = 'block';
      }
    }, 2000);
  </script>
</head>
<body>
  <h1>@{{username}} invited you to DANZ!</h1>
  <p>Opening app...</p>
  <div id="mobile-only" style="display:none;">
    <p>Scan this QR code with your phone:</p>
    <img src="/api/qr?url={{url}}" alt="QR Code">
  </div>
</body>
</html>
```

---

## 5. GraphQL Schema

### 5.1 Type Definitions

Create `src/graphql/schema/referral.schema.ts`:

```typescript
import { gql } from 'graphql-tag';

export const referralTypeDefs = gql`
  type ReferralCode {
    id: ID!
    user_id: String!
    code: String!
    created_at: DateTime!
    is_active: Boolean!
    user: User!
  }

  type Referral {
    id: ID!
    referrer_id: String!
    referee_id: String
    referral_code: String!
    status: ReferralStatus!
    clicked_at: DateTime!
    signed_up_at: DateTime
    completed_at: DateTime
    ip_address: String
    user_agent: String
    device_id: String
    referrer: User!
    referee: User
  }

  type ReferralReward {
    id: ID!
    referral_id: String!
    user_id: String!
    points_awarded: Int!
    awarded_at: DateTime!
    referral: Referral!
  }

  type ReferralStats {
    total_referrals: Int!
    completed_referrals: Int!
    pending_referrals: Int!
    total_points_earned: Int!
    conversion_rate: Float!
    recent_referrals: [Referral!]!
  }

  type ReferralClickStats {
    total_clicks: Int!
    clicks_today: Int!
    clicks_this_week: Int!
    clicks_this_month: Int!
    conversion_rate: Float!
  }

  enum ReferralStatus {
    pending
    signed_up
    completed
    expired
    fraudulent
  }

  extend type User {
    referral_code: String
    referral_count: Int
    referral_points_earned: Int
    referred_by: String
  }

  extend type Query {
    # Get my referral code
    myReferralCode: ReferralCode
    
    # Get my referral stats
    myReferralStats: ReferralStats!
    
    # Get referrals I've made
    myReferrals(
      status: ReferralStatus
      limit: Int
      offset: Int
    ): [Referral!]!
    
    # Get referral by code (for tracking)
    getReferralByCode(code: String!): ReferralCode
    
    # Get click statistics
    getReferralClickStats(code: String!): ReferralClickStats!
  }

  extend type Mutation {
    # Track referral click (called from web landing page)
    trackReferralClick(input: TrackReferralClickInput!): Referral!
    
    # Complete referral (called when referee signs up)
    completeReferral(referralCode: String!): Referral!
    
    # Mark referral as completed (internal - after first session)
    markReferralCompleted(referralId: ID!): Referral!
    
    # Share referral (generate share URLs)
    generateShareLinks: ShareLinks!
  }

  input TrackReferralClickInput {
    referralCode: String!
    ipAddress: String
    userAgent: String
    deviceId: String
    deviceType: String
  }

  type ShareLinks {
    referral_url: String!
    sms_share: String!
    whatsapp_share: String!
    twitter_share: String!
    facebook_share: String!
  }
`;
```

### 5.2 Resolvers

Create `src/graphql/resolvers/referral.resolvers.ts`:

```typescript
import { GraphQLError } from 'graphql';
import { supabase } from '../../config/supabase.js';
import type { GraphQLContext } from '../context.js';

const requireAuth = (context: GraphQLContext) => {
  if (!context.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.userId;
};

const REFERRAL_LIMITS = {
  MAX_PENDING_PER_USER: 10,
  MAX_CLICKS_PER_HOUR: 5,
  MAX_SIGNUPS_PER_IP_PER_DAY: 3,
  REFERRAL_EXPIRY_DAYS: 30,
};

export const referralResolvers = {
  Query: {
    myReferralCode: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context);

      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError('Failed to fetch referral code', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      return data;
    },

    myReferralStats: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context);

      // Get total referrals
      const { data: referrals, error: refError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId);

      if (refError) {
        throw new GraphQLError('Failed to fetch referral stats', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      const total = referrals?.length || 0;
      const completed = referrals?.filter(r => r.status === 'completed').length || 0;
      const pending = referrals?.filter(r => r.status === 'pending').length || 0;

      // Get user stats
      const { data: user } = await supabase
        .from('users')
        .select('referral_points_earned')
        .eq('privy_id', userId)
        .single();

      // Get recent referrals
      const { data: recent } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('clicked_at', { ascending: false })
        .limit(10);

      return {
        total_referrals: total,
        completed_referrals: completed,
        pending_referrals: pending,
        total_points_earned: user?.referral_points_earned || 0,
        conversion_rate: total > 0 ? (completed / total) * 100 : 0,
        recent_referrals: recent || [],
      };
    },

    myReferrals: async (
      _: any,
      { status, limit = 20, offset = 0 }: any,
      context: GraphQLContext
    ) => {
      const userId = requireAuth(context);

      let query = supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('clicked_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw new GraphQLError('Failed to fetch referrals', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      return data || [];
    },

    getReferralByCode: async (_: any, { code }: { code: string }) => {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new GraphQLError('Failed to fetch referral code', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      return data;
    },

    getReferralClickStats: async (_: any, { code }: { code: string }) => {
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: allClicks } = await supabase
        .from('referral_click_tracking')
        .select('*')
        .eq('referral_code', code);

      const { data: todayClicks } = await supabase
        .from('referral_click_tracking')
        .select('*')
        .eq('referral_code', code)
        .gte('clicked_at', today.toISOString());

      const { data: weekClicks } = await supabase
        .from('referral_click_tracking')
        .select('*')
        .eq('referral_code', code)
        .gte('clicked_at', weekAgo.toISOString());

      const { data: monthClicks } = await supabase
        .from('referral_click_tracking')
        .select('*')
        .eq('referral_code', code)
        .gte('clicked_at', monthAgo.toISOString());

      const totalClicks = allClicks?.length || 0;
      const converted = allClicks?.filter(c => c.converted).length || 0;

      return {
        total_clicks: totalClicks,
        clicks_today: todayClicks?.length || 0,
        clicks_this_week: weekClicks?.length || 0,
        clicks_this_month: monthClicks?.length || 0,
        conversion_rate: totalClicks > 0 ? (converted / totalClicks) * 100 : 0,
      };
    },
  },

  Mutation: {
    trackReferralClick: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      const { referralCode, ipAddress, userAgent, deviceId, deviceType } = input;

      // Get referrer info
      const { data: refCode } = await supabase
        .from('referral_codes')
        .select('user_id')
        .eq('code', referralCode)
        .eq('is_active', true)
        .single();

      if (!refCode) {
        throw new GraphQLError('Invalid referral code', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Check fraud patterns
      const { data: fraudCheck } = await supabase.rpc('check_referral_fraud', {
        p_referrer_id: refCode.user_id,
        p_ip_address: ipAddress || '',
        p_device_id: deviceId || '',
      });

      if (fraudCheck) {
        throw new GraphQLError('Referral limit exceeded. Please try again later.', {
          extensions: { code: 'RATE_LIMIT_EXCEEDED' },
        });
      }

      // Track click
      await supabase.from('referral_click_tracking').insert({
        referral_code: referralCode,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_id: deviceId,
        device_type: deviceType,
      });

      // Create referral record
      const { data: referral, error } = await supabase
        .from('referrals')
        .insert({
          referrer_id: refCode.user_id,
          referral_code: referralCode,
          ip_address: ipAddress,
          user_agent: userAgent,
          device_id: deviceId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw new GraphQLError('Failed to track referral', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      return referral;
    },

    completeReferral: async (
      _: any,
      { referralCode }: { referralCode: string },
      context: GraphQLContext
    ) => {
      const userId = requireAuth(context);

      // Find pending referral with this code for this user
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('*')
        .eq('referral_code', referralCode)
        .is('referee_id', null)
        .eq('status', 'pending')
        .order('clicked_at', { ascending: false })
        .limit(1)
        .single();

      if (!existingReferral) {
        throw new GraphQLError('No pending referral found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Check self-referral
      if (existingReferral.referrer_id === userId) {
        throw new GraphQLError('Cannot refer yourself', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      // Update referral
      const { data: referral, error } = await supabase
        .from('referrals')
        .update({
          referee_id: userId,
          status: 'signed_up',
          signed_up_at: new Date().toISOString(),
        })
        .eq('id', existingReferral.id)
        .select()
        .single();

      if (error) {
        throw new GraphQLError('Failed to complete referral', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      // Update user's referred_by field
      await supabase
        .from('users')
        .update({ referred_by: referralCode })
        .eq('privy_id', userId);

      return referral;
    },

    markReferralCompleted: async (
      _: any,
      { referralId }: { referralId: string },
      context: GraphQLContext
    ) => {
      const userId = requireAuth(context);

      // Get referral
      const { data: referral } = await supabase
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .eq('referee_id', userId)
        .single();

      if (!referral) {
        throw new GraphQLError('Referral not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (referral.status === 'completed') {
        return referral; // Already completed
      }

      // Update to completed
      const { data: updatedReferral, error } = await supabase
        .from('referrals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', referralId)
        .select()
        .single();

      if (error) {
        throw new GraphQLError('Failed to complete referral', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      // Create reward record
      await supabase.from('referral_rewards').insert({
        referral_id: referralId,
        user_id: referral.referrer_id,
        points_awarded: 20,
      });

      return updatedReferral;
    },

    generateShareLinks: async (_: any, __: any, context: GraphQLContext) => {
      const userId = requireAuth(context);

      // Get user's referral code
      const { data: refCode } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .single();

      if (!refCode) {
        throw new GraphQLError('No referral code found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const referralUrl = `https://danz.now/i/${refCode.code}`;
      const message = encodeURIComponent(`Join me on DANZ! Use my link: ${referralUrl}`);

      return {
        referral_url: referralUrl,
        sms_share: `sms:?&body=${message}`,
        whatsapp_share: `https://wa.me/?text=${message}`,
        twitter_share: `https://twitter.com/intent/tweet?text=${message}`,
        facebook_share: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`,
      };
    },
  },

  ReferralCode: {
    user: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.user_id)
        .single();
      return data;
    },
  },

  Referral: {
    referrer: async (parent: any) => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.referrer_id)
        .single();
      return data;
    },
    referee: async (parent: any) => {
      if (!parent.referee_id) return null;
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', parent.referee_id)
        .single();
      return data;
    },
  },
};
```

---

## 6. Mobile App Implementation

### 6.1 Deep Link Handler

Create `src/hooks/useReferralDeepLink.ts`:

```typescript
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REFERRAL_CODE_KEY = '@danz_referral_code';

export function useReferralDeepLink() {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    // Handle initial URL (app opened from link)
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Handle URL while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url: string) => {
    // Parse URL: danz://i/username or https://danz.now/i/username
    const { path, queryParams } = Linking.parse(url);
    
    if (path?.startsWith('i/')) {
      const code = path.replace('i/', '');
      setReferralCode(code);
      
      // Store for later use during signup
      await AsyncStorage.setItem(REFERRAL_CODE_KEY, code);
    }
  };

  const getReferralCode = async (): Promise<string | null> => {
    return await AsyncStorage.getItem(REFERRAL_CODE_KEY);
  };

  const clearReferralCode = async () => {
    await AsyncStorage.removeItem(REFERRAL_CODE_KEY);
    setReferralCode(null);
  };

  return {
    referralCode,
    getReferralCode,
    clearReferralCode,
  };
}
```

### 6.2 Referral Profile Component

Create `src/components/ReferralSection.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  Clipboard,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import { gql } from 'graphql-tag';

const GET_REFERRAL_STATS = gql`
  query GetReferralStats {
    myReferralCode {
      code
    }
    myReferralStats {
      total_referrals
      completed_referrals
      pending_referrals
      total_points_earned
      conversion_rate
    }
  }
`;

const GENERATE_SHARE_LINKS = gql`
  mutation GenerateShareLinks {
    generateShareLinks {
      referral_url
      sms_share
      whatsapp_share
      twitter_share
      facebook_share
    }
  }
`;

export function ReferralSection() {
  const { data, loading, refetch } = useQuery(GET_REFERRAL_STATS);
  const [generateLinks] = useMutation(GENERATE_SHARE_LINKS);

  const referralCode = data?.myReferralCode?.code;
  const stats = data?.myReferralStats;

  const handleShare = async () => {
    if (!referralCode) return;

    try {
      const result = await generateLinks();
      const links = result.data.generateShareLinks;

      await Share.share({
        message: `Join me on DANZ - Dance, Earn, Connect! Use my referral link: ${links.referral_url}`,
        url: links.referral_url,
        title: 'Join me on DANZ!',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyLink = async () => {
    if (!referralCode) return;

    const url = `https://danz.now/i/${referralCode}`;
    await Clipboard.setStringAsync(url);
    Alert.alert('Copied!', 'Referral link copied to clipboard');
  };

  const handleSMS = async () => {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('SMS not available', 'SMS is not available on this device');
      return;
    }

    const result = await generateLinks();
    const links = result.data.generateShareLinks;

    await SMS.sendSMSAsync([], `Join me on DANZ! ${links.referral_url}`);
  };

  const handleWhatsApp = async () => {
    const result = await generateLinks();
    const links = result.data.generateShareLinks;

    await Linking.openURL(links.whatsapp_share);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!referralCode) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Set your username to get a referral link</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="gift-outline" size={32} color="#FF6B9D" />
        <Text style={styles.title}>Refer a Friend</Text>
        <Text style={styles.subtitle}>
          Earn 20 points for each friend who joins and completes their first session!
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.completed_referrals || 0}</Text>
          <Text style={styles.statLabel}>Successful</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.pending_referrals || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.total_points_earned || 0}</Text>
          <Text style={styles.statLabel}>Points Earned</Text>
        </View>
      </View>

      <View style={styles.linkContainer}>
        <Text style={styles.linkLabel}>Your Referral Link:</Text>
        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1}>
            danz.now/i/{referralCode}
          </Text>
          <TouchableOpacity onPress={handleCopyLink} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={20} color="#FF6B9D" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.shareButtons}>
        <TouchableOpacity onPress={handleShare} style={styles.primaryButton}>
          <Ionicons name="share-social-outline" size={20} color="#FFF" />
          <Text style={styles.primaryButtonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSMS} style={styles.iconButton}>
          <Ionicons name="chatbubble-outline" size={24} color="#FF6B9D" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleWhatsApp} style={styles.iconButton}>
          <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginVertical: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B9D',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  linkContainer: {
    marginBottom: 20,
  },
  linkLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  copyButton: {
    padding: 8,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B9D',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  iconButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
});
```

### 6.3 Signup Flow Integration

Update signup flow to complete referral:

```typescript
// In your signup/onboarding component
import { useMutation } from '@apollo/client';
import { gql } from 'graphql-tag';
import { useReferralDeepLink } from '../hooks/useReferralDeepLink';

const COMPLETE_REFERRAL = gql`
  mutation CompleteReferral($code: String!) {
    completeReferral(referralCode: $code) {
      id
      status
    }
  }
`;

export function OnboardingScreen() {
  const { getReferralCode, clearReferralCode } = useReferralDeepLink();
  const [completeReferral] = useMutation(COMPLETE_REFERRAL);

  const handleCompleteOnboarding = async (username: string) => {
    // ... update profile with username ...

    // Check for referral code
    const referralCode = await getReferralCode();
    if (referralCode) {
      try {
        await completeReferral({ variables: { code: referralCode } });
        await clearReferralCode();
        
        // Show success message
        Alert.alert(
          'Welcome!',
          `You were referred by @${referralCode}. Complete your first dance session to help them earn points!`
        );
      } catch (error) {
        console.error('Failed to complete referral:', error);
      }
    }

    // Continue with onboarding...
  };
}
```

### 6.4 Session Completion Integration

Mark referral as completed after first session:

```typescript
// In your session tracking logic
const MARK_REFERRAL_COMPLETED = gql`
  mutation MarkReferralCompleted($referralId: ID!) {
    markReferralCompleted(referralId: $referralId) {
      id
      status
    }
  }
`;

export async function handleSessionComplete(sessionId: string, duration: number) {
  // Check if this is user's first session
  const { data: sessions } = await client.query({
    query: gql`
      query GetUserSessions {
        me {
          total_sessions
        }
      }
    `,
  });

  if (sessions?.me?.total_sessions === 1 && duration >= 5 * 60) {
    // First session and >= 5 minutes
    // Check for pending referral
    const { data: referralData } = await client.query({
      query: gql`
        query GetPendingReferral {
          myReferrals(status: signed_up, limit: 1) {
            id
          }
        }
      `,
    });

    if (referralData?.myReferrals?.[0]) {
      await client.mutate({
        mutation: MARK_REFERRAL_COMPLETED,
        variables: { referralId: referralData.myReferrals[0].id },
      });

      // Show celebration
      Alert.alert(
        '🎉 Referral Complete!',
        'Your friend just earned 20 points for referring you. Keep dancing!'
      );
    }
  }
}
```

---

## 7. User Flows

### 7.1 Referrer Flow

1. **Access Referral Section**
   - User navigates to Profile → Refer a Friend
   - View referral stats and link

2. **Share Link**
   - Tap "Share" button
   - Choose sharing method (SMS, WhatsApp, Copy, etc.)
   - System tracks share event (optional analytics)

3. **Monitor Progress**
   - View pending referrals
   - See completed referrals
   - Track points earned

### 7.2 Referee Flow

1. **Click Referral Link**
   - Friend clicks `danz.now/i/username`
   - Web page tracks click
   - Redirects to app store or opens app

2. **Download & Install**
   - Downloads from App Store / Play Store
   - Referral code stored in AsyncStorage

3. **Sign Up**
   - Opens app, starts Privy auth
   - Completes authentication
   - System creates user account

4. **Complete Onboarding**
   - Sets username
   - Completes profile
   - System calls `completeReferral` mutation
   - Referral status → `signed_up`

5. **First Session**
   - Completes first dance session (5+ min)
   - System calls `markReferralCompleted`
   - Referrer receives 20 points
   - Referral status → `completed`

---

## 8. Notifications

### Notification Events

```typescript
// When someone clicks your link
{
  title: "New Referral Click!",
  body: "Someone just clicked your referral link",
  data: { type: 'referral_click' }
}

// When someone signs up
{
  title: "Referral Signup!",
  body: "Your friend just signed up with your link",
  data: { type: 'referral_signup' }
}

// When referral completes (points awarded)
{
  title: "🎉 +20 Points!",
  body: "Your referral just completed their first session",
  data: { type: 'referral_completed', points: 20 }
}
```

---

## 9. Analytics & Monitoring

### Key Metrics to Track

1. **Conversion Funnel**
   - Link clicks
   - App installs
   - Signups
   - First session completion
   - Overall conversion rate

2. **Fraud Metrics**
   - Flagged referrals
   - Same IP attempts
   - Same device attempts
   - Time to signup (suspicious if < 5 sec)

3. **Performance Metrics**
   - Average referrals per user
   - Top referrers
   - Referral velocity (referrals per day)
   - Points distributed

4. **User Engagement**
   - Share button clicks
   - Preferred sharing methods
   - Time of day patterns

---

## 10. Admin Dashboard

### Admin Queries

```typescript
// Get fraud alerts
const FRAUD_ALERTS = gql`
  query GetFraudAlerts {
    referralFraudAlerts {
      id
      referrer_id
      ip_address
      device_id
      fraud_flag
      same_ip_today
      same_device_total
    }
  }
`;

// Top referrers
const TOP_REFERRERS = gql`
  query GetTopReferrers($limit: Int!) {
    users(
      orderBy: { referral_count: desc }
      limit: $limit
    ) {
      username
      referral_count
      referral_points_earned
    }
  }
`;
```

---

## 11. Testing Checklist

### Unit Tests
- [ ] Referral code generation
- [ ] Fraud detection logic
- [ ] Reward calculation
- [ ] Status transitions

### Integration Tests
- [ ] Complete referral flow (click → signup → session)
- [ ] Deep link parsing
- [ ] GraphQL mutations
- [ ] Trigger functions

### E2E Tests
- [ ] Click referral link on iOS
- [ ] Click referral link on Android
- [ ] Sign up with referral code
- [ ] Complete first session
- [ ] Verify points awarded

### Fraud Prevention Tests
- [ ] Block self-referral
- [ ] Detect same IP abuse
- [ ] Detect same device abuse
- [ ] Rate limiting
- [ ] Duplicate referee prevention

---

## 12. Deployment Checklist

### Backend
- [ ] Run database migrations
- [ ] Deploy GraphQL schema updates
- [ ] Configure fraud detection thresholds
- [ ] Set up monitoring/alerts

### Frontend
- [ ] Update app.json with deep link config
- [ ] Build iOS with Universal Links
- [ ] Build Android with App Links
- [ ] Submit app updates to stores

### Web
- [ ] Deploy landing page to danz.now/i/[username]
- [ ] Configure apple-app-site-association
- [ ] Configure assetlinks.json
- [ ] Set up analytics tracking

### Infrastructure
- [ ] Configure domain DNS
- [ ] SSL certificates
- [ ] CDN for landing pages
- [ ] Monitoring & logging

---

## 13. Future Enhancements

### Phase 2 Features
- [ ] Referee bonus (10 points for joining)
- [ ] Tiered rewards (more points for power users)
- [ ] Referral contests/leaderboards
- [ ] Custom referral messages
- [ ] QR code generation

### Phase 3 Features
- [ ] Referral teams/groups
- [ ] Multi-level referrals (friend of friend)
- [ ] Brand ambassador program
- [ ] Referral analytics dashboard
- [ ] A/B testing for referral messaging

---

## 14. Support & Documentation

### User-Facing Docs
- How to share your referral link
- Referral program rules
- When points are awarded
- FAQ

### Developer Docs
- API documentation
- Database schema
- Integration guide
- Troubleshooting guide

---

## Appendix

### A. Environment Variables

```bash
# .env
DEEP_LINK_DOMAIN=danz.now
REFERRAL_POINTS_REWARD=20
REFERRAL_EXPIRY_DAYS=30
MAX_PENDING_REFERRALS=10
FRAUD_DETECTION_ENABLED=true
```

### B. Useful SQL Queries

```sql
-- Get all pending referrals older than 30 days (for cleanup)
SELECT * FROM referrals
WHERE status = 'pending'
  AND clicked_at < NOW() - INTERVAL '30 days';

-- Find potential fraud patterns
SELECT 
  ip_address,
  COUNT(*) as count,
  array_agg(DISTINCT referrer_id) as referrers
FROM referrals
WHERE clicked_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) >= 3;

-- Top performing referral codes
SELECT 
  rc.code,
  u.username,
  COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed,
  COUNT(*) as total_clicks,
  ROUND(COUNT(CASE WHEN r.status = 'completed' THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2) as conversion_rate
FROM referral_codes rc
JOIN users u ON rc.user_id = u.privy_id
LEFT JOIN referrals r ON rc.code = r.referral_code
GROUP BY rc.code, u.username
ORDER BY completed DESC
LIMIT 10;
```

### C. Mobile Share Intent Examples

```typescript
// iOS Share Sheet
import { Share } from 'react-native';

await Share.share({
  message: 'Join me on DANZ!',
  url: 'https://danz.now/i/sarahdancer',
  title: 'Join DANZ',
});

// Android Intent
const androidShare = {
  title: 'Join DANZ',
  message: `Join me on DANZ: https://danz.now/i/${code}`,
  url: `https://danz.now/i/${code}`,
};
```

---

**END OF DOCUMENT**

This implementation plan provides a complete, production-ready referral system with:
✅ Comprehensive fraud prevention
✅ Deep linking for mobile apps
✅ GraphQL API with full type safety
✅ Mobile UI components
✅ Analytics and monitoring
✅ Scalable database schema
✅ Admin tools
✅ Testing strategy

